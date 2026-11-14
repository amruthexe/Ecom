import { z } from "zod";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Best selling" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const sortValues = SORT_OPTIONS.map((o) => o.value) as [SortValue, ...SortValue[]];

/** Parses untrusted URL search params. Invalid values fall back to defaults instead of erroring. */
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z
    .string()
    .regex(/^[a-z0-9-]{1,96}$/)
    .optional()
    .catch(undefined),
  min: z.coerce.number().int().min(0).max(10_000_000).optional().catch(undefined),
  max: z.coerce.number().int().min(0).max(10_000_000).optional().catch(undefined),
  sort: z.enum(sortValues).default("newest").catch("newest"),
  page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
});

export type CatalogQuery = z.output<typeof catalogQuerySchema>;

type RawParams = Record<string, string | string[] | undefined>;

export function parseCatalogQuery(raw: RawParams): CatalogQuery {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  return catalogQuerySchema.parse({
    q: first(raw.q),
    category: first(raw.category),
    min: first(raw.min),
    max: first(raw.max),
    sort: first(raw.sort),
    page: first(raw.page),
  });
}

/** Builds a /products URL, dropping empty and default values. */
export function catalogHref(query: Partial<CatalogQuery>, base = "/products"): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.min !== undefined) params.set("min", String(query.min));
  if (query.max !== undefined) params.set("max", String(query.max));
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
