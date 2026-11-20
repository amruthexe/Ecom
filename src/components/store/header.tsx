import Link from "next/link";
import { Suspense } from "react";
import { listCategories } from "@/server/catalog";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/utils";
import { AccountMenu, AccountMenuFallback } from "./account-menu";
import { CartButton } from "./cart-button";
import { Logo } from "./logo";
import { MobileNav, MobileNavFallback } from "./mobile-nav";
import { SearchBox } from "./search-box";

export async function Header() {
  const categories = await listCategories();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="border-b border-border bg-surface text-center text-xs text-fg-muted">
        <Container className="py-2">Wellness essentials, delivered across India · Prices include GST</Container>
      </div>
      <Container className="flex h-16 items-center gap-3">
        {/* MobileNav reads usePathname (active link), so it needs its own Suspense boundary. */}
        <Suspense fallback={<MobileNavFallback />}>
          <MobileNav categories={categories} />
        </Suspense>
        <Logo />
        <nav className="ml-6 hidden min-w-0 items-center gap-0.5 lg:flex" aria-label="Main">
          <NavLink href="/products">Shop all</NavLink>
          {/* Show as many categories as fit; the rest are in the footer, mobile menu and Shop all. */}
          {categories.slice(0, 4).map((c, i) => (
            <NavLink key={c.id} href={`/categories/${c.slug}`} className={i >= 2 ? "hidden xl:block" : undefined}>
              {c.name}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchBox className="hidden w-56 md:block xl:w-64" />
          <Suspense fallback={<AccountMenuFallback />}>
            <AccountMenu />
          </Suspense>
          <CartButton />
        </div>
      </Container>
    </header>
  );
}

function NavLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("rounded-md px-2.5 py-2 text-sm whitespace-nowrap text-fg transition-colors hover:bg-surface-2 hover:text-fg-strong", className)}>
      {children}
    </Link>
  );
}
