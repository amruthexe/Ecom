import type { Product, ProductVariant } from "./types";

export const LOW_STOCK_THRESHOLD = 5;

export type PriceInfo = { pricePaise: number; mrpPaise: number; onSale: boolean };

/** Effective display price. Checkout always recomputes server-side. */
export function priceOf(product: Product, variant?: ProductVariant): PriceInfo {
  const mrpPaise = variant?.mrpPaise ?? product.mrpPaise;
  const sale = variant?.salePaise ?? (variant?.mrpPaise === undefined ? product.salePaise : undefined);
  const pricePaise = sale !== undefined && sale < mrpPaise ? sale : mrpPaise;
  return { pricePaise, mrpPaise, onSale: pricePaise < mrpPaise };
}

/** Lowest price across variants, used for listing cards. */
export function fromPriceOf(product: Product): PriceInfo {
  if (product.variants.length === 0) return priceOf(product);
  return product.variants
    .map((v) => priceOf(product, v))
    .reduce((min, p) => (p.pricePaise < min.pricePaise ? p : min));
}

export function totalStock(product: Product): number {
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

export function hasVariants(product: Product): boolean {
  return product.variants.length > 0;
}
