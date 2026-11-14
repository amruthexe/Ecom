import type { Metadata } from "next";
import { AlertTriangle, ArrowLeft, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/admin/order-actions";
import { OrderStatusBadge, PaymentStatusText } from "@/components/admin/order-badges";
import { ReconcileButton } from "@/components/admin/reconcile-button";
import { Alert, Panel } from "@/components/admin/ui";
import { ProductMedia } from "@/components/store/product-media";
import { formatDateTime } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { hasPermission } from "@/lib/permissions";
import { requireStaffPage } from "@/server/auth";
import { getOrderDetail } from "@/server/services/sales";

// Admin pages always check the signed-in user on the server before rendering, so they block by design.
export const instant = false;

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const user = await requireStaffPage("orders");
  const order = await getOrderDetail((await params).id);
  if (!order) notFound();
  const a = order.shippingAddress;
  const canPayments = hasPermission(user, "payments") || hasPermission(user, "refunds");

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg-strong">
        <ArrowLeft className="size-4" /> Orders
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-fg-strong sm:text-3xl">{order.orderNumber}</h1>
        <OrderStatusBadge status={order.status} />
        <PaymentStatusText status={order.paymentStatus} />
        <span className="w-full text-sm text-fg-muted sm:ml-auto sm:w-auto">{formatDateTime(order.createdAt)}</span>
      </div>
      {order.needsAttention && (
        <Alert tone="error">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4" /> {order.needsAttention}
          </span>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel title={`Items (${order.items.reduce((n, i) => n + i.qty, 0)})`}>
            <ul className="divide-y divide-border">
              {order.items.map((i) => (
                <li key={i.sku} className="flex gap-3 py-3 first:pt-0">
                  <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-md border border-border">
                    <ProductMedia image={i.imageUrl ? { url: i.imageUrl, alt: i.name } : undefined} seed={i.slug} alt={i.name} sizes="56px" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/admin/products/${i.productId}`} className="text-fg-strong hover:underline">
                      {i.name}
                    </Link>
                    <p className="text-xs text-fg-muted">
                      {i.options ? `${i.options} · ` : ""}SKU {i.sku}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {formatPaise(i.unitPricePaise)}
                      {i.unitMrpPaise > i.unitPricePaise && <s className="ml-1">{formatPaise(i.unitMrpPaise)}</s>} × {i.qty}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-fg-strong tabular-nums">{formatPaise(i.lineTotalPaise)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <Row label="Items (MRP)" value={formatPaise(order.pricing.mrpTotalPaise)} />
              {order.pricing.mrpTotalPaise > order.pricing.subtotalPaise && <Row label="Discount" value={`− ${formatPaise(order.pricing.mrpTotalPaise - order.pricing.subtotalPaise)}`} />}
              <Row label="Shipping" value={order.pricing.shippingPaise ? formatPaise(order.pricing.shippingPaise) : "Free"} />
              <Row label="Total paid" value={formatPaise(order.pricing.totalPaise)} strong />
              <Row label={`GST included (${order.pricing.gstRatePercent}%)`} value={formatPaise(order.pricing.gstPaise)} />
              {order.refundedPaise > 0 && <Row label="Refunded" value={`− ${formatPaise(order.refundedPaise)}`} />}
            </dl>
          </Panel>

          {(order.paymentStatus === "pending" || order.paymentStatus === "failed") && order.razorpayOrderId && <ReconcileButton id={order.id} />}

          <OrderActions
            id={order.id}
            orderNumber={order.orderNumber}
            status={order.status}
            paymentStatus={order.paymentStatus}
            refundablePaise={order.pricing.totalPaise - order.refundedPaise}
            canOrders={hasPermission(user, "orders")}
            canRefund={hasPermission(user, "refunds")}
          />

          <Panel title="Timeline">
            <ol className="space-y-3">
              {[...order.statusHistory].reverse().map((h, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                  <div>
                    <p className="text-fg-strong">{ORDER_STATUS_LABEL[h.status]}</p>
                    <p className="text-xs text-fg-muted">
                      {formatDateTime(h.at)} · {h.by}
                      {h.note ? ` · ${h.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Customer">
            <p className="font-medium text-fg-strong">{order.contact.name}</p>
            <a href={`mailto:${order.contact.email}`} className="mt-2 flex items-center gap-2 text-sm text-fg hover:underline">
              <Mail className="size-4 text-fg-muted" /> {order.contact.email}
            </a>
            <a href={`tel:+91${order.contact.phone}`} className="mt-1.5 flex items-center gap-2 text-sm text-fg hover:underline">
              <Phone className="size-4 text-fg-muted" /> +91 {order.contact.phone}
            </a>
          </Panel>
          <Panel title="Delivery address">
            <address className="text-sm leading-relaxed text-fg not-italic">
              {a.name}
              <br />
              {a.line1}
              {a.line2 && (
                <>
                  <br />
                  {a.line2}
                </>
              )}
              {a.landmark && (
                <>
                  <br />
                  Near {a.landmark}
                </>
              )}
              <br />
              {a.city}, {a.state} {a.pincode}
              <br />
              Phone: {a.phone}
            </address>
            {order.trackingNote && <p className="mt-3 border-t border-border pt-3 text-sm text-fg">Tracking: {order.trackingNote}</p>}
          </Panel>
          {canPayments && (
            <Panel title="Payment">
              {order.payment ? (
                <dl className="space-y-2 text-sm">
                  <Row label="Status" value={order.payment.status} />
                  <Row label="Amount" value={formatPaise(order.payment.amountPaise)} />
                  {order.payment.method && <Row label="Method" value={order.payment.method.toUpperCase()} />}
                  <Mono label="Razorpay order" value={order.payment.razorpayOrderId} />
                  {order.payment.razorpayPaymentId && <Mono label="Payment ID" value={order.payment.razorpayPaymentId} />}
                  {order.payment.capturedAt && <Row label="Captured" value={formatDateTime(order.payment.capturedAt)} />}
                  {order.payment.errorDescription && <p className="text-xs text-danger">Last error: {order.payment.errorDescription}</p>}
                  {order.payment.refunds.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="mb-1 text-xs text-fg-muted">Refunds</p>
                      {order.payment.refunds.map((r) => (
                        <p key={r.razorpayRefundId} className="text-xs text-fg">
                          {formatPaise(r.amountPaise)} · {r.status} · {formatDateTime(r.createdAt)} · {r.reason}
                        </p>
                      ))}
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-fg-muted">No payment record.</p>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-muted">{label}</dt>
      <dd className={strong ? "font-semibold text-fg-strong tabular-nums" : "text-fg tabular-nums capitalize"}>{value}</dd>
    </div>
  );
}

function Mono({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="font-mono text-xs break-all text-fg-strong select-all">{value}</dd>
    </div>
  );
}
