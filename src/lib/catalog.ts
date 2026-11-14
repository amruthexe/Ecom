import type { Product, ProductVariant } from "./types";

export const LOW_STOCK_THRESHOLD = 5;
export const MAX_DISCOUNT_PERCENT = 90;

export type PriceInfo = { pricePaise: number; mrpPaise: number; onSale: boolean };

/** Applies a percentage discount, rounded to the nearest whole rupee. */
export function applyDiscount(mrpPaise: number, discountPercent: number): number {
  const pct = Math.min(Math.max(discountPercent, 0), MAX_DISCOUNT_PERCENT);
  if (pct === 0) return mrpPaise;
  return Math.round((mrpPaise * (100 - pct)) / 100 / 100) * 100;
}

/** Effective display price. Checkout always recomputes server-side. */
export function priceOf(product: Pick<Product, "mrpPaise" | "discountPercent">, variant?: Pick<ProductVariant, "mrpPaise">): PriceInfo {
  const mrpPaise = variant?.mrpPaise ?? product.mrpPaise;
  const pricePaise = applyDiscount(mrpPaise, product.discountPercent);
  return { pricePaise, mrpPaise, onSale: pricePaise < mrpPaise };
}

/** Lowest price across variants, used for listing cards, sorting and price filters. */
export function fromPriceOf(product: Pick<Product, "mrpPaise" | "discountPercent" | "variants">): PriceInfo {
  if (product.variants.length === 0) return priceOf(product);
  return product.variants
    .map((v) => priceOf(product, v))
    .reduce((min, p) => (p.pricePaise < min.pricePaise ? p : min));
}

export function hasVariablePricing(product: Pick<Product, "variants">): boolean {
  return new Set(product.variants.map((v) => v.mrpPaise)).size > 1;
}

export function totalStock(product: Pick<Product, "variants" | "stock">): number {
  return product.variants.length > 0 ? product.variants.reduce((sum, v) => sum + v.stock, 0) : product.stock;
}

export type StockState = "in_stock" | "low_stock" | "out_of_stock";

export function stockState(stock: number): StockState {
  if (stock <= 0) return "out_of_stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

export function findVariant(product: Product, selected: Record<string, string>): ProductVariant | undefined {
  if (product.variants.length === 0) return undefined;
  return product.variants.find((v) => product.options.every((o) => v.options[o.name] === selected[o.name]));
}

export function hasVariants(product: Pick<Product, "variants">): boolean {
  return product.variants.length > 0;
}

/** Builds every combination of option values, e.g. Size × Colour. */
export function optionCombinations(options: { name: string; values: string[] }[]): Record<string, string>[] {
  const usable = options.filter((o) => o.name.trim() && o.values.length > 0);
  if (usable.length === 0) return [];
  return usable.reduce<Record<string, string>[]>(
    (acc, opt) => acc.flatMap((combo) => opt.values.map((v) => ({ ...combo, [opt.name]: v }))),
    [{}],
  );
}
