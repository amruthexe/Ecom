import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus, type PaymentStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

const ORDER_TONE: Record<OrderStatus, string> = {
  pending_payment: "border-border bg-surface-2 text-fg-muted",
  payment_failed: "border-danger/40 bg-danger/10 text-danger",
  expired: "border-border bg-surface-2 text-fg-muted",
  confirmed: "border-info/40 bg-info/10 text-info",
  processing: "border-warning/40 bg-warning/10 text-warning",
  packed: "border-warning/40 bg-warning/10 text-warning",
  shipped: "border-accent/40 bg-accent/10 text-fg-strong",
  delivered: "border-accent bg-accent text-accent-contrast",
  cancelled: "border-danger/40 bg-danger/10 text-danger",
};

const PAY_TONE: Record<PaymentStatus, string> = {
  pending: "text-fg-muted",
  paid: "text-accent",
  failed: "text-danger",
  refunded: "text-warning",
  partially_refunded: "text-warning",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", ORDER_TONE[status])}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function PaymentStatusText({ status }: { status: PaymentStatus }) {
  return <span className={cn("text-xs font-medium whitespace-nowrap", PAY_TONE[status])}>{PAYMENT_STATUS_LABEL[status]}</span>;
}
