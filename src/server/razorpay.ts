import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { env } from "./env";

/**
 * Thin, typed wrapper around Razorpay. Services depend on `PaymentGateway`, so tests
 * can swap in a fake gateway and no automated test ever touches real money.
 */

export type GatewayPayment = {
  id: string;
  order_id: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  amount: number;
  currency: string;
  method?: string;
  email?: string;
  contact?: string;
  error_code?: string | null;
  error_description?: string | null;
  /** Gateway fee in paise. When the account passes fees to customers, `amount` = order amount + fee. */
  fee?: number | null;
};

export type GatewayOrder = { id: string; amount: number; amount_paid: number; status: "created" | "attempted" | "paid" };

export type GatewayRefund = { id: string; amount: number; status: "pending" | "processed" | "failed" };

export interface PaymentGateway {
  createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<{ id: string; amount: number; currency: string }>;
  fetchPayment(paymentId: string): Promise<GatewayPayment>;
  fetchOrder(orderId: string): Promise<GatewayOrder>;
  fetchOrderPayments(orderId: string): Promise<GatewayPayment[]>;
  capture(paymentId: string, amountPaise: number): Promise<GatewayPayment>;
  refund(paymentId: string, amountPaise: number, notes: Record<string, string>): Promise<GatewayRefund>;
}

let client: Razorpay | null = null;
function sdk(): Razorpay {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = env.razorpay();
  client ??= new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  return client;
}

const razorpayGateway: PaymentGateway = {
  async createOrder({ amountPaise, receipt, notes }) {
    const o = await sdk().orders.create({ amount: amountPaise, currency: "INR", receipt, notes });
    return { id: o.id, amount: Number(o.amount), currency: o.currency };
  },
  async fetchPayment(paymentId) {
    return (await sdk().payments.fetch(paymentId)) as unknown as GatewayPayment;
  },
  async fetchOrder(orderId) {
    const o = await sdk().orders.fetch(orderId);
    return { id: o.id, amount: Number(o.amount), amount_paid: Number(o.amount_paid), status: o.status as GatewayOrder["status"] };
  },
  async fetchOrderPayments(orderId) {
    const res = await sdk().orders.fetchPayments(orderId);
    return (res.items ?? []) as unknown as GatewayPayment[];
  },
  async capture(paymentId, amountPaise) {
    return (await sdk().payments.capture(paymentId, amountPaise, "INR")) as unknown as GatewayPayment;
  },
  async refund(paymentId, amountPaise, notes) {
    const r = await sdk().payments.refund(paymentId, { amount: amountPaise, notes });
    return { id: r.id, amount: Number(r.amount), status: (r.status as GatewayRefund["status"]) ?? "pending" };
  },
};

let override: PaymentGateway | null = null;

export function getGateway(): PaymentGateway {
  return override ?? razorpayGateway;
}

/** Test hook only. */
export function setGatewayForTests(gateway: PaymentGateway | null): void {
  override = gateway;
}

export function publicKeyId(): string {
  return env.razorpay().RAZORPAY_KEY_ID;
}

function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checkout callback: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string, secret = env.razorpay().RAZORPAY_KEY_SECRET): boolean {
  const expected = createHmac("sha256", secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhooks: HMAC_SHA256(raw request body, webhook_secret). Must use the RAW body. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret = env.razorpay().RAZORPAY_WEBHOOK_SECRET): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
