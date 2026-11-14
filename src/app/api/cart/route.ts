import { cartItemsSchema } from "@/lib/validators/checkout";
import { getCustomer } from "@/server/customer";
import { json, limitByIp, readJson, sameOrigin } from "@/server/http";
import { getCartLines, saveCart } from "@/server/services/account";

/** Signed-in customer's cart (synced across devices). Guests get 401 and keep a device-only cart. */
export async function GET() {
  const customer = await getCustomer();
  if (!customer) return json({ signedIn: false }, 401);
  return json({ signedIn: true, userId: customer.id, lines: await getCartLines(customer.id) });
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return json({ message: "Bad origin" }, 403);
  const customer = await getCustomer();
  if (!customer) return json({ signedIn: false }, 401);
  const limited = await limitByIp("cart", 120, 60);
  if (limited) return limited;
  const body = (await readJson(request)) as { items?: unknown } | null;
  const items = Array.isArray(body?.items) && body.items.length === 0 ? [] : cartItemsSchema.safeParse(body?.items).data;
  if (!items) return json({ message: "Invalid cart" }, 400);
  await saveCart(customer.id, items);
  return json({ ok: true });
}
