import "server-only";
import { fromPriceOf, totalStock } from "@/lib/catalog";
import type { Category, Paginated, Product, SearchSuggestion } from "@/lib/types";
import type { CatalogQuery } from "@/lib/validators/catalog";
import { demoCategories, demoProducts } from "./demo-data";

/**
 * Catalog read API used by storefront pages.
 * Phase 2: backed by demo data. Phase 3: backed by MongoDB (same signatures).
 */

export const PAGE_SIZE = 12;

function matchesText(p: Product, q: string, categoryName: string): boolean {
  const needle = q.toLowerCase();
  return [p.name, p.shortDescription, categoryName, ...p.tags].some((s) => s.toLowerCase().includes(needle));
}

export async function listCategories(): Promise<Category[]> {
  return demoCategories;
}

export async function getCategory(slug: string): Promise<Category | null> {
  return demoCategories.find((c) => c.slug === slug) ?? null;
}

export async function queryProducts(query: CatalogQuery): Promise<Paginated<Product>> {
  const categoryNames = new Map(demoCategories.map((c) => [c.slug, c.name]));
  const minPaise = query.min !== undefined ? query.min * 100 : undefined;
  const maxPaise = query.max !== undefined ? query.max * 100 : undefined;

  const filtered = demoProducts.filter((p) => {
    if (query.category && p.categorySlug !== query.category) return false;
    if (query.q && !matchesText(p, query.q, categoryNames.get(p.categorySlug) ?? "")) return false;
    const price = fromPriceOf(p).pricePaise;
    if (minPaise !== undefined && price < minPaise) return false;
    if (maxPaise !== undefined && price > maxPaise) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "price-asc":
        return fromPriceOf(a).pricePaise - fromPriceOf(b).pricePaise;
      case "price-desc":
        return fromPriceOf(b).pricePaise - fromPriceOf(a).pricePaise;
      case "popular":
        return b.soldCount - a.soldCount;
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return { items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total, page, pages, pageSize: PAGE_SIZE };
}

export async function getProduct(slug: string): Promise<Product | null> {
  return demoProducts.find((p) => p.slug === slug) ?? null;
}

export async function listProductSlugs(): Promise<string[]> {
  return demoProducts.map((p) => p.slug);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const sameCategory = demoProducts.filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id);
  const others = demoProducts.filter((p) => p.categorySlug !== product.categorySlug);
  return [...sameCategory, ...others].slice(0, limit);
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  return demoProducts.filter((p) => p.isFeatured && totalStock(p) > 0).slice(0, limit);
}

export async function getNewArrivals(limit = 4): Promise<Product[]> {
  return [...demoProducts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function getBestSellers(limit = 4): Promise<Product[]> {
  return [...demoProducts].sort((a, b) => b.soldCount - a.soldCount).slice(0, limit);
}

export async function suggest(q: string, limit = 8): Promise<SearchSuggestion[]> {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const categories: SearchSuggestion[] = demoCategories
    .filter((c) => c.name.toLowerCase().includes(needle))
    .map((c) => ({ type: "category", label: c.name, href: `/categories/${c.slug}` }));
  const products: SearchSuggestion[] = demoProducts
    .filter((p) => p.name.toLowerCase().includes(needle) || p.tags.some((t) => t.includes(needle)))
    .map((p) => ({ type: "product", label: p.name, href: `/products/${p.slug}` }));
  return [...categories, ...products].slice(0, limit);
}
