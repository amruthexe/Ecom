import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./auth";

/** Any signed-in, non-blocked account can shop (owners/staff too). */
export type Customer = { id: string; name: string; email: string; phone: string };

export async function getCustomer(): Promise<Customer | null> {
  const session = await getSession();
  const user = session?.user as (NonNullable<typeof session>["user"] & { phone?: string | null; status?: string }) | undefined;
  if (!user || user.status === "blocked") return null;
  return { id: user.id, name: user.name, email: user.email, phone: user.phone ?? "" };
}

/** Pages that need a signed-in customer. Sends visitors to login and back afterwards. */
export async function requireCustomerPage(next: string): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return customer;
}
