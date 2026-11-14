import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { json } from "@/server/http";
import { expirePendingOrders } from "@/server/services/orders";

/** Marks abandoned checkouts as expired. Call with header `Authorization: Bearer <CRON_SECRET>` (Vercel Cron does this). */
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${env.cron().CRON_SECRET}`);
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return json({ message: "Unauthorized" }, 401);
  return json({ expired: await expirePendingOrders() });
}
