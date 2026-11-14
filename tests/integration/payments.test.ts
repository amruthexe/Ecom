import { createHmac } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { StaffUser } from "@/lib/permissions";
import { connectDB } from "@/server/db";
import { InventoryTransaction } from "@/server/models/inventory-transaction";
import { Order } from "@/server/models/order";
import { Payment } from "@/server/models/payment";
import { Product } from "@/server/models/product";
import { setGatewayForTests, type GatewayOrder, type GatewayPayment, type PaymentGateway } from "@/server/razorpay";
import { saveCategory } from "@/server/services/categories";
import { createCheckout, expirePendingOrders, finalizePaidOrder, reconcileOrderPayment, refundOrder, updateOrderStatus, verifyCheckoutPayment, verifyOrderAccessToken } from "@/server/services/orders";
import { quoteCart } from "@/server/services/pricing";
import { saveProduct } from "@/server/services/products";
import { handleRazorpayWebhook } from "@/server/services/webhooks";

/** Payment flow tests with a FAKE gateway on the isolated vevvion_test database. No real money, no Razorpay calls. */

const KEY_SECRET = "test_key_secret";
const WEBHOOK_SECRET = "test_webhook_secret";
const actor: StaffUser = { id: "t", name: "T", email: "owner@example.invalid", role: "owner", permissions: [] };

class FakeGateway implements PaymentGateway {
  orders = new Map<string, number>();
  payments = new Map<string, GatewayPayment>();
  refunds: { paymentId: string; amount: number }[] = [];
  failRefund = false;
  private static seq = 0;
  private get next() {
    return ++FakeGateway.seq;
  }
  async createOrder({ amountPaise }: { amountPaise: number }) {
    const id = `order_T${this.next}`;
    this.orders.set(id, amountPaise);
    return { id, amount: amountPaise, currency: "INR" };
  }
  /** Simulates a payment. `fee` mimics Razorpay accounts where the customer pays the gateway fee on top. */
  pay(orderId: string, opts: { amount?: number; status?: GatewayPayment["status"]; fee?: number; reportFee?: boolean } = {}): GatewayPayment {
    const base = opts.amount ?? this.orders.get(orderId)!;
    const fee = opts.fee ?? 0;
    const p: GatewayPayment = {
      id: `pay_T${this.next}`,
      order_id: orderId,
      status: opts.status ?? "captured",
      amount: base + fee,
      currency: "INR",
      method: "upi",
      fee: opts.reportFee === false ? undefined : fee,
    };
    this.payments.set(p.id, p);
    return p;
  }
  async fetchOrder(orderId: string): Promise<GatewayOrder> {
    const amount = this.orders.get(orderId)!;
    const paid = [...this.payments.values()].some((p) => p.order_id === orderId && p.status === "captured" && p.amount >= amount);
    return { id: orderId, amount, amount_paid: paid ? amount : 0, status: paid ? "paid" : "attempted" };
  }
  async fetchOrderPayments(orderId: string) {
    return [...this.payments.values()].filter((p) => p.order_id === orderId);
  }
  async fetchPayment(id: string) {
    return this.payments.get(id)!;
  }
  async capture(id: string) {
    const p = { ...this.payments.get(id)!, status: "captured" as const };
    this.payments.set(id, p);
    return p;
  }
  async refund(paymentId: string, amount: number) {
    if (this.failRefund) throw new Error("refund failed");
    this.refunds.push({ paymentId, amount });
    return { id: `rfnd_T${this.next}`, amount, status: "processed" as const };
  }
}

const sign = (s: string, secret: string) => createHmac("sha256", secret).update(s).digest("hex");
let gw: FakeGateway;
let categoryId = "";
let simpleId = "";
let variantProductId = "";
let variantId = "";
let keyN = 0;
const key = () => `test-idempotency-${Date.now()}-${++keyN}`;

const contact = { name: "Asha Rao", email: "Asha@Example.com", phone: "+91 98765 43210" };
const address = { line1: "12 MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001" };

async function checkout(items: { productId: string; variantId?: string; qty: number }[], idempotencyKey = key()) {
  const r = await createCheckout({ items, contact, address, idempotencyKey }, { keyId: "rzp_test_dummykey" });
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r;
}

beforeAll(async () => {
  if (!process.env.MONGODB_DB_NAME?.endsWith("_test")) throw new Error("Refusing to run outside a _test database");
  if (process.env.RAZORPAY_KEY_SECRET !== KEY_SECRET) throw new Error("Refusing to run with real Razorpay keys");
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([Product.syncIndexes(), Order.syncIndexes(), Payment.syncIndexes()]);
  const c = await saveCategory({ name: "Pay Test" }, actor);
  if (!c.ok) throw new Error("category");
  categoryId = c.id;
}, 60_000);

beforeEach(async () => {
  gw = new FakeGateway();
  setGatewayForTests(gw);
  await Product.deleteMany({});
  const a = await saveProduct({ name: "Mug", categoryId, status: "active", mrpRupees: 800, discountPercent: 25, sku: "P-MUG", stock: 5 }, actor);
  const b = await saveProduct(
    { name: "Tee", categoryId, status: "active", mrpRupees: 1000, discountPercent: 0, sku: "P-TEE", options: [{ name: "Size", values: ["M"] }], variants: [{ sku: "P-TEE-M", options: { Size: "M" }, stock: 2 }] },
    actor,
  );
  if (!a.ok || !b.ok) throw new Error("products");
  simpleId = a.id;
  variantProductId = b.id;
  variantId = String((await Product.findById(b.id).lean())!.variants[0]._id);
});

afterAll(async () => {
  setGatewayForTests(null);
  if (process.env.MONGODB_DB_NAME?.endsWith("_test")) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("pricing", () => {
  it("computes prices from the database and reports stock problems", async () => {
    const q = await quoteCart([{ productId: simpleId, qty: 2 }, { productId: variantProductId, variantId, qty: 3 }]);
    expect(q.lines[0]).toMatchObject({ unitPricePaise: 60000, lineTotalPaise: 120000 });
    expect(q.subtotalPaise).toBe(120000 + 300000);
    expect(q.problems).toEqual([expect.objectContaining({ message: "Only 2 left", available: 2 })]);
  });
  it("merges duplicate lines before checking stock", async () => {
    const q = await quoteCart([{ productId: simpleId, qty: 3 }, { productId: simpleId, qty: 3 }]);
    expect(q.problems[0]?.message).toBe("Only 5 left");
  });
});

describe("checkout", () => {
  it("creates a pending order + Razorpay order for the server-computed amount", async () => {
    const r = await checkout([{ productId: simpleId, qty: 2 }]);
    expect(r.amountPaise).toBe(120000);
    expect(gw.orders.get(r.razorpayOrderId)).toBe(120000);
    const o = await Order.findById(r.orderId).lean();
    expect(o).toMatchObject({ status: "pending_payment", paymentStatus: "pending", stockDeducted: false });
    expect(o?.contact).toMatchObject({ email: "asha@example.com", phone: "9876543210" });
    expect(await Payment.countDocuments({ razorpayOrderId: r.razorpayOrderId, status: "created" })).toBe(1);
    expect(verifyOrderAccessToken(r.orderId, r.token)).toBe(true);
    expect(verifyOrderAccessToken(r.orderId, "x".repeat(32))).toBe(false);
  });
  it("is idempotent for the same key (double click)", async () => {
    const k = key();
    const [a, b] = [await checkout([{ productId: simpleId, qty: 1 }], k), await checkout([{ productId: simpleId, qty: 1 }], k)];
    expect(a.orderId).toBe(b.orderId);
    expect(gw.orders.size).toBe(1);
  });
  it("refuses checkout when stock is insufficient and validates the address", async () => {
    const r = await createCheckout({ items: [{ productId: simpleId, qty: 9 }], contact, address, idempotencyKey: key() }, { keyId: "k" });
    expect(r.ok).toBe(false);
    const bad = await createCheckout({ items: [{ productId: simpleId, qty: 1 }], contact: { ...contact, phone: "12345" }, address: { ...address, pincode: "0123" }, idempotencyKey: key() }, { keyId: "k" });
    expect(!bad.ok && Object.keys(bad.errors ?? {})).toEqual(expect.arrayContaining(["contact.phone", "address.pincode"]));
  });
});

describe("payment verification", () => {
  it("rejects a forged signature and does not confirm the order", async () => {
    const r = await checkout([{ productId: simpleId, qty: 1 }]);
    const p = gw.pay(r.razorpayOrderId);
    const res = await verifyCheckoutPayment({ razorpay_order_id: r.razorpayOrderId, razorpay_payment_id: p.id, razorpay_signature: "a".repeat(64) });
    expect(res.ok).toBe(false);
    expect((await Order.findById(r.orderId).lean())?.status).toBe("pending_payment");
  });

  it("confirms with a valid signature, deducts stock once and logs inventory", async () => {
    const r = await checkout([{ productId: simpleId, qty: 2 }, { productId: variantProductId, variantId, qty: 1 }]);
    const p = gw.pay(r.razorpayOrderId);
    const sig = sign(`${r.razorpayOrderId}|${p.id}`, KEY_SECRET);
    const res = await verifyCheckoutPayment({ razorpay_order_id: r.razorpayOrderId, razorpay_payment_id: p.id, razorpay_signature: sig });
    expect(res).toMatchObject({ ok: true, outcome: "confirmed" });
    const o = await Order.findById(r.orderId).lean();
    expect(o).toMatchObject({ status: "confirmed", paymentStatus: "paid", stockDeducted: true });
    expect((await Product.findById(simpleId).lean())?.stock).toBe(3);
    const vp = await Product.findById(variantProductId).lean();
    expect(vp?.variants[0].stock).toBe(1);
    expect(vp?.totalStock).toBe(1);
    expect(vp?.soldCount).toBe(1);
    expect(await InventoryTransaction.countDocuments({ orderId: r.orderId, reason: "order" })).toBe(2);
    expect((await Payment.findOne({ razorpayOrderId: r.razorpayOrderId }).lean())).toMatchObject({ status: "captured", razorpayPaymentId: p.id, method: "upi" });

    // Webhook for the same payment arrives later → no second deduction
    expect(await finalizePaidOrder(p, "razorpay-webhook")).toBe("already_processed");
    expect((await Product.findById(simpleId).lean())?.stock).toBe(3);
  });

  it("deducts stock exactly once under concurrent confirmations", async () => {
    const r = await checkout([{ productId: simpleId, qty: 2 }]);
    const p = gw.pay(r.razorpayOrderId);
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => finalizePaidOrder(p, "race")));
    expect(outcomes.filter((o) => o === "confirmed")).toHaveLength(1);
    expect((await Product.findById(simpleId).lean())?.stock).toBe(3);
  });

  it("captures authorized payments", async () => {
    const r = await checkout([{ productId: simpleId, qty: 1 }]);
    const p = gw.pay(r.razorpayOrderId, { status: "authorized" });
    const res = await verifyCheckoutPayment({ razorpay_order_id: r.razorpayOrderId, razorpay_payment_id: p.id, razorpay_signature: sign(`${r.razorpayOrderId}|${p.id}`, KEY_SECRET) });
    expect(res.ok).toBe(true);
  });

  it("does not confirm when the paid amount differs", async () => {
    const r = await checkout([{ productId: simpleId, qty: 1 }]);
    const p = gw.pay(r.razorpayOrderId, { amount: 100 });
    expect(await finalizePaidOrder(p, "test")).toBe("amount_mismatch");
    const o = await Order.findById(r.orderId).lean();
    expect(o?.status).toBe("pending_payment");
    expect(o?.needsAttention).toMatch(/mismatch/);
  });

  it("accepts payments where the customer paid Razorpay's fee on top (₹1 order paid as ₹1.03)", async () => {
    const r = await checkout([{ productId: simpleId, qty: 1 }]);
    const p = gw.pay(r.razorpayOrderId, { fee: 3 });
    expect(p.amount).toBe(60003);
    expect(await finalizePaidOrder(p, "test")).toBe("confirmed");
    expect((await Payment.findOne({ razorpayOrderId: r.razorpayOrderId }).lean())?.feePaise).toBe(3);
  });

  it("falls back to Razorpay's order record when the fee isn't reported on the payment", async () => {
    const r = await checkout([{ productId: simpleId, qty: 1 }]);
    const p = gw.pay(r.razorpayOrderId, { fee: 3, reportFee: false });
    expect(await finalizePaidOrder(p, "test")).toBe("confirmed");
  });

  it("still rejects underpayment even with a fee field", async () => {
    const r = await checkout([{ productId: simpleId, qty: 1 }]);
    const p = gw.pay(r.razorpayOrderId, { amount: 50000, fee: 3 });
    expect(await finalizePaidOrder(p, "test")).toBe("amount_mismatch");
  });

  it("reconciles a stuck order by asking Razorpay, and clears the attention flag", async () => {
    const r = await checkout([{ productId: simpleId, qty: 1 }]);
    expect(await reconcileOrderPayment(r.orderId, "test")).toBe("unpaid");
    await Order.updateOne({ _id: r.orderId }, { needsAttention: "Payment amount mismatch: got 60003 INR" });
    gw.pay(r.razorpayOrderId, { fee: 3 });
    expect(await reconcileOrderPayment(r.orderId, "admin")).toBe("confirmed");
    const o = await Order.findById(r.orderId).lean();
    expect(o).toMatchObject({ status: "confirmed", paymentStatus: "paid" });
    expect(o?.needsAttention).toBeUndefined();
    expect(await reconcileOrderPayment(r.orderId, "admin")).toBe("already_paid");
  });

  it("cancels and auto-refunds when an item sold out after payment", async () => {
    const r = await checkout([{ productId: variantProductId, variantId, qty: 2 }]);
    await Product.updateOne({ _id: variantProductId, "variants._id": variantId }, { $set: { "variants.$.stock": 1 } }); // someone else bought one
    const p = gw.pay(r.razorpayOrderId);
    expect(await finalizePaidOrder(p, "test")).toBe("sold_out_refunded");
    const o = await Order.findById(r.orderId).lean();
    expect(o).toMatchObject({ status: "cancelled", paymentStatus: "refunded", stockDeducted: false, refundedPaise: 200000 });
    expect(gw.refunds).toEqual([{ paymentId: p.id, amount: 200000 }]);
    expect((await Product.findById(variantProductId).lean())?.variants[0].stock).toBe(1); // untouched
  });
});

describe("webhooks", () => {
  const body = (event: string, entity: object) => JSON.stringify({ event, payload: { payment: { entity } } });

  it("rejects bad signatures, confirms on payment.captured, ignores duplicates", async () => {
    const r = await checkout([{ productId: simpleId, qty: 1 }]);
    const p = gw.pay(r.razorpayOrderId);
    const raw = body("payment.captured", p);
    expect((await handleRazorpayWebhook(raw, "0".repeat(64), "evt_1")).status).toBe(400);
    expect(await handleRazorpayWebhook(raw, sign(raw, WEBHOOK_SECRET), "evt_1")).toEqual({ status: 200, body: "processed" });
    expect(await handleRazorpayWebhook(raw, sign(raw, WEBHOOK_SECRET), "evt_1")).toEqual({ status: 200, body: "duplicate" });
    expect((await Order.findById(r.orderId).lean())?.status).toBe("confirmed");
    expect((await Product.findById(simpleId).lean())?.stock).toBe(4);
  });

  it("marks failed payments, and a later successful retry still confirms", async () => {
    const r = await checkout([{ productId: simpleId, qty: 1 }]);
    const failed = { ...gw.pay(r.razorpayOrderId, { status: "failed" }), error_code: "BAD_REQUEST_ERROR", error_description: "Payment declined" };
    const raw = body("payment.failed", failed);
    await handleRazorpayWebhook(raw, sign(raw, WEBHOOK_SECRET), "evt_f1");
    expect((await Order.findById(r.orderId).lean())).toMatchObject({ status: "payment_failed", paymentStatus: "failed" });
    expect((await Payment.findOne({ razorpayOrderId: r.razorpayOrderId }).lean())?.errorDescription).toBe("Payment declined");

    const ok = gw.pay(r.razorpayOrderId);
    expect(await finalizePaidOrder(ok, "retry")).toBe("confirmed");
    expect((await Order.findById(r.orderId).lean())?.paymentStatus).toBe("paid");
  });
});

describe("refunds, cancellation, fulfilment, expiry", () => {
  async function paidOrder(qty = 2) {
    const r = await checkout([{ productId: simpleId, qty }]);
    await finalizePaidOrder(gw.pay(r.razorpayOrderId), "test");
    return r;
  }

  it("partial refund then rejects over-refund", async () => {
    const r = await paidOrder();
    expect((await refundOrder(r.orderId, 50000, "Damaged", actor)).ok).toBe(true);
    expect((await Order.findById(r.orderId).lean())).toMatchObject({ paymentStatus: "partially_refunded", refundedPaise: 50000 });
    const over = await refundOrder(r.orderId, 80000, "x", actor);
    expect(over.ok).toBe(false);
    expect((await refundOrder(r.orderId, undefined, "rest", actor)).ok).toBe(true);
    expect((await Order.findById(r.orderId).lean())?.paymentStatus).toBe("refunded");
    expect(gw.refunds.map((x) => x.amount)).toEqual([50000, 70000]);
  });

  it("follows the status flow and blocks invalid jumps", async () => {
    const r = await paidOrder(1);
    expect((await updateOrderStatus(r.orderId, "delivered", actor)).ok).toBe(false);
    for (const s of ["processing", "packed", "shipped", "delivered"] as const) expect((await updateOrderStatus(r.orderId, s, actor, { trackingNote: s === "shipped" ? "DTDC 123" : undefined })).ok).toBe(true);
    const o = await Order.findById(r.orderId).lean();
    expect(o?.status).toBe("delivered");
    expect(o?.trackingNote).toBe("DTDC 123");
    expect((await updateOrderStatus(r.orderId, "cancelled", actor)).ok).toBe(false);
  });

  it("cancel restores stock and refunds in full", async () => {
    const r = await paidOrder(2);
    expect((await Product.findById(simpleId).lean())?.stock).toBe(3);
    const res = await updateOrderStatus(r.orderId, "cancelled", actor, { refund: true, note: "Customer request" });
    expect(res.ok).toBe(true);
    expect((await Product.findById(simpleId).lean())?.stock).toBe(5);
    expect(await InventoryTransaction.countDocuments({ orderId: r.orderId, reason: "cancel" })).toBe(1);
    expect((await Order.findById(r.orderId).lean())).toMatchObject({ status: "cancelled", paymentStatus: "refunded" });
  });

  it("expires abandoned checkouts; a late payment can still confirm", async () => {
    const r = await checkout([{ productId: simpleId, qty: 1 }]);
    await Order.updateOne({ _id: r.orderId }, { expiresAt: new Date(Date.now() - 1000) });
    expect(await expirePendingOrders()).toBe(1);
    expect((await Order.findById(r.orderId).lean())?.status).toBe("expired");
    expect(await finalizePaidOrder(gw.pay(r.razorpayOrderId), "late-webhook")).toBe("confirmed");
  });
});
