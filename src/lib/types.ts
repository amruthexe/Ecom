/** Client-safe domain types shared by server and UI. Money is integer paise. */

export type ProductImage = {
  url: string;
  alt: string;
  fileId?: string;
  width?: number;
  height?: number;
};

export type ProductOption = {
  name: string; // e.g. "Size", "Colour"
  values: string[];
};

export type ProductVariant = {
  id: string;
  sku: string;
  options: Record<string, string>;
  stock: number;
  /** Optional per-variant MRP override. The product's discount ratio still applies. */
  mrpPaise?: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image?: ProductImage;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  categorySlug: string;
  tags: string[];
  images: ProductImage[];
  mrpPaise: number;
  /** Selling price the owner entered (GST-inclusive). Missing on products saved before 2026-11-21. */
  salePricePaise?: number;
  /** LEGACY: only used when salePricePaise is missing. */
  discountPercent?: number;
  /** Delivery charge per unit, added at checkout (owner decision 2026-11-21). */
  deliveryPaise: number;
  sku: string;
  stock: number; // used when there are no variants
  options: ProductOption[];
  variants: ProductVariant[];
  isFeatured: boolean;
  soldCount: number;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string; // ISO
};

export type ProductStatus = "draft" | "active" | "archived";

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
};

export type SearchSuggestion = {
  type: "product" | "category";
  label: string;
  href: string;
};
