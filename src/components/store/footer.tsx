import { cacheLife } from "next/cache";
import Link from "next/link";
import { listCategories } from "@/server/catalog";
import { Container } from "@/components/ui/layout";
import { Logo } from "./logo";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export async function Footer() {
  const categories = await listCategories();
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-fg-muted">Thoughtfully made essentials, delivered across India.</p>
        </div>
        <FooterColumn title="Shop">
          <FooterLink href="/products">All products</FooterLink>
          {categories.map((c) => (
            <FooterLink key={c.id} href={`/categories/${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
        </FooterColumn>
        <FooterColumn title="Help">
          <FooterLink href="/cart">Your cart</FooterLink>
          <li className="text-sm text-fg-muted">Prices include GST</li>
          <li className="text-sm text-fg-muted">Payments secured by Razorpay</li>
        </FooterColumn>
        <FooterColumn title="Why Vevvion">
          <li className="text-sm text-fg-muted">Carefully chosen products</li>
          <li className="text-sm text-fg-muted">Delivery across India</li>
          <li className="text-sm text-fg-muted">Order tracking from your account</li>
        </FooterColumn>
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col gap-2 py-6 text-xs text-fg-muted sm:flex-row sm:justify-between">
          <p>
            © <CopyrightYear /> Vevvion. All rights reserved.
          </p>
          <p>Made in India</p>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-medium tracking-[0.2em] text-fg-strong uppercase">{title}</h3>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-fg-muted transition-colors hover:text-fg-strong">
        {children}
      </Link>
    </li>
  );
}
