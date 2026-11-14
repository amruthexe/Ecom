import "server-only";
import { connectDB } from "../db";
import { WebhookEvent } from "../models/misc";
import { Order } from "../models/order";
import { Payment } from "../models/payment";
import { getGateway, verifyWebhookSignature, type GatewayPayment } from "../razorpay";
import { finalizePaidOrder, markPaymentFailed } from "./orders";

type WebhookBody = {
  event: string;
  payload: {
    payment?: { entity: GatewayPayment };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
  };
};

export type WebhookResult = { status: number; body: string };

/**
 * Razorpay webhook processing.
 * - Signature checked against the RAW body.
 * - `x-razorpay-event-id` stored with a unique index → duplicates are acknowledged and skipped.
 * - On processing errors the event record is removed and 500 returned, so Razorpay retries.
 */
export async function handleRazorpayWebhook(rawBody: string, signature: string | null, eventId: string | null): Promise<WebhookResult> {
  if (!signature || !verifyWebhookSignature(rawBody, signature)) return { status: 400, body: "invalid signature" };

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: "invalid json" };
  }
  const id = eventId || `${body.event}:${body.payload.payment?.entity.id ?? body.payload.refund?.entity.id ?? "?"}`;

  await connectDB();
  try {
    await WebhookEvent.create({ eventId: id, event: body.event });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { status: 200, body: "duplicate" };
    throw e;
  }

  try {
    const result = await processEvent(body);
    await WebhookEvent.updateOne({ eventId: id }, { status: result, processedAt: new Date() });
    return { status: 200, body: result };
  } catch (error) {
    console.error("[webhook] processing failed", body.event, error);
    await WebhookEvent.deleteOne({ eventId: id });
    return { status: 500, body: "processing failed" };
  }
}

async function processEvent(body: WebhookBody): Promise<"processed" | "ignored"> {
  switch (body.event) {
    case "payment.authorized": {
      // Only relevant when auto-capture is OFF in Razorpay settings.
      const p = body.payload.payment!.entity;
      const order = await Order.findOne({ razorpayOrderId: p.order_id }, { pricing: 1 }).lean();
      if (!order) return "ignored";
      const captured = await getGateway().capture(p.id, order.pricing.totalPaise);
      await finalizePaidOrder(captured, "razorpay-webhook");
      return "processed";
    }
    case "payment.captured":
    case "order.paid": {
      const p = body.payload.payment?.entity;
      if (!p?.order_id) return "ignored";
      const outcome = await finalizePaidOrder({ ...p, status: "captured" }, "razorpay-webhook");
      return outcome === "not_found" ? "ignored" : "processed";
    }
    case "payment.failed": {
      const p = body.payload.payment!.entity;
      await markPaymentFailed(p.order_id, { paymentId: p.id, code: p.error_code ?? undefined, description: p.error_description ?? undefined }, "razorpay-webhook");
      return "processed";
    }
    case "refund.processed":
    case "refund.failed": {
      const r = body.payload.refund!.entity;
      const status = body.event === "refund.processed" ? "processed" : "failed";
      const res = await Payment.updateOne({ razorpayPaymentId: r.payment_id, "refunds.razorpayRefundId": r.id }, { $set: { "refunds.$.status": status } });
      if (status === "failed" && res.modifiedCount) {
        const pay = await Payment.findOne({ razorpayPaymentId: r.payment_id }, { orderId: 1 }).lean();
        if (pay) await Order.updateOne({ _id: pay.orderId }, { needsAttention: `Refund ${r.id} FAILED at Razorpay — retry manually` });
      }
      return res.matchedCount ? "processed" : "ignored";
    }
    default:
      return "ignored";
  }
}
