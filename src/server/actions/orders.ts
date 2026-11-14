"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import type { OrderStatus } from "@/lib/orders";
import { AuthorizationError, requireStaff } from "../auth";
import { CATALOG_TAG } from "../catalog";
import { reconcileOrderPayment, refundOrder, updateOrderStatus } from "../services/orders";

export type OrderActionState = { ok?: boolean; message?: string; error?: string };

const statusSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/),
  to: z.enum(["processing", "packed", "shipped", "delivered", "cancelled"]),
  note: z.string().trim().max(300).optional(),
  trackingNote: z.string().trim().max(300).optional(),
  refund: z.literal("on").optional(),
});

export async function updateOrderStatusAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  let user;
  try {
    user = await requireStaff("orders");
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: e.message };
    throw e;
  }
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request" };
  const { id, to, note, trackingNote, refund } = parsed.data;
  if (refund && !hasPermission(user, "refunds")) return { error: "You don't have permission to issue refunds." };

  const res = await updateOrderStatus(id, to as OrderStatus, user, { note, trackingNote, refund: !!refund });
  if (!res.ok) return { error: res.error };
  if (to === "cancelled") updateTag(CATALOG_TAG); // stock restored
  return { ok: true, message: res.message ?? "Order updated." };
}

const refundSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/),
  amount: z.string().trim().optional(),
  reason: z.string().trim().max(200).optional(),
});

export async function refundOrderAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  let user;
  try {
    user = await requireStaff("refunds");
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: e.message };
    throw e;
  }
  const parsed = refundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request" };
  const rupees = parsed.data.amount ? Number(parsed.data.amount) : undefined;
  if (rupees !== undefined && (!Number.isFinite(rupees) || rupees <= 0)) return { error: "Enter a valid amount" };
  const res = await refundOrder(parsed.data.id, rupees !== undefined ? Math.round(rupees * 100) : undefined, parsed.data.reason ?? "", user);
  return res.ok ? { ok: true, message: res.message } : { error: res.error };
}

const RECONCILE_MESSAGES: Record<string, string> = {
  confirmed: "Payment found on Razorpay — order confirmed and stock updated.",
  already_processed: "This order was already confirmed.",
  already_paid: "This order is already paid.",
  sold_out_refunded: "Payment found, but an item sold out — the order was cancelled and refunded automatically.",
  unpaid: "Razorpay shows no successful payment for this order.",
  amount_mismatch: "Razorpay's paid amount doesn't match this order. Check the Razorpay dashboard.",
  no_gateway_order: "This order never reached Razorpay.",
  not_found: "Order not found.",
};

export async function reconcileOrderAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  let user;
  try {
    user = await requireStaff(["orders", "payments"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: e.message };
    throw e;
  }
  const id = String(formData.get("id") ?? "");
  if (!/^[a-f0-9]{24}$/.test(id)) return { error: "Invalid order" };
  try {
    const outcome = await reconcileOrderPayment(id, user.email);
    if (outcome === "confirmed" || outcome === "sold_out_refunded") updateTag(CATALOG_TAG);
    const message = RECONCILE_MESSAGES[outcome] ?? outcome;
    return outcome === "confirmed" || outcome === "already_processed" || outcome === "already_paid" ? { ok: true, message } : { error: message };
  } catch (e) {
    console.error("[reconcile]", e);
    return { error: "Couldn't reach Razorpay. Try again in a minute." };
  }
}
