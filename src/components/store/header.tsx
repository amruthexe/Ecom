import Link from "next/link";
import { listCategories } from "@/server/catalog";
import { Container } from "@/components/ui/layout";
import { CartButton } from "./cart-button";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { SearchBox } from "./search-box";

export async function Header() {
  const categories = await listCategories();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="border-b border-border bg-surface text-center text-xs text-fg-muted">
        <Container className="py-2">Prices include GST · Secure payments via Razorpay</Container>
      </div>
      <Container className="flex h-16 items-center gap-3">
        <MobileNav categories={categories} />
        <Logo />
        <nav className="ml-8 hidden items-center gap-1 lg:flex" aria-label="Main">
          <NavLink href="/products">Shop all</NavLink>
          {categories.slice(0, 5).map((c) => (
            <NavLink key={c.id} href={`/categories/${c.slug}`}>
              {c.name}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchBox className="hidden w-64 md:block xl:w-72" />
          <CartButton />
        </div>
      </Container>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-3 py-2 text-sm text-fg transition-colors hover:bg-surface-2 hover:text-fg-strong">
      {children}
    </Link>
  );
}
