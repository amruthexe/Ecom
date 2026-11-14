"use client";

import { Ban, Loader2, PackageCheck, RotateCcw, Truck } from "lucide-react";
import { useActionState, useState } from "react";
import { formatPaise } from "@/lib/money";
import { ORDER_STATUS_LABEL, STAFF_TRANSITIONS, type OrderStatus, type PaymentStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { refundOrderAction, updateOrderStatusAction, type OrderActionState } from "@/server/actions/orders";
import { Alert, inputCls, Panel } from "./ui";

export function OrderActions({
  id,
  orderNumber,
  status,
  paymentStatus,
  refundablePaise,
  canOrders,
  canRefund,
}: {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  refundablePaise: number;
  canOrders: boolean;
  canRefund: boolean;
}) {
  const [statusState, statusAction, statusPending] = useActionState<OrderActionState, FormData>(updateOrderStatusAction, {});
  const [refundState, refundAction, refundPending] = useActionState<OrderActionState, FormData>(refundOrderAction, {});
  const next = (STAFF_TRANSITIONS[status] ?? []).filter((s) => s !== "cancelled");
  const canCancel = STAFF_TRANSITIONS[status]?.includes("cancelled") ?? false;
  const paid = paymentStatus === "paid" || paymentStatus === "partially_refunded";
  const [showCancel, setShowCancel] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  if (!canOrders && !canRefund) return null;
  if (!next.length && !canCancel && !(paid && canRefund && refundablePaise > 0)) return null;

  return (
    <Panel title="Update order">
      {(statusState.error || refundState.error) && <Alert tone="error">{statusState.error || refundState.error}</Alert>}
      {(statusState.message || refundState.message) && <Alert tone="success">{statusState.message || refundState.message}</Alert>}

      {canOrders && next.length > 0 && (
        <form action={statusAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          {next.includes("shipped") && (
            <div>
              <label htmlFor="trackingNote" className="mb-1.5 block text-sm text-fg">
                Tracking / courier note (shown to customer)
              </label>
              <input id="trackingNote" name="trackingNote" maxLength={300} placeholder="e.g. DTDC · AWB 1234567890" className={inputCls} />
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {next.map((to) => (
              <button
                key={to}
                name="to"
                value={to}
                disabled={statusPending}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50",
                  to === next[0] ? "bg-accent text-accent-contrast hover:bg-accent-hover" : "border border-border text-fg hover:border-border-strong",
                )}
              >
                {statusPending ? <Loader2 className="size-4 animate-spin" /> : to === "shipped" ? <Truck className="size-4" /> : <PackageCheck className="size-4" />}
                Mark as {ORDER_STATUS_LABEL[to].toLowerCase()}
              </button>
            ))}
          </div>
        </form>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        {canOrders && canCancel && (
          <button type="button" onClick={() => setShowCancel((v) => !v)} className="flex items-center gap-2 rounded-md border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger/10">
            <Ban className="size-4" /> Cancel order
          </button>
        )}
        {canRefund && paid && refundablePaise > 0 && (
          <button type="button" onClick={() => setShowRefund((v) => !v)} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-fg hover:border-border-strong">
            <RotateCcw className="size-4" /> Refund
          </button>
        )}
      </div>

      {showCancel && (
        <form
          action={statusAction}
          onSubmit={(e) => !confirm(`Cancel order ${orderNumber}? Stock will be returned to inventory.`) && e.preventDefault()}
          className="mt-4 space-y-3 rounded-md border border-danger/30 bg-danger/5 p-3"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="to" value="cancelled" />
          <input name="note" maxLength={300} placeholder="Reason (optional)" className={inputCls} />
          {paid && canRefund && (
            <label className="flex items-center gap-2 text-sm text-fg">
              <input type="checkbox" name="refund" defaultChecked className="size-4 accent-[var(--accent)]" /> Also refund {formatPaise(refundablePaise)} to the customer
            </label>
          )}
          <button disabled={statusPending} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-danger/90 text-sm font-medium text-black hover:bg-danger disabled:opacity-50">
            {statusPending && <Loader2 className="size-4 animate-spin" />} Confirm cancellation
          </button>
        </form>
      )}

      {showRefund && (
        <form
          action={refundAction}
          onSubmit={(e) => !confirm("Send this refund through Razorpay? This moves real money back to the customer.") && e.preventDefault()}
          className="mt-4 space-y-3 rounded-md border border-border bg-bg p-3"
        >
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="amount" inputMode="decimal" placeholder={`Amount ₹ (max ${(refundablePaise / 100).toFixed(2)})`} className={inputCls} aria-label="Refund amount" />
            <input name="reason" maxLength={200} placeholder="Reason" className={inputCls} aria-label="Refund reason" />
          </div>
          <p className="text-xs text-fg-muted">Leave amount empty to refund the full remaining {formatPaise(refundablePaise)}.</p>
          <button disabled={refundPending} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50">
            {refundPending && <Loader2 className="size-4 animate-spin" />} Issue refund
          </button>
        </form>
      )}
    </Panel>
  );
}
