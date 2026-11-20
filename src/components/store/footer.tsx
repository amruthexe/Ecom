import { Mail, MapPin, Phone } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { listCategories } from "@/server/catalog";
import { Container } from "@/components/ui/layout";
import { BRAND_TAGLINE } from "@/components/brand-logo";
import { COMPANY } from "@/lib/company";
import { LEGAL_PAGES } from "@/lib/legal";
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
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="space-y-4">
          <Logo variant="full" className="h-14 w-auto" />
          <p className="max-w-xs text-sm text-fg-muted">Your trusted partner in wellness and healthcare products, delivered across India.</p>
          <ul className="space-y-2.5 text-sm text-fg-muted">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
              <address className="not-italic">
                <span className="block text-fg">{COMPANY.legalName}</span>
                {COMPANY.addressLines.join(", ")}
              </address>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-accent" />
              <a href={`mailto:${COMPANY.email}`} className="hover:text-fg-strong">
                {COMPANY.email}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-accent" />
              <a href={COMPANY.phoneHref} className="hover:text-fg-strong">
                {COMPANY.phoneDisplay}
              </a>
            </li>
          </ul>
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
          <FooterLink href="/about">About us</FooterLink>
          <FooterLink href="/my-orders">My orders</FooterLink>
          <FooterLink href="/account">My account</FooterLink>
          <FooterLink href="/cart">Your cart</FooterLink>
          <li className="text-sm text-fg-muted">Payments secured by Razorpay</li>
        </FooterColumn>
        <FooterColumn title="Policies">
          {LEGAL_PAGES.map((p) => (
            <FooterLink key={p.slug} href={`/policies/${p.slug}`}>
              {p.title}
            </FooterLink>
          ))}
          <FooterLink href="/policies">All policies</FooterLink>
        </FooterColumn>
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col gap-2 py-6 text-xs text-fg-muted sm:flex-row sm:justify-between">
          <p>
            © <CopyrightYear /> {COMPANY.legalName}. All rights reserved.
          </p>
          <p>{BRAND_TAGLINE}</p>
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
