import type { Metadata } from "next";
import { LogOut, MapPin, Package, Trash2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Container, Skeleton } from "@/components/ui/layout";
import { AddressForm, PasswordForm, ProfileForm } from "@/components/store/account-forms";
import { cn } from "@/lib/utils";
import { deleteAddressAction, logoutAction, setDefaultAddressAction } from "@/server/actions/account";
import { requireCustomerPage } from "@/server/customer";
import { listAddresses } from "@/server/services/account";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "addresses", label: "Addresses" },
  { key: "password", label: "Password" },
] as const;

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Account searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Account({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  const customer = await requireCustomerPage("/account");
  const sp = await searchParams;
  const t = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab = TABS.some((x) => x.key === t) ? (t as (typeof TABS)[number]["key"]) : "profile";
  const addresses = tab === "addresses" ? await listAddresses(customer.id) : [];

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">Hi, {customer.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-fg-muted">{customer.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/my-orders" className={buttonClasses("primary")}>
            <Package className="size-4" /> My orders
          </Link>
          <form action={logoutAction}>
            <button className={buttonClasses("secondary")}>
              <LogOut className="size-4" /> Log out
            </button>
          </form>
        </div>
      </div>

      <nav className="mb-6 flex gap-2 overflow-x-auto" aria-label="Account sections">
        {TABS.map((x) => (
          <Link
            key={x.key}
            href={`/account?tab=${x.key}`}
            aria-current={tab === x.key ? "page" : undefined}
            className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm", tab === x.key ? "border-accent bg-accent/15 text-fg-strong" : "border-border text-fg-muted hover:border-border-strong")}
          >
            {x.label}
          </Link>
        ))}
      </nav>

      <div className="max-w-2xl rounded-lg border border-border bg-surface p-5">
        {tab === "profile" && <ProfileForm name={customer.name} phone={customer.phone} email={customer.email} />}
        {tab === "password" && <PasswordForm />}
        {tab === "addresses" && (
          <div className="space-y-6">
            {addresses.length > 0 && (
              <ul className="space-y-2">
                {addresses.map((a) => (
                  <li key={a.id} className="rounded-md border border-border bg-bg p-3 text-sm">
                    <p className="flex items-center gap-2 font-medium text-fg-strong">
                      <MapPin className="size-4 text-accent" /> {a.name} · {a.phone}
                      {a.isDefault && <span className="rounded-full border border-accent/40 px-1.5 text-[10px] text-fg">Default</span>}
                    </p>
                    <p className="mt-1 text-fg-muted">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}
                      {a.landmark ? `, near ${a.landmark}` : ""}, {a.city}, {a.state} {a.pincode}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {!a.isDefault && (
                        <form action={setDefaultAddressAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="rounded-md border border-border px-3 py-1.5 text-xs text-fg hover:border-border-strong">Make default</button>
                        </form>
                      )}
                      <form action={deleteAddressAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="flex items-center gap-1 rounded-md border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10">
                          <Trash2 className="size-3.5" /> Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <h2 className="mb-3 font-display text-lg font-semibold text-fg-strong">Add an address</h2>
              <AddressForm defaultName={customer.name} defaultPhone={customer.phone} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
