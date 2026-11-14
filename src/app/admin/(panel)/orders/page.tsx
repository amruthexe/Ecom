import type { Metadata } from "next";
import { AlertTriangle, ChevronLeft, ChevronRight, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { OrderStatusBadge, PaymentStatusText } from "@/components/admin/order-badges";
import { PageHeader, inputCls } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { formatDateTime } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requireStaffPage } from "@/server/auth";
import { listOrders, type OrderFilter } from "@/server/services/sales";

// Admin pages always check the signed-in user on the server before rendering, so they block by design.
export const instant = false;

export const metadata: Metadata = { title: "Orders" };

const TABS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "to_fulfil", label: "To fulfil" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "unpaid", label: "Unpaid / failed" },
  { value: "attention", label: "Needs attention" },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaffPage("orders");
  const sp = await searchParams;
  const q = first(sp.q)?.trim().slice(0, 80) || undefined;
  const f = first(sp.filter);
  const filter: OrderFilter = TABS.some((t) => t.value === f) ? (f as OrderFilter) : "all";
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const { rows, total, pages } = await listOrders({ filter, q, page });

  const href = (over: { filter?: OrderFilter; page?: number }) => {
    const p = new URLSearchParams();
    const fl = over.filter ?? filter;
    if (fl !== "all") p.set("filter", fl);
    if (q) p.set("q", q);
    if (over.page && over.page > 1) p.set("page", String(over.page));
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"}`} />
      <form action="/admin/orders" className="relative mb-4">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted" />
        <input name="q" type="search" defaultValue={q} placeholder="Order no., name, email or phone" className={cn(inputCls, "pl-9")} aria-label="Search orders" />
      </form>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={href({ filter: t.value })}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap",
              filter === t.value ? "border-accent bg-accent/15 text-fg-strong" : "border-border text-fg-muted hover:border-border-strong",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="size-10" />} title={q || filter !== "all" ? "No orders match" : "No orders yet"} description="Paid orders appear here as soon as customers check out." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {rows.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="block rounded-lg border border-border bg-surface p-3 active:bg-surface-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-fg-strong">{o.orderNumber}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-fg">
                    {o.customer} · {o.city}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">{o.itemsSummary}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-semibold text-fg-strong tabular-nums">{formatPaise(o.totalPaise)}</span>
                    <span className="flex items-center gap-2">
                      <PaymentStatusText status={o.paymentStatus} />
                      <span className="text-xs text-fg-muted">{formatDateTime(o.createdAt)}</span>
                    </span>
                  </div>
                  {o.needsAttention && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="size-3.5" /> {o.needsAttention}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface text-left text-xs text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-surface">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-fg-strong hover:underline">
                        {o.orderNumber}
                      </Link>
                      {o.needsAttention && <AlertTriangle className="ml-1.5 inline size-3.5 text-warning" aria-label={o.needsAttention} />}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-fg-strong">{o.customer}</p>
                      <p className="text-xs text-fg-muted">
                        {o.phone} · {o.city}
                      </p>
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <p className="truncate text-fg" title={o.itemsSummary}>
                        {o.itemsSummary}
                      </p>
                      <p className="text-xs text-fg-muted">{o.itemCount} item(s)</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-fg-strong tabular-nums">{formatPaise(o.totalPaise)}</td>
                    <td className="px-4 py-3">
                      <PaymentStatusText status={o.paymentStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-muted">{formatDateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
              <Link href={href({ page: page - 1 })} className={cn(buttonClasses("secondary", "sm"), page <= 1 && "pointer-events-none opacity-40")}>
                <ChevronLeft className="size-4" /> Prev
              </Link>
              <span className="text-sm text-fg-muted">
                Page {page} of {pages}
              </span>
              <Link href={href({ page: page + 1 })} className={cn(buttonClasses("secondary", "sm"), page >= pages && "pointer-events-none opacity-40")}>
                Next <ChevronRight className="size-4" />
              </Link>
            </nav>
          )}
        </>
      )}
    </>
  );
}
