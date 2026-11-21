import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Category, Paginated, Product, SearchSuggestion } from "@/lib/types";
import type { CatalogQuery } from "@/lib/validators/catalog";
import { connectDB } from "../db";
import { Category as CategoryModel, type CategoryDoc } from "../models/category";
import { Product as ProductModel, type ProductDoc } from "../models/product";

/**
 * Storefront catalog reads (MongoDB). Only `active` products and categories are visible.
 * Results are cached under the "catalog" tag; admin mutations call updateTag("catalog").
 */

export const CATALOG_TAG = "catalog";
export const PAGE_SIZE = 12;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toCategory(c: CategoryDoc): Category {
  return {
    id: String(c._id),
    slug: c.slug,
    name: c.name,
    description: c.description,
    image: c.image ? { url: c.image.url, alt: c.image.alt || c.name } : undefined,
  };
}

function toProduct(d: ProductDoc, slugById: Map<string, string>): Product {
  return {
    id: String(d._id),
    slug: d.slug,
    name: d.name,
    shortDescription: d.shortDescription,
    description: d.description,
    categorySlug: slugById.get(String(d.categoryId)) ?? "",
    tags: d.tags,
    images: d.images.map((i) => ({ url: i.url, alt: i.alt || d.name, width: i.width, height: i.height })),
    mrpPaise: d.mrpPaise,
    salePricePaise: d.salePricePaise ?? undefined,
    discountPercent: d.discountPercent,
    deliveryPaise: d.deliveryPaise ?? 0,
    sku: d.sku,
    stock: d.stock,
    options: d.options.map((o) => ({ name: o.name, values: [...o.values] })),
    variants: d.variants.map((v) => ({
      id: String(v._id),
      sku: v.sku,
      options: v.options instanceof Map ? Object.fromEntries(v.options) : { ...v.options },
      stock: v.stock,
      mrpPaise: v.mrpPaise ?? undefined,
    })),
    isFeatured: d.isFeatured,
    soldCount: d.soldCount,
    ratingAvg: d.ratingAvg,
    ratingCount: d.ratingCount,
    createdAt: d.createdAt.toISOString(),
  };
}

async function activeCategoryDocs(): Promise<CategoryDoc[]> {
  await connectDB();
  return CategoryModel.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean<CategoryDoc[]>();
}

async function categorySlugMap(): Promise<Map<string, string>> {
  const cats = await activeCategoryDocs();
  return new Map(cats.map((c) => [String(c._id), c.slug]));
}

async function findProducts(filter: Record<string, unknown>, sort: Record<string, 1 | -1>, limit: number, skip = 0) {
  const slugs = await categorySlugMap();
  const docs = await ProductModel.find({ status: "active", categoryId: { $in: [...slugs.keys()] }, ...filter })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean<ProductDoc[]>();
  return docs.map((d) => toProduct(d, slugs));
}

export async function listCategories(): Promise<Category[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return (await activeCategoryDocs()).map(toCategory);
}

export async function getCategory(slug: string): Promise<Category | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const cats = await activeCategoryDocs();
  const c = cats.find((x) => x.slug === slug);
  return c ? toCategory(c) : null;
}

const SORTS: Record<CatalogQuery["sort"], Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  popular: { soldCount: -1, _id: -1 },
  "price-asc": { pricePaise: 1, _id: 1 },
  "price-desc": { pricePaise: -1, _id: -1 },
};

export async function queryProducts(query: CatalogQuery): Promise<Paginated<Product>> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");
  const slugs = await categorySlugMap();
  const activeIds = [...slugs.keys()];
  const categoryId = query.category ? [...slugs].find(([, s]) => s === query.category)?.[0] : undefined;
  if (query.category && !categoryId) return { items: [], total: 0, page: 1, pages: 1, pageSize: PAGE_SIZE };

  const filter: Record<string, unknown> = { status: "active", categoryId: categoryId ?? { $in: activeIds } };
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: rx }, { shortDescription: rx }, { tags: rx }];
  }
  const price: Record<string, number> = {};
  if (query.min !== undefined) price.$gte = query.min * 100;
  if (query.max !== undefined) price.$lte = query.max * 100;
  if (Object.keys(price).length) filter.pricePaise = price;

  await connectDB();
  const total = await ProductModel.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const docs = await ProductModel.find(filter)
    .sort(SORTS[query.sort])
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean<ProductDoc[]>();
  return { items: docs.map((d) => toProduct(d, slugs)), total, page, pages, pageSize: PAGE_SIZE };
}

export async function getProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const [p] = await findProducts({ slug }, { _id: 1 }, 1);
  return p ?? null;
}

export async function listProductSlugs(): Promise<string[]> {
  await connectDB();
  const docs = await ProductModel.find({ status: "active" }, { slug: 1 }).limit(500).lean();
  return docs.map((d) => d.slug);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const same = await findProducts({ _id: { $ne: product.id }, tags: { $in: product.tags } }, { soldCount: -1 }, limit);
  if (same.length >= limit) return same;
  const more = await findProducts({ _id: { $nin: [product.id, ...same.map((p) => p.id)] } }, { soldCount: -1 }, limit - same.length);
  return [...same, ...more];
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return findProducts({ isFeatured: true, totalStock: { $gt: 0 } }, { updatedAt: -1 }, limit);
}

export async function getNewArrivals(limit = 4): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return findProducts({}, { createdAt: -1 }, limit);
}

export async function getBestSellers(limit = 4): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return findProducts({}, { soldCount: -1 }, limit);
}

export async function suggest(q: string, limit = 8): Promise<SearchSuggestion[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");
  const needle = q.trim();
  if (needle.length < 2) return [];
  const rx = new RegExp(escapeRegex(needle), "i");
  const cats = (await activeCategoryDocs()).filter((c) => rx.test(c.name));
  const products = await findProducts({ $or: [{ name: rx }, { tags: rx }] }, { soldCount: -1 }, limit);
  return [
    ...cats.map((c): SearchSuggestion => ({ type: "category", label: c.name, href: `/categories/${c.slug}` })),
    ...products.map((p): SearchSuggestion => ({ type: "product", label: p.name, href: `/products/${p.slug}` })),
  ].slice(0, limit);
}
