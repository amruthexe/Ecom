import { User } from "lucide-react";
import Link from "next/link";
import { getCustomer } from "@/server/customer";
import { CartSync } from "./cart-sync";

/** Header account link (reads the session, so it renders inside <Suspense>). Also mounts cart sync. */
export async function AccountMenu() {
  const customer = await getCustomer();
  return (
    <>
      <CartSync userId={customer?.id ?? null} />
      {customer ? (
        <Link href="/account" className="flex items-center gap-2 rounded-md p-2 text-fg hover:bg-surface-2 hover:text-fg-strong" aria-label="My account">
          <span className="grid size-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-contrast">{customer.name.trim().charAt(0).toUpperCase() || "U"}</span>
          <span className="hidden max-w-24 truncate text-sm lg:inline">{customer.name.split(" ")[0]}</span>
        </Link>
      ) : (
        <Link href="/account/login" className="flex items-center gap-1.5 rounded-md p-2 text-fg hover:bg-surface-2 hover:text-fg-strong" aria-label="Log in">
          <User className="size-5 text-accent" />
          <span className="hidden text-sm lg:inline">Log in</span>
        </Link>
      )}
    </>
  );
}

export function AccountMenuFallback() {
  return (
    <span className="rounded-md p-2 text-fg-muted" aria-hidden>
      <User className="size-5 text-accent" />
    </span>
  );
}
