import { cartItemsSchema } from "@/lib/validators/checkout";
import { json, limitByIp, readJson, sameOrigin } from "@/server/http";
import { quoteCart } from "@/server/services/pricing";

/** Live, server-calculated prices + stock problems for the cart / checkout pages. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ message: "Bad origin" }, 403);
  const limited = await limitByIp("quote", 60, 60);
  if (limited) return limited;
  const body = (await readJson(request)) as { items?: unknown } | null;
  const parsed = cartItemsSchema.safeParse(body?.items);
  if (!parsed.success) return json({ message: "Invalid cart" }, 400);
  return json(await quoteCart(parsed.data));
}
