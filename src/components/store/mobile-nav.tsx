"use client";

import { ArrowRight, ChevronRight, Menu, Package, ShieldCheck, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import type { Category } from "@/lib/types";
import { BRAND_TAGLINE, BrandLogo } from "@/components/brand-logo";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { cartCount, useCart } from "./cart-store";
import { SearchBox } from "./search-box";

export function MobileNav({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const pathname = usePathname();
  const count = cartCount(useCart());

  return (
    <>
      <button
        className="-ml-2 rounded-md p-2 text-fg hover:bg-surface-2 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="size-6 text-accent" />
      </button>
      <Sheet
        open={open}
        onClose={close}
        title="Menu"
        heading={
          <Link href="/" onClick={close} aria-label="Vevvion home">
            <BrandLogo variant="horizontal" className="h-8 w-auto" />
          </Link>
        }
        footer={
          <div className="space-y-1 text-center text-xs text-fg-muted">
            <p className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5 text-accent" /> Secure checkout · Prices include GST
            </p>
            <p className="tracking-[0.15em] uppercase opacity-80">{BRAND_TAGLINE}</p>
          </div>
        }
      >
        <div className="space-y-6 p-4">
          <SearchBox onNavigate={close} />

          <Link
            href="/products"
            onClick={close}
            className="flex items-center justify-between rounded-xl bg-accent px-4 py-3.5 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Shop all products
            <ArrowRight className="size-5" />
          </Link>

          {categories.length > 0 && (
            <section>
              <SectionLabel>Categories</SectionLabel>
              <ul className="overflow-hidden rounded-xl border border-border bg-bg/40">
                {categories.map((c, i) => {
                  const href = `/categories/${c.slug}`;
                  const active = pathname === href;
                  return (
                    <li key={c.id} className={cn(i > 0 && "border-t border-border")}>
                      <Link
                        href={href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3.5 text-[15px] transition-colors hover:bg-surface-2",
                          active ? "bg-surface-2 font-medium text-fg-strong" : "text-fg",
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", active ? "bg-accent" : "bg-border-strong")} aria-hidden />
                        <span className="flex-1">{c.name}</span>
                        <ChevronRight className="size-4 text-fg-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <SectionLabel>Your account</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              <Tile href="/my-orders" onClick={close} icon={<Package className="size-5 text-accent" />} label="Orders" active={pathname.startsWith("/my-orders")} />
              <Tile href="/account" onClick={close} icon={<User className="size-5 text-accent" />} label="Account" active={pathname.startsWith("/account")} />
              <Tile
                href="/cart"
                onClick={close}
                active={pathname === "/cart"}
                label="Cart"
                icon={
                  <span className="relative">
                    <ShoppingBag className="size-5 text-accent" />
                    {count > 0 && (
                      <span className="absolute -top-2 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-contrast tabular-nums">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                }
              />
            </div>
          </section>
        </div>
      </Sheet>
    </>
  );
}

export function MobileNavFallback() {
  return (
    <span className="-ml-2 rounded-md p-2 text-fg lg:hidden" aria-hidden>
      <Menu className="size-6 text-accent" />
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.18em] text-fg-muted uppercase">{children}</p>;
}

function Tile({ href, onClick, icon, label, active }: { href: string; onClick: () => void; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border px-2 py-3.5 text-sm transition-colors hover:bg-surface-2",
        active ? "border-accent/60 bg-surface-2 text-fg-strong" : "border-border bg-bg/40 text-fg",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
