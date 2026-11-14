import "server-only";
import { connection } from "next/server";
import { getOrderDetail, type OrderDetail } from "./sales";
import { reconcileOrderPayment, verifyOrderAccessToken } from "./orders";

const RECONCILE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Loads an order for a guest who holds the private link token. Returns null on any mismatch (no info leak).
 * If the order still looks unpaid, asks Razorpay first, so a payment whose confirmation was missed
 * (browser closed, webhook not reachable) is picked up as soon as the customer opens their order.
 */
export async function getGuestOrder(orderId: string | undefined, token: string | undefined): Promise<OrderDetail | null> {
  await connection(); // always rendered per request (live order + payment status)
  if (!orderId || !verifyOrderAccessToken(orderId, token)) return null;
  let order = await getOrderDetail(orderId);
  if (!order) return null;
  const unpaid = order.paymentStatus === "pending" || order.paymentStatus === "failed";
  if (unpaid && order.razorpayOrderId && Date.now() - new Date(order.createdAt).getTime() < RECONCILE_WINDOW_MS) {
    try {
      const outcome = await reconcileOrderPayment(orderId, "customer-order-page");
      if (outcome === "confirmed" || outcome === "sold_out_refunded") order = (await getOrderDetail(orderId)) ?? order;
    } catch (e) {
      console.error("[order page] reconcile failed", e);
    }
  }
  // Strip internal fields before handing to customer-facing UI.
  return { ...order, needsAttention: undefined, payment: undefined, razorpayOrderId: undefined, userId: undefined };
}
