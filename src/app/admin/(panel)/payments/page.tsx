import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { formatDateTime } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requireStaffPage } from "@/server/auth";
import { listPayments, type PaymentRow } from "@/server/services/sales";

// Admin pages always check the signed-in user on the server before rendering, so they block by design.
export const instant = false;

export const metadata: Metadata = { title: "Payments" };

const TABS: { value: PaymentRow["status"] | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "captured", label: "Successful" },
  { value: "failed", label: "Failed" },
  { value: "created", label: "Pending" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Part refunded" },
];

const TONE: Record<PaymentRow["status"], string> = {
  created: "text-fg-muted",
  authorized: "text-info",
  captured: "text-accent",
  failed: "text-danger",
  refunded: "text-warning",
  partially_refunded: "text-warning",
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireStaffPage("payments");
  const sp = await searchParams;
  const s = first(sp.status);
  const status = TABS.some((t) => t.value === s) ? (s as PaymentRow["status"] | "all") : "all";
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const { rows, total, pages } = await listPayments({ status, page });
  const href = (st: string, p = 1) => `/admin/payments?${new URLSearchParams({ ...(st !== "all" ? { status: st } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <PageHeader title="Payments" description={`${total} Razorpay transaction${total === 1 ? "" : "s"}`} />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={href(t.value)}
            className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap", status === t.value ? "border-accent bg-accent/15 text-fg-strong" : "border-border text-fg-muted hover:border-border-strong")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<CreditCard className="size-10" />} title="No payments yet" description="Razorpay transactions appear here once customers pay." />
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id} className="rounded-lg border border-border bg-surface p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-semibold text-fg-strong tabular-nums">{formatPaise(p.amountPaise)}</span>
                <span className={cn("text-sm font-medium capitalize", TONE[p.status])}>{p.status.replace("_", " ")}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                <Link href={`/admin/orders/${p.orderId}`} className="text-fg hover:underline">
                  Order {p.orderNumber}
                </Link>
                {p.method && <span>{p.method.toUpperCase()}</span>}
                <span>{formatDateTime(p.createdAt)}</span>
                {p.refundedPaise > 0 && <span className="text-warning">Refunded {formatPaise(p.refundedPaise)}</span>}
              </div>
              <div className="mt-2 grid gap-1 font-mono text-[11px] break-all text-fg-muted sm:grid-cols-2">
                <span className="select-all">{p.razorpayOrderId}</span>
                {p.razorpayPaymentId && <span className="select-all">{p.razorpayPaymentId}</span>}
              </div>
              {p.error && <p className="mt-1 text-xs text-danger">{p.error}</p>}
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          <Link href={href(status, page - 1)} className={cn(buttonClasses("secondary", "sm"), page <= 1 && "pointer-events-none opacity-40")}>
            <ChevronLeft className="size-4" /> Prev
          </Link>
          <span className="text-sm text-fg-muted">
            Page {page} of {pages}
          </span>
          <Link href={href(status, page + 1)} className={cn(buttonClasses("secondary", "sm"), page >= pages && "pointer-events-none opacity-40")}>
            Next <ChevronRight className="size-4" />
          </Link>
        </nav>
      )}
    </>
  );
}
