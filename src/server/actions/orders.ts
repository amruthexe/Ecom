"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import type { OrderStatus } from "@/lib/orders";
import { AuthorizationError, requireStaff } from "../auth";
import { CATALOG_TAG } from "../catalog";
import { refundOrder, updateOrderStatus } from "../services/orders";

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
