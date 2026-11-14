import type { Metadata } from "next";
import { ArrowLeft, Ban, CheckCircle2, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge, PaymentStatusText } from "@/components/admin/order-badges";
import { Alert, Panel } from "@/components/admin/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { setCustomerStatusAction } from "@/server/actions/orders";
import { requireStaffPage } from "@/server/auth";
import { getCustomerDetail } from "@/server/services/customers";

// Admin pages always check the signed-in user on the server before rendering, so they block by design.
export const instant = false;

export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomerPage({ params, searchParams }: PageProps<"/admin/customers/[id]">) {
  const user = await requireStaffPage("customers");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = await getCustomerDetail(id);
  if (!c) notFound();
  const canOrders = hasPermission(user, "orders");

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg-strong">
        <ArrowLeft className="size-4" /> Customers
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-fg-strong sm:text-3xl">{c.name}</h1>
        {c.status === "blocked" && <span className="rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-xs text-danger">Blocked</span>}
      </div>
      {sp.updated && <Alert tone="success">Customer updated.</Alert>}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Panel title={`Orders (${c.orders.length})`}>
          {c.orders.length === 0 ? (
            <p className="text-sm text-fg-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {c.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0">
                    {canOrders ? (
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-fg-strong hover:underline">
                        {o.orderNumber}
                      </Link>
                    ) : (
                      <span className="font-medium text-fg-strong">{o.orderNumber}</span>
                    )}
                    <p className="text-xs text-fg-muted">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm text-fg-strong tabular-nums">{formatPaise(o.totalPaise)}</span>
                    <span className="flex items-center gap-2">
                      <PaymentStatusText status={o.paymentStatus} />
                      <OrderStatusBadge status={o.status} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Contact">
            <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm text-fg hover:underline">
              <Mail className="size-4 text-fg-muted" /> {c.email}
            </a>
            {c.phone && (
              <a href={`tel:+91${c.phone}`} className="mt-1.5 flex items-center gap-2 text-sm text-fg hover:underline">
                <Phone className="size-4 text-fg-muted" /> +91 {c.phone}
              </a>
            )}
            <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-muted">Paid orders</dt>
                <dd className="text-fg-strong">{c.paidOrders}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-muted">Total spent</dt>
                <dd className="text-fg-strong tabular-nums">{formatPaise(c.spentPaise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-muted">Joined</dt>
                <dd className="text-fg">{formatDate(c.joinedAt)}</dd>
              </div>
            </dl>
          </Panel>
          {c.addresses.length > 0 && (
            <Panel title="Saved addresses">
              <ul className="space-y-2 text-sm text-fg">
                {c.addresses.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel title="Account status">
            <form action={setCustomerStatusAction}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="status" value={c.status === "blocked" ? "active" : "blocked"} />
              {c.status === "blocked" ? (
                <button className="flex w-full items-center justify-center gap-2 rounded-md border border-accent/60 px-4 py-2.5 text-sm text-fg-strong hover:bg-accent/10">
                  <CheckCircle2 className="size-4" /> Unblock customer
                </button>
              ) : (
                <button className="flex w-full items-center justify-center gap-2 rounded-md border border-danger/40 px-4 py-2.5 text-sm text-danger hover:bg-danger/10">
                  <Ban className="size-4" /> Block customer
                </button>
              )}
            </form>
            <p className="mt-2 text-xs text-fg-muted">Blocked customers are signed out everywhere and can&apos;t log in or order.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
