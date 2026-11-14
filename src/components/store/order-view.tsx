import { Check } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { FULFILMENT_STEPS, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { OrderDetail } from "@/server/services/sales";
import { ProductMedia } from "./product-media";

/** Customer-facing order details (no internal notes). */
export function OrderView({ order }: { order: OrderDetail }) {
  const step = FULFILMENT_STEPS.indexOf(order.status);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
        <span>
          Order <span className="font-medium text-fg-strong">{order.orderNumber}</span>
        </span>
        <span>Placed {formatDateTime(order.createdAt)}</span>
        <span>
          Payment: <span className="text-fg-strong">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</span>
        </span>
      </div>

      {step >= 0 ? (
        <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
          {FULFILMENT_STEPS.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-2 text-center">
              <span className={cn("grid size-7 place-items-center rounded-full border text-xs", i <= step ? "border-accent bg-accent text-accent-contrast" : "border-border text-fg-muted")}>
                {i <= step ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn("text-[11px] sm:text-xs", i <= step ? "text-fg-strong" : "text-fg-muted")}>{ORDER_STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-fg-strong">Status: {ORDER_STATUS_LABEL[order.status]}</p>
      )}
      {order.trackingNote && order.status !== "cancelled" && <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-fg">Shipping update: {order.trackingNote}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {order.items.map((i) => (
            <li key={`${i.sku}`} className="flex gap-3 p-4">
              <span className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-md border border-border">
                <ProductMedia image={i.imageUrl ? { url: i.imageUrl, alt: i.name } : undefined} seed={i.slug} alt={i.name} sizes="64px" />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-fg-strong">{i.name}</p>
                <p className="text-xs text-fg-muted">
                  {i.options ? `${i.options} · ` : ""}
                  {formatPaise(i.unitPricePaise)} × {i.qty}
                </p>
              </div>
              <p className="text-sm text-fg-strong tabular-nums">{formatPaise(i.lineTotalPaise)}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-4">
          <dl className="space-y-2 rounded-lg border border-border bg-surface p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">Items</dt>
              <dd className="tabular-nums">{formatPaise(order.pricing.subtotalPaise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-muted">Shipping</dt>
              <dd className="tabular-nums">{order.pricing.shippingPaise ? formatPaise(order.pricing.shippingPaise) : "Free"}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-fg-strong">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPaise(order.pricing.totalPaise)}</dd>
            </div>
            <p className="text-xs text-fg-muted">Includes {formatPaise(order.pricing.gstPaise)} GST</p>
            {order.refundedPaise > 0 && <p className="text-xs text-accent">Refunded {formatPaise(order.refundedPaise)}</p>}
          </dl>
          <div className="rounded-lg border border-border bg-surface p-4 text-sm">
            <p className="mb-1 text-xs tracking-wider text-fg-muted uppercase">Delivering to</p>
            <p className="text-fg-strong">{order.shippingAddress.name}</p>
            <p className="text-fg">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
            </p>
            {order.shippingAddress.landmark && <p className="text-fg">Near {order.shippingAddress.landmark}</p>}
            <p className="text-fg">
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
            </p>
            <p className="mt-1 text-fg-muted">{order.shippingAddress.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
