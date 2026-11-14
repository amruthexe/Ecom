import { json, limitByIp, readJson, sameOrigin } from "@/server/http";
import { publicKeyId } from "@/server/razorpay";
import { createCheckout } from "@/server/services/orders";

/** Creates the pending order + Razorpay order. Amount is computed on the server only. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ message: "Bad origin" }, 403);
  const limited = await limitByIp("checkout", 10, 60);
  if (limited) return limited;
  const body = await readJson(request);
  if (!body) return json({ message: "Invalid request" }, 400);
  try {
    const result = await createCheckout(body, { keyId: publicKeyId() });
    return json(result, result.ok ? 200 : 422);
  } catch (e) {
    console.error("[checkout]", e);
    return json({ ok: false, message: "Something went wrong. You have not been charged." }, 500);
  }
}
