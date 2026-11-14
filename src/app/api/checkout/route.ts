import { getCustomer } from "@/server/customer";
import { json, limitByIp, readJson, sameOrigin } from "@/server/http";
import { publicKeyId } from "@/server/razorpay";
import { addAddress } from "@/server/services/account";
import { createCheckout } from "@/server/services/orders";

/** Creates the pending order + Razorpay order. Requires a signed-in customer; amount is computed on the server only. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ message: "Bad origin" }, 403);
  const customer = await getCustomer();
  if (!customer) return json({ ok: false, message: "Please log in to place your order.", loginRequired: true }, 401);
  const limited = await limitByIp("checkout", 10, 60);
  if (limited) return limited;
  const body = (await readJson(request)) as { address?: Record<string, string>; contact?: { name?: string; phone?: string }; saveAddress?: boolean } | null;
  if (!body) return json({ message: "Invalid request" }, 400);
  try {
    const result = await createCheckout(body, { userId: customer.id, accountEmail: customer.email, keyId: publicKeyId() });
    if (result.ok && body.saveAddress && body.address) {
      await addAddress(customer.id, { ...body.address, name: body.contact?.name ?? customer.name, phone: body.contact?.phone ?? customer.phone } as never).catch(() => {});
    }
    return json(result, result.ok ? 200 : 422);
  } catch (e) {
    console.error("[checkout]", e);
    return json({ ok: false, message: "Something went wrong. You have not been charged." }, 500);
  }
}
