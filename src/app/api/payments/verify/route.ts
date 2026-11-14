import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/server/catalog";
import { json, limitByIp, readJson, sameOrigin } from "@/server/http";
import { verifyCheckoutPayment } from "@/server/services/orders";

/** Browser callback after Razorpay Checkout succeeds. Verified with signature + Razorpay API; webhooks are the backup. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ message: "Bad origin" }, 403);
  const limited = await limitByIp("verify", 20, 60);
  if (limited) return limited;
  const body = await readJson(request);
  try {
    const result = await verifyCheckoutPayment(body);
    if (result.ok && result.outcome !== "already_processed") revalidateTag(CATALOG_TAG, "max"); // stock changed
    return json(result, result.ok ? 200 : 400);
  } catch (e) {
    console.error("[verify]", e);
    return json({ ok: false, message: "We couldn't confirm your payment yet. If money was deducted, your order will be confirmed automatically within a few minutes." }, 502);
  }
}
