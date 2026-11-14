import "server-only";
import { getOrderDetail, type OrderDetail } from "./sales";
import { verifyOrderAccessToken } from "./orders";

/** Loads an order for a guest who holds the private link token. Returns null on any mismatch (no info leak). */
export async function getGuestOrder(orderId: string | undefined, token: string | undefined): Promise<OrderDetail | null> {
  if (!orderId || !verifyOrderAccessToken(orderId, token)) return null;
  const order = await getOrderDetail(orderId);
  if (!order) return null;
  // Strip internal fields before handing to customer-facing UI.
  return { ...order, needsAttention: undefined, payment: undefined, razorpayOrderId: undefined, userId: undefined };
}
