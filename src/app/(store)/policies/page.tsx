import type { Metadata } from "next";
import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/layout";
import { ContactCard } from "@/components/store/legal";
import { COMPANY } from "@/lib/company";
import { LEGAL_PAGES } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms & Policies",
  description: `Terms, privacy, refund, shipping and other policies of ${COMPANY.legalName}.`,
};

export default function PoliciesPage() {
  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-medium tracking-[0.25em] text-accent uppercase">Vevvion</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">Terms &amp; Policies</h1>
        <p className="mt-3 text-fg-muted">Everything you need to know about shopping with {COMPANY.legalName}.</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="grid gap-3 sm:grid-cols-2">
          {LEGAL_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/policies/${p.slug}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/60 hover:bg-surface-2"
              >
                <FileText className="size-5 text-accent" />
                <h2 className="mt-3 font-display text-lg font-semibold text-fg-strong">{p.title}</h2>
                <p className="mt-1 flex-1 text-sm text-fg-muted">{p.summary}</p>
                <span className="mt-4 flex items-center gap-1 text-sm font-medium text-accent">
                  Read <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <ContactCard className="h-fit" />
      </div>
    </Container>
  );
}
