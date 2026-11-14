import "server-only";
import { Types } from "mongoose";
import type { OrderStatus, PaymentStatus } from "@/lib/orders";
import { connectDB } from "../db";
import { Order, type OrderDoc } from "../models/order";
import { Payment, type PaymentDoc } from "../models/payment";

/** Admin read models for orders, payments and revenue. */

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const ORDERS_PAGE_SIZE = 20;

export type OrderRow = {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  phone: string;
  city: string;
  itemCount: number;
  itemsSummary: string;
  totalPaise: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  needsAttention?: string;
  createdAt: string;
};

export type OrderFilter = "all" | "to_fulfil" | "shipped" | "delivered" | "unpaid" | "cancelled" | "attention";

const FILTERS: Record<OrderFilter, Record<string, unknown>> = {
  all: { status: { $nin: ["pending_payment", "expired"] } },
  to_fulfil: { status: { $in: ["confirmed", "processing", "packed"] } },
  shipped: { status: "shipped" },
  delivered: { status: "delivered" },
  unpaid: { status: { $in: ["pending_payment", "payment_failed", "expired"] } },
  cancelled: { status: "cancelled" },
  attention: { needsAttention: { $exists: true, $ne: "" } },
};

export async function listOrders(params: { filter?: OrderFilter; q?: string; page?: number }) {
  await connectDB();
  const filter: Record<string, unknown> = { ...FILTERS[params.filter ?? "all"] };
  if (params.q) {
    const rx = new RegExp(escapeRegex(params.q.slice(0, 80)), "i");
    filter.$or = [{ orderNumber: rx }, { "contact.name": rx }, { "contact.email": rx }, { "contact.phone": rx }];
  }
  const page = Math.max(1, params.page ?? 1);
  const [docs, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * ORDERS_PAGE_SIZE).limit(ORDERS_PAGE_SIZE).lean<OrderDoc[]>(),
    Order.countDocuments(filter),
  ]);
  const rows: OrderRow[] = docs.map((o) => ({
    id: String(o._id),
    orderNumber: o.orderNumber,
    customer: o.contact.name,
    email: o.contact.email,
    phone: o.contact.phone,
    city: o.shippingAddress.city,
    itemCount: o.items.reduce((n, i) => n + i.qty, 0),
    itemsSummary: o.items.map((i) => `${i.name}${i.options ? ` (${i.options})` : ""} × ${i.qty}`).join(", "),
    totalPaise: o.pricing.totalPaise,
    status: o.status,
    paymentStatus: o.paymentStatus,
    needsAttention: o.needsAttention || undefined,
    createdAt: o.createdAt.toISOString(),
  }));
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)) };
}

export type OrderDetail = Omit<OrderDoc, "_id" | "items" | "createdAt" | "updatedAt" | "paidAt" | "statusHistory" | "expiresAt"> & {
  id: string;
  items: (Omit<OrderDoc["items"][number], "productId" | "variantId"> & { productId: string })[];
  statusHistory: { status: OrderStatus; at: string; by: string; note?: string }[];
  createdAt: string;
  paidAt?: string;
  payment?: Omit<PaymentDoc, "_id" | "orderId" | "createdAt" | "updatedAt" | "capturedAt" | "refunds"> & { capturedAt?: string; refunds: (Omit<PaymentDoc["refunds"][number], "createdAt"> & { createdAt: string })[] };
};

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const o = await Order.findById(id).lean<OrderDoc>();
  if (!o) return null;
  const p = await Payment.findOne({ orderId: o._id }).sort({ createdAt: -1 }).lean<PaymentDoc>();
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    userId: o.userId,
    contact: o.contact,
    shippingAddress: o.shippingAddress,
    items: o.items.map((i) => ({ name: i.name, slug: i.slug, sku: i.sku, options: i.options, imageUrl: i.imageUrl, unitMrpPaise: i.unitMrpPaise, unitPricePaise: i.unitPricePaise, qty: i.qty, lineTotalPaise: i.lineTotalPaise, productId: String(i.productId) })),
    pricing: o.pricing,
    status: o.status,
    paymentStatus: o.paymentStatus,
    statusHistory: o.statusHistory.map((h) => ({ status: h.status, at: new Date(h.at).toISOString(), by: h.by, note: h.note })),
    razorpayOrderId: o.razorpayOrderId,
    stockDeducted: o.stockDeducted,
    refundedPaise: o.refundedPaise,
    trackingNote: o.trackingNote,
    cancelReason: o.cancelReason,
    needsAttention: o.needsAttention,
    idempotencyKey: undefined,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString(),
    payment: p
      ? {
          orderNumber: p.orderNumber,
          razorpayOrderId: p.razorpayOrderId,
          razorpayPaymentId: p.razorpayPaymentId,
          amountPaise: p.amountPaise,
          currency: p.currency,
          status: p.status,
          method: p.method,
          email: p.email,
          contact: p.contact,
          errorCode: p.errorCode,
          errorDescription: p.errorDescription,
          attempts: p.attempts,
          refundedPaise: p.refundedPaise,
          capturedAt: p.capturedAt?.toISOString(),
          refunds: p.refunds.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })),
        }
      : undefined,
  };
}

export type PaymentRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amountPaise: number;
  refundedPaise: number;
  status: PaymentDoc["status"];
  method?: string;
  error?: string;
  createdAt: string;
};

export async function listPayments(params: { status?: PaymentDoc["status"] | "all"; page?: number }) {
  await connectDB();
  const filter = params.status && params.status !== "all" ? { status: params.status } : {};
  const page = Math.max(1, params.page ?? 1);
  const [docs, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * ORDERS_PAGE_SIZE).limit(ORDERS_PAGE_SIZE).lean<PaymentDoc[]>(),
    Payment.countDocuments(filter),
  ]);
  const rows: PaymentRow[] = docs.map((p) => ({
    id: String(p._id),
    orderId: String(p.orderId),
    orderNumber: p.orderNumber,
    razorpayOrderId: p.razorpayOrderId,
    razorpayPaymentId: p.razorpayPaymentId,
    amountPaise: p.amountPaise,
    refundedPaise: p.refundedPaise,
    status: p.status,
    method: p.method,
    error: p.errorDescription,
    createdAt: p.createdAt.toISOString(),
  }));
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)) };
}

const IST_OFFSET_MS = 330 * 60_000;
/** Start of "today" in India time, as a UTC Date. */
function istDayStart(daysAgo = 0): Date {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const startIst = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() - daysAgo);
  return new Date(startIst - IST_OFFSET_MS);
}

/** Net revenue = paid order totals minus refunds, grouped by India-time day. */
export async function getSalesOverview(days = 14) {
  await connectDB();
  const since = istDayStart(days - 1);
  const paidMatch = { paidAt: { $gte: since }, paymentStatus: { $in: ["paid", "partially_refunded", "refunded"] } };
  const [daily, toFulfil, attention, recent, unpaid24h] = await Promise.all([
    Order.aggregate<{ _id: string; revenue: number; orders: number }>([
      { $match: paidMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: "+05:30" } },
          revenue: { $sum: { $subtract: ["$pricing.totalPaise", "$refundedPaise"] } },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.countDocuments({ status: { $in: ["confirmed", "processing", "packed"] } }),
    Order.countDocuments({ needsAttention: { $exists: true, $ne: "" } }),
    listOrders({ filter: "all", page: 1 }),
    Order.countDocuments({ status: { $in: ["payment_failed"] }, createdAt: { $gte: new Date(Date.now() - 86_400_000) } }),
  ]);
  const byDay = new Map(daily.map((d) => [d._id, d]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(istDayStart(days - 1 - i).getTime() + IST_OFFSET_MS);
    const key = d.toISOString().slice(0, 10);
    return { date: key, revenuePaise: byDay.get(key)?.revenue ?? 0, orders: byDay.get(key)?.orders ?? 0 };
  });
  const sum = (n: number) => series.slice(-n).reduce((a, d) => ({ revenue: a.revenue + d.revenuePaise, orders: a.orders + d.orders }), { revenue: 0, orders: 0 });
  return { series, today: sum(1), week: sum(7), period: sum(days), toFulfil, attention, unpaid24h, recent: recent.rows.slice(0, 6) };
}
