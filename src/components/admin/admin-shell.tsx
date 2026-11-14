"use client";

import { CreditCard, FolderTree, LayoutDashboard, LogOut, Menu, Package, Plus, ShoppingCart, Store, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { hasPermission, type Permission, type StaffUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { Sheet } from "@/components/ui/sheet";
import { adminSignOutAction } from "@/server/actions/auth";

type NavItem = { href: string; label: string; icon: typeof Package; permission?: Permission; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, permission: "orders" },
  { href: "/admin/products", label: "Products", icon: Package, permission: "products" },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, permission: "categories" },
  { href: "/admin/customers", label: "Customers", icon: Users, permission: "customers" },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, permission: "payments" },
];

function useActive() {
  const pathname = usePathname();
  return (item: Pick<NavItem, "href" | "exact">) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

export function AdminShell({ user, children }: { user: StaffUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const isActive = useActive();
  const items = NAV.filter((i) => !i.permission || hasPermission(user, i.permission));
  const canProducts = hasPermission(user, "products");

  const navList = (onNavigate?: () => void) => (
    <nav className="space-y-1" aria-label="Admin">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive(item) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
            isActive(item) ? "bg-accent/10 text-fg-strong" : "text-fg-muted hover:bg-surface-2 hover:text-fg-strong",
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const userBox = (
    <div className="space-y-3 border-t border-border p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg-strong">{user.name}</p>
        <p className="truncate text-xs text-fg-muted">
          {user.email} · <span className="capitalize">{user.role}</span>
        </p>
      </div>
      <div className="flex gap-2">
        <Link href="/" className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-fg hover:border-border-strong">
          <Store className="size-3.5" /> View store
        </Link>
        <form action={adminSignOutAction} className="flex-1">
          <button className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-fg hover:border-danger/50 hover:text-danger">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Link href="/admin" aria-label="Admin dashboard">
            <BrandLogo variant="horizontal" className="h-7 w-auto" />
          </Link>
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] tracking-widest text-fg-muted">ADMIN</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{navList()}</div>
        {userBox}
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg/90 px-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 text-fg hover:bg-surface-2" aria-label="Open admin menu">
            <Menu className="size-5" />
          </button>
          <Link href="/admin" aria-label="Admin dashboard">
            <BrandLogo variant="horizontal" className="h-6 w-auto" />
          </Link>
          {canProducts && (
            <Link href="/admin/products/new" className="ml-auto flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast">
              <Plus className="size-4" /> Product
            </Link>
          )}
        </header>
        <Sheet open={open} onClose={close} title="Admin">
          <div className="flex h-full flex-col">
            <div className="flex-1 p-3">{navList(close)}</div>
            {userBox}
          </div>
        </Sheet>

        <main className="flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>

        {/* Mobile bottom tabs */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
          style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
          aria-label="Admin tabs"
        >
          {items.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", isActive(item) ? "text-fg-strong" : "text-fg-muted")}
            >
              <item.icon className={cn("size-5", isActive(item) && "text-accent")} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
