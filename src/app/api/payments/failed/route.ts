import { z } from "zod";
import { json, limitByIp, readJson, sameOrigin } from "@/server/http";
import { markPaymentFailed } from "@/server/services/orders";

const schema = z.object({
  razorpayOrderId: z.string().regex(/^order_[A-Za-z0-9]+$/),
  paymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/).optional(),
  code: z.string().max(80).optional(),
  description: z.string().max(300).optional(),
});

/**
 * Browser reports a failed attempt. Safe to trust: it can only move an UNPAID order to
 * "payment_failed" (never marks anything paid), and a later successful payment still confirms it.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ message: "Bad origin" }, 403);
  const limited = await limitByIp("pay-failed", 20, 60);
  if (limited) return limited;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return json({ ok: false }, 400);
  const { razorpayOrderId, ...info } = parsed.data;
  await markPaymentFailed(razorpayOrderId, info, "customer");
  return json({ ok: true });
}
