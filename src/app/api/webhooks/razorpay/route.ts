import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/server/catalog";
import { handleRazorpayWebhook } from "@/server/services/webhooks";

/**
 * Razorpay webhook endpoint. Configure in Razorpay Dashboard → Webhooks:
 *   URL: https://<your-domain>/api/webhooks/razorpay
 *   Events: payment.authorized, payment.captured, payment.failed, order.paid, refund.processed, refund.failed
 *   Secret: RAZORPAY_WEBHOOK_SECRET
 */
export async function POST(request: Request) {
  const raw = await request.text(); // RAW body — required for signature verification
  if (raw.length > 1_000_000) return new Response("too large", { status: 413 });
  const result = await handleRazorpayWebhook(raw, request.headers.get("x-razorpay-signature"), request.headers.get("x-razorpay-event-id"));
  if (result.body === "processed") revalidateTag(CATALOG_TAG, "max"); // stock may have changed
  return new Response(result.body, { status: result.status });
}
