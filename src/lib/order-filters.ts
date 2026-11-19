/**
 * Admin order-list filters, parsed from URL search params. Shared by the Orders page and the
 * export endpoint so an export always contains exactly what the filtered page shows.
 */
export type OrderFilter = "all" | "to_fulfil" | "shipped" | "delivered" | "unpaid" | "cancelled" | "attention";

export const ORDER_FILTER_TABS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "to_fulfil", label: "To fulfil" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "unpaid", label: "Unpaid / failed" },
  { value: "attention", label: "Needs attention" },
];

export type OrderListParams = {
  filter: OrderFilter;
  q?: string;
  /** Inclusive start date, YYYY-MM-DD (India time). */
  from?: string;
  /** Inclusive end date, YYYY-MM-DD (India time). */
  to?: string;
};

type Raw = Record<string, string | string[] | undefined> | URLSearchParams;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function get(raw: Raw, key: string): string | undefined {
  const v = raw instanceof URLSearchParams ? (raw.get(key) ?? undefined) : raw[key];
  return Array.isArray(v) ? v[0] : v;
}

function validDate(v: string | undefined): string | undefined {
  if (!v || !DATE_RE.test(v)) return undefined;
  return Number.isNaN(new Date(`${v}T00:00:00+05:30`).getTime()) ? undefined : v;
}

export function parseOrderListParams(raw: Raw): OrderListParams {
  const f = get(raw, "filter");
  const filter = ORDER_FILTER_TABS.some((t) => t.value === f) ? (f as OrderFilter) : "all";
  const q = get(raw, "q")?.trim().slice(0, 80) || undefined;
  let from = validDate(get(raw, "from"));
  let to = validDate(get(raw, "to"));
  if (from && to && from > to) [from, to] = [to, from];
  return { filter, q, from, to };
}

/** URL query string for these params (omits defaults). */
export function orderListQuery(p: OrderListParams, extra: Record<string, string | number | undefined> = {}): string {
  const s = new URLSearchParams();
  if (p.filter !== "all") s.set("filter", p.filter);
  if (p.q) s.set("q", p.q);
  if (p.from) s.set("from", p.from);
  if (p.to) s.set("to", p.to);
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== "") s.set(k, String(v));
  return s.toString();
}

/** Human description of the applied filters, used in export headers. */
export function describeOrderListParams(p: OrderListParams): string {
  const parts = [`Status: ${ORDER_FILTER_TABS.find((t) => t.value === p.filter)?.label ?? "All"}`];
  if (p.from || p.to) parts.push(`Date: ${p.from ?? "start"} to ${p.to ?? "today"}`);
  if (p.q) parts.push(`Search: "${p.q}"`);
  return parts.join(" · ");
}
