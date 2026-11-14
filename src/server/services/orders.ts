import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type { OrderStatus } from "@/lib/orders";
import { canStaffTransition } from "@/lib/orders";
import type { StaffUser } from "@/lib/permissions";
import { checkoutSchema, verifySchema } from "@/lib/validators/checkout";
import { fieldErrors } from "@/lib/validators/product";
import { audit } from "../audit";
import { connectDB } from "../db";
import { env } from "../env";
import { Counter } from "../models/misc";
import { InventoryTransaction } from "../models/inventory-transaction";
import { Order, type OrderDoc } from "../models/order";
import { Payment } from "../models/payment";
import { Product } from "../models/product";
import { getGateway, verifyPaymentSignature, type GatewayPayment } from "../razorpay";
import { getStoreSettings, quoteCart, type QuoteProblem } from "./pricing";

/* ───────────────────────── guest order links ───────────────────────── */

/** Unguessable per-order token for guest order pages, derived (not stored) from the order id. */
export function orderAccessToken(orderId: string): string {
  return createHmac("sha256", env.auth().BETTER_AUTH_SECRET).update(`order-access:${orderId}`).digest("base64url").slice(0, 32);
}

export function verifyOrderAccessToken(orderId: string, token: string | undefined | null): boolean {
  if (!token || !Types.ObjectId.isValid(orderId)) return false;
  const a = Buffer.from(orderAccessToken(orderId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function nextOrderNumber(): Promise<string> {
  const c = await Counter.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return `VV${String(100000 + (c?.seq ?? 1))}`;
}

function history(status: OrderStatus, by: string, note?: string) {
  return { status, at: new Date(), by, note };
}

/* ───────────────────────── checkout ───────────────────────── */

export type CheckoutResult =
  | { ok: true; orderId: string; orderNumber: string; razorpayOrderId: string; amountPaise: number; keyId: string; token: string; prefill: { name: string; email: string; contact: string } }
  | { ok: false; errors?: Record<string, string>; problems?: QuoteProblem[]; message?: string };

/** Creates a pending order with server-computed prices, then a Razorpay order for exactly that amount. */
export async function createCheckout(raw: unknown, opts: { userId?: string; keyId: string }): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;
  await connectDB();

  // Idempotency: a double-click / retry with the same key returns the same pending order.
  const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean<OrderDoc>();
  if (existing) {
    if (existing.status === "pending_payment" && existing.razorpayOrderId) {
      return {
        ok: true,
        orderId: String(existing._id),
        orderNumber: existing.orderNumber,
        razorpayOrderId: existing.razorpayOrderId,
        amountPaise: existing.pricing.totalPaise,
        keyId: opts.keyId,
        token: orderAccessToken(String(existing._id)),
        prefill: { name: existing.contact.name, email: existing.contact.email, contact: existing.contact.phone },
      };
    }
    return { ok: false, message: "This checkout was already used. Please refresh and try again." };
  }

  const quote = await quoteCart(input.items);
  if (quote.problems.length) return { ok: false, problems: quote.problems, message: "Some items in your cart changed. Please review." };
  if (quote.totalPaise < 100) return { ok: false, message: "Order total must be at least ₹1." };

  const settings = await getStoreSettings();
  const order = await Order.create({
    orderNumber: await nextOrderNumber(),
    userId: opts.userId,
    contact: input.contact,
    shippingAddress: { name: input.contact.name, phone: input.contact.phone, ...input.address, country: "IN" },
    items: quote.lines.map((l) => ({
      productId: new Types.ObjectId(l.productId),
      variantId: l.variantId ? new Types.ObjectId(l.variantId) : undefined,
      name: l.name,
      slug: l.slug,
      sku: l.sku,
      options: l.options,
      imageUrl: l.imageUrl,
      unitMrpPaise: l.unitMrpPaise,
      unitPricePaise: l.unitPricePaise,
      qty: l.qty,
      lineTotalPaise: l.lineTotalPaise,
    })),
    pricing: {
      subtotalPaise: quote.subtotalPaise,
      mrpTotalPaise: quote.mrpTotalPaise,
      shippingPaise: quote.shippingPaise,
      totalPaise: quote.totalPaise,
      gstPaise: quote.gstPaise,
      gstRatePercent: quote.gstRatePercent,
      currency: "INR",
    },
    status: "pending_payment",
    paymentStatus: "pending",
    statusHistory: [history("pending_payment", "customer", "Checkout started")],
    idempotencyKey: input.idempotencyKey,
    expiresAt: new Date(Date.now() + settings.pendingOrderTtlMinutes * 60_000),
  });

  let rzp: { id: string; amount: number };
  try {
    rzp = await getGateway().createOrder({
      amountPaise: quote.totalPaise,
      receipt: order.orderNumber,
      notes: { orderId: String(order._id), orderNumber: order.orderNumber },
    });
  } catch (error) {
    console.error("[checkout] Razorpay order creation failed", error);
    order.status = "payment_failed";
    order.needsAttention = "Could not create Razorpay order";
    order.statusHistory.push(history("payment_failed", "system", "Payment gateway unavailable"));
    await order.save();
    return { ok: false, message: "Payments are temporarily unavailable. Please try again in a few minutes." };
  }
  if (rzp.amount !== quote.totalPaise) throw new Error("Razorpay order amount mismatch");

  order.razorpayOrderId = rzp.id;
  await order.save();
  await Payment.create({ orderId: order._id, orderNumber: order.orderNumber, razorpayOrderId: rzp.id, amountPaise: quote.totalPaise, currency: "INR" });

  return {
    ok: true,
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    razorpayOrderId: rzp.id,
    amountPaise: quote.totalPaise,
    keyId: opts.keyId,
    token: orderAccessToken(String(order._id)),
    prefill: { name: input.contact.name, email: input.contact.email, contact: input.contact.phone },
  };
}

/* ───────────────────────── payment confirmation ───────────────────────── */

export type FinalizeOutcome = "confirmed" | "already_processed" | "sold_out_refunded" | "not_found" | "amount_mismatch";

class SoldOutError extends Error {}

/**
 * The ONE place an order becomes paid. Idempotent: safe to call from the checkout callback,
 * webhooks, retries, and concurrently. Stock is deducted at most once (guarded by `stockDeducted`).
 */
export async function finalizePaidOrder(payment: GatewayPayment, by: string): Promise<FinalizeOutcome> {
  await connectDB();
  const order = await Order.findOne({ razorpayOrderId: payment.order_id }).lean<OrderDoc>();
  if (!order) return "not_found";
  if (order.stockDeducted || order.paymentStatus === "paid") return "already_processed";
  if (payment.amount !== order.pricing.totalPaise || payment.currency !== "INR") {
    await Order.updateOne({ _id: order._id }, { needsAttention: `Payment amount mismatch: got ${payment.amount} ${payment.currency}` });
    return "amount_mismatch";
  }

  const session = await mongoose.startSession();
  let outcome: FinalizeOutcome = "confirmed";
  try {
    await session.withTransaction(async () => {
      outcome = "confirmed";
      // Claim the order atomically. A second concurrent caller gets null here.
      const claimed = await Order.findOneAndUpdate(
        { _id: order._id, stockDeducted: false, status: { $in: ["pending_payment", "payment_failed", "expired"] } },
        { $set: { stockDeducted: true } },
        { session, returnDocument: "after" },
      );
      if (!claimed) {
        outcome = "already_processed";
        return;
      }
      for (const item of claimed.items) await deductStock(item, String(claimed._id), session);

      claimed.status = "confirmed";
      claimed.paymentStatus = "paid";
      claimed.paidAt = new Date();
      claimed.expiresAt = undefined;
      claimed.statusHistory.push(history("confirmed", by, `Paid via Razorpay (${payment.method ?? "online"})`));
      await claimed.save({ session });
      await recordCapturedPayment(payment, session);
    });
  } catch (e) {
    if (!(e instanceof SoldOutError)) throw e;
    outcome = "sold_out_refunded";
  } finally {
    await session.endSession();
  }

  if (outcome === "sold_out_refunded") await handleSoldOutAfterPayment(String(order._id), payment, by);
  return outcome;
}

async function deductStock(item: OrderDoc["items"][number], orderId: string, session: ClientSession) {
  const filter = item.variantId
    ? { _id: item.productId, variants: { $elemMatch: { _id: item.variantId, stock: { $gte: item.qty } } } }
    : { _id: item.productId, "variants.0": { $exists: false }, stock: { $gte: item.qty } };
  const update = item.variantId
    ? { $inc: { "variants.$.stock": -item.qty, totalStock: -item.qty, soldCount: item.qty } }
    : { $inc: { stock: -item.qty, totalStock: -item.qty, soldCount: item.qty } };
  const updated = await Product.findOneAndUpdate(filter, update, { session, returnDocument: "after", projection: { stock: 1, variants: 1 } });
  if (!updated) throw new SoldOutError(item.sku);
  const balance = item.variantId ? (updated.variants.find((v) => String(v._id) === String(item.variantId))?.stock ?? 0) : updated.stock;
  await InventoryTransaction.create(
    [{ productId: item.productId, variantId: item.variantId, sku: item.sku, change: -item.qty, balanceAfter: balance, reason: "order", orderId: new Types.ObjectId(orderId) }],
    { session },
  );
}

async function recordCapturedPayment(p: GatewayPayment, session?: ClientSession) {
  await Payment.updateOne(
    { razorpayOrderId: p.order_id },
    {
      $set: {
        razorpayPaymentId: p.id,
        status: "captured",
        method: p.method,
        email: p.email,
        contact: p.contact,
        capturedAt: new Date(),
        errorCode: undefined,
        errorDescription: undefined,
      },
      $inc: { attempts: 1 },
    },
    { session },
  );
}

/** Customer paid, but an item sold out meanwhile: cancel + full automatic refund, flag for the owner. */
async function handleSoldOutAfterPayment(orderId: string, payment: GatewayPayment, by: string) {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, stockDeducted: false, paymentStatus: { $ne: "paid" }, status: { $ne: "cancelled" } },
    {
      $set: { status: "cancelled", paymentStatus: "paid", paidAt: new Date(), cancelReason: "Sold out after payment", needsAttention: "Item sold out after payment — automatic refund issued" },
      $push: { statusHistory: history("cancelled", by, "Sold out after payment, refunding automatically") },
    },
    { returnDocument: "after" },
  );
  if (!claimed) return;
  await recordCapturedPayment(payment);
  try {
    await issueRefund(claimed, payment.id, claimed.pricing.totalPaise, "Item sold out", "system");
  } catch (e) {
    console.error("[orders] automatic refund failed", e);
    await Order.updateOne({ _id: orderId }, { needsAttention: "Item sold out after payment — AUTOMATIC REFUND FAILED, refund manually" });
  }
}

/** Called by the browser after Razorpay Checkout succeeds. Never trusts the browser alone. */
export async function verifyCheckoutPayment(raw: unknown): Promise<{ ok: true; orderId: string; token: string; outcome: FinalizeOutcome } | { ok: false; message: string }> {
  const parsed = verifySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Invalid payment response" };
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) return { ok: false, message: "Payment signature could not be verified" };

  await connectDB();
  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id }, { _id: 1, pricing: 1 }).lean();
  if (!order) return { ok: false, message: "Order not found" };

  // Confirm with Razorpay directly: status, order and amount must match.
  let payment = await getGateway().fetchPayment(razorpay_payment_id);
  if (payment.order_id !== razorpay_order_id) return { ok: false, message: "Payment does not belong to this order" };
  if (payment.status === "authorized") payment = await getGateway().capture(payment.id, order.pricing.totalPaise);
  if (payment.status !== "captured") return { ok: false, message: "Payment is not complete yet" };

  const outcome = await finalizePaidOrder(payment, "checkout");
  if (outcome === "not_found" || outcome === "amount_mismatch") return { ok: false, message: "Payment could not be matched to your order. Our team has been alerted." };
  return { ok: true, orderId: String(order._id), token: orderAccessToken(String(order._id)), outcome };
}

/** Marks a still-unpaid order as failed (from browser failure callback or payment.failed webhook). */
export async function markPaymentFailed(razorpayOrderId: string, info: { paymentId?: string; code?: string; description?: string }, by: string) {
  await connectDB();
  await Order.updateOne(
    { razorpayOrderId, status: "pending_payment", paymentStatus: { $ne: "paid" } },
    { $set: { status: "payment_failed", paymentStatus: "failed" }, $push: { statusHistory: history("payment_failed", by, info.description) } },
  );
  await Payment.updateOne(
    { razorpayOrderId, status: { $in: ["created", "failed"] } },
    { $set: { status: "failed", errorCode: info.code, errorDescription: info.description, ...(info.paymentId ? { razorpayPaymentId: info.paymentId } : {}) }, $inc: { attempts: 1 } },
  );
}

/* ───────────────────────── refunds & fulfilment (admin) ───────────────────────── */

async function issueRefund(order: { _id: Types.ObjectId; pricing: { totalPaise: number }; refundedPaise: number; orderNumber: string }, paymentId: string, amountPaise: number, reason: string, by: string) {
  const refund = await getGateway().refund(paymentId, amountPaise, { orderNumber: order.orderNumber, reason });
  const refundedTotal = order.refundedPaise + amountPaise;
  const full = refundedTotal >= order.pricing.totalPaise;
  await Payment.updateOne(
    { razorpayPaymentId: paymentId },
    {
      $push: { refunds: { razorpayRefundId: refund.id, amountPaise, status: refund.status, reason, createdBy: by, createdAt: new Date() } },
      $inc: { refundedPaise: amountPaise },
      $set: { status: full ? "refunded" : "partially_refunded" },
    },
  );
  await Order.updateOne({ _id: order._id }, { $inc: { refundedPaise: amountPaise }, $set: { paymentStatus: full ? "refunded" : "partially_refunded" } });
  return refund;
}

export type AdminResult = { ok: true; message?: string } | { ok: false; error: string };

export async function refundOrder(orderId: string, amountPaise: number | undefined, reason: string, actor: StaffUser): Promise<AdminResult> {
  if (!Types.ObjectId.isValid(orderId)) return { ok: false, error: "Order not found" };
  await connectDB();
  const order = await Order.findById(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (!["paid", "partially_refunded"].includes(order.paymentStatus)) return { ok: false, error: "Only paid orders can be refunded" };
  const remaining = order.pricing.totalPaise - order.refundedPaise;
  const amount = amountPaise ?? remaining;
  if (!Number.isInteger(amount) || amount < 100) return { ok: false, error: "Refund must be at least ₹1" };
  if (amount > remaining) return { ok: false, error: `You can refund at most ₹${(remaining / 100).toFixed(2)}` };
  const payment = await Payment.findOne({ orderId: order._id, status: { $in: ["captured", "partially_refunded"] } }).lean();
  if (!payment?.razorpayPaymentId) return { ok: false, error: "No captured payment found for this order" };
  try {
    await issueRefund(order, payment.razorpayPaymentId, amount, reason || "Refund by store", actor.email);
  } catch (e) {
    console.error("[refund] failed", e);
    return { ok: false, error: "Razorpay refused the refund. Check the Razorpay dashboard." };
  }
  await audit(actor, { action: "order.refund", entity: "order", entityId: orderId, summary: `Refunded ₹${(amount / 100).toFixed(2)} on ${order.orderNumber}`, changes: { amountPaise: amount, reason } });
  return { ok: true, message: "Refund initiated. It reaches the customer in 5–7 working days." };
}

export async function updateOrderStatus(orderId: string, to: OrderStatus, actor: StaffUser, opts: { note?: string; trackingNote?: string; refund?: boolean } = {}): Promise<AdminResult> {
  if (!Types.ObjectId.isValid(orderId)) return { ok: false, error: "Order not found" };
  await connectDB();
  const order = await Order.findById(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (!canStaffTransition(order.status, to)) return { ok: false, error: `Can't change ${order.status} → ${to}` };

  if (to === "cancelled") {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const fresh = await Order.findOneAndUpdate(
          { _id: orderId, status: order.status },
          { $set: { status: "cancelled", cancelReason: opts.note || "Cancelled by store" }, $push: { statusHistory: history("cancelled", actor.email, opts.note) } },
          { session, returnDocument: "after" },
        );
        if (!fresh) throw new Error("Order changed, refresh and try again");
        if (fresh.stockDeducted) {
          for (const item of fresh.items) {
            const update = item.variantId ? { $inc: { "variants.$.stock": item.qty, totalStock: item.qty, soldCount: -item.qty } } : { $inc: { stock: item.qty, totalStock: item.qty, soldCount: -item.qty } };
            const filter = item.variantId ? { _id: item.productId, "variants._id": item.variantId } : { _id: item.productId };
            const p = await Product.findOneAndUpdate(filter, update, { session, returnDocument: "after", projection: { stock: 1, variants: 1 } });
            if (p) {
              const balance = item.variantId ? (p.variants.find((v) => String(v._id) === String(item.variantId))?.stock ?? 0) : p.stock;
              await InventoryTransaction.create([{ productId: item.productId, variantId: item.variantId, sku: item.sku, change: item.qty, balanceAfter: balance, reason: "cancel", orderId: fresh._id, actorId: actor.id }], { session });
            }
          }
        }
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Could not cancel" };
    } finally {
      await session.endSession();
    }
    await audit(actor, { action: "order.cancel", entity: "order", entityId: orderId, summary: `Cancelled ${order.orderNumber}` });
    if (opts.refund && ["paid", "partially_refunded"].includes(order.paymentStatus)) {
      const r = await refundOrder(orderId, undefined, opts.note || "Order cancelled", actor);
      if (!r.ok) return { ok: false, error: `Order cancelled and stock restored, but refund failed: ${r.error}` };
      return { ok: true, message: "Order cancelled, stock restored and full refund initiated." };
    }
    return { ok: true, message: "Order cancelled and stock restored." };
  }

  const set: Record<string, unknown> = { status: to };
  if (opts.trackingNote !== undefined) set.trackingNote = opts.trackingNote.slice(0, 300);
  const res = await Order.updateOne({ _id: orderId, status: order.status }, { $set: set, $push: { statusHistory: history(to, actor.email, opts.note) } });
  if (!res.modifiedCount) return { ok: false, error: "Order changed, refresh and try again" };
  await audit(actor, { action: "order.status", entity: "order", entityId: orderId, summary: `${order.orderNumber}: ${order.status} → ${to}` });
  return { ok: true };
}

/** Expire abandoned checkouts (no stock was reserved, so nothing to restore). */
export async function expirePendingOrders(): Promise<number> {
  await connectDB();
  const res = await Order.updateMany(
    { status: "pending_payment", expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" }, $push: { statusHistory: history("expired", "system", "Payment not completed in time") } },
  );
  return res.modifiedCount;
}
