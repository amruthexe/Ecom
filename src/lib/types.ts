/** Client-safe domain types shared by server and UI. Money is integer paise. */

export type ProductImage = {
  url: string;
  alt: string;
  fileId?: string;
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
  mrpPaise?: number;
  salePaise?: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
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
  salePaise?: number;
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
