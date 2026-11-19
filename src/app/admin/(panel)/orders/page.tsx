import type { Metadata } from "next";
import { AlertTriangle, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Search, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { OrderStatusBadge, PaymentStatusText } from "@/components/admin/order-badges";
import { PageHeader, inputCls } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { formatDateTime } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requireStaffPage } from "@/server/auth";
import { ORDER_FILTER_TABS as TABS, orderListQuery, parseOrderListParams, type OrderFilter } from "@/lib/order-filters";
import { listOrders } from "@/server/services/sales";

// Admin pages always check the signed-in user on the server before rendering, so they block by design.
export const instant = false;

export const metadata: Metadata = { title: "Orders" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaffPage("orders");
  const sp = await searchParams;
  const params = parseOrderListParams(sp);
  const { filter, q, from, to } = params;
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const { rows, total, pages } = await listOrders({ ...params, page });
  const hasDates = Boolean(from || to);

  const href = (over: { filter?: OrderFilter; page?: number }) => {
    const s = orderListQuery({ ...params, filter: over.filter ?? filter }, { page: over.page && over.page > 1 ? over.page : undefined });
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };
  // Exports use exactly the filters on screen (all matching orders, not just this page).
  const exportHref = (format: "xlsx" | "pdf") => `/api/admin/orders/export?${orderListQuery(params, { format })}`;

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${total} order${total === 1 ? "" : "s"}${q || filter !== "all" || hasDates ? " match your filters" : ""}`}
        actions={
          <>
            <a href={exportHref("xlsx")} download className={cn(buttonClasses("secondary", "sm"), total === 0 && "pointer-events-none opacity-40")} aria-disabled={total === 0}>
              <FileSpreadsheet className="size-4" /> Excel
            </a>
            <a href={exportHref("pdf")} download className={cn(buttonClasses("secondary", "sm"), total === 0 && "pointer-events-none opacity-40")} aria-disabled={total === 0}>
              <FileText className="size-4" /> PDF
            </a>
          </>
        }
      />
      <form action="/admin/orders" className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted" />
          <input name="q" type="search" defaultValue={q} placeholder="Order no., name, email or phone" className={cn(inputCls, "pl-9")} aria-label="Search orders" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <label className="block">
            <span className="mb-1 block text-xs text-fg-muted">From</span>
            <input type="date" name="from" defaultValue={from} className={cn(inputCls, "[color-scheme:dark]")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-fg-muted">To</span>
            <input type="date" name="to" defaultValue={to} className={cn(inputCls, "[color-scheme:dark]")} />
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" className={cn(buttonClasses("primary"), "flex-1 sm:flex-none")}>
            Apply
          </button>
          {(q || hasDates) && (
            <Link href={filter === "all" ? "/admin/orders" : `/admin/orders?filter=${filter}`} className={buttonClasses("secondary")} aria-label="Clear search and dates">
              <X className="size-4" />
            </Link>
          )}
        </div>
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
        <EmptyState icon={<ShoppingCart className="size-10" />} title={q || filter !== "all" || hasDates ? "No orders match" : "No orders yet"} description="Paid orders appear here as soon as customers check out." />
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
