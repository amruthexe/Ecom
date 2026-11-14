"use client";

import { ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import type { Category } from "@/lib/types";
import { Sheet } from "@/components/ui/sheet";
import { SearchBox } from "./search-box";

export function MobileNav({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        className="rounded-md p-2 text-fg hover:bg-surface-2 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      <Sheet open={open} onClose={close} title="Menu">
        <div className="p-4">
          <SearchBox onNavigate={close} />
        </div>
        <nav className="px-2 pb-6" aria-label="Mobile">
          <MobileLink href="/products" onClick={close}>
            Shop all
          </MobileLink>
          <p className="px-3 pt-5 pb-2 text-xs font-medium tracking-[0.2em] text-fg-muted uppercase">Categories</p>
          {categories.map((c) => (
            <MobileLink key={c.id} href={`/categories/${c.slug}`} onClick={close}>
              {c.name}
            </MobileLink>
          ))}
          <p className="px-3 pt-5 pb-2 text-xs font-medium tracking-[0.2em] text-fg-muted uppercase">More</p>
          <MobileLink href="/cart" onClick={close}>
            Cart
          </MobileLink>
          <MobileLink href="/my-orders" onClick={close}>
            My orders
          </MobileLink>
          <MobileLink href="/account" onClick={close}>
            My account
          </MobileLink>
        </nav>
      </Sheet>
    </>
  );
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center justify-between rounded-md px-3 py-3 text-fg-strong hover:bg-surface-2"
    >
      {children}
      <ChevronRight className="size-4 text-fg-muted" />
    </Link>
  );
}
