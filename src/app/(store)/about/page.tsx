import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BRAND_TAGLINE, BrandLogo } from "@/components/brand-logo";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { ContactCard } from "@/components/store/legal";
import { COMPANY } from "@/lib/company";
import { ABOUT_PARAGRAPHS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "About us",
  description: `About ${COMPANY.legalName} — your trusted partner in health and happiness.`,
};

export default function AboutPage() {
  return (
    <Container className="py-10 sm:py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
        <article className="max-w-3xl">
          <BrandLogo variant="mark" className="h-14 w-auto" />
          <p className="mt-6 text-xs font-medium tracking-[0.25em] text-accent uppercase">{BRAND_TAGLINE}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">About {COMPANY.legalName}</h1>
          <div className="mt-8 space-y-5">
            {ABOUT_PARAGRAPHS.map((p) => (
              <p key={p} className="text-lg leading-8 text-fg">
                {p}
              </p>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/products" className={buttonClasses("primary", "lg")}>
              Shop wellness <ArrowRight className="size-4" />
            </Link>
            <Link href="/policies" className={buttonClasses("secondary", "lg")}>
              Terms &amp; Policies
            </Link>
          </div>
        </article>
        <ContactCard className="h-fit" />
      </div>
    </Container>
  );
}
