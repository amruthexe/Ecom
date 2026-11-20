import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/layout";
import { ContactCard, LegalBody, PolicyNav } from "@/components/store/legal";
import { COMPANY } from "@/lib/company";
import { getLegalPage, LEGAL_PAGES } from "@/lib/legal";

// Policies are fixed text: every page is built ahead of time.
export function generateStaticParams() {
  return LEGAL_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const page = getLegalPage((await params).slug);
  return page ? { title: page.title, description: `${page.summary} — ${COMPANY.legalName}` } : { title: "Policy not found" };
}

export default async function PolicyPage({ params }: PageProps<"/policies/[slug]">) {
  const page = getLegalPage((await params).slug);
  if (!page) notFound();
  return (
    <Container className="py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-fg-muted">
        <Link href="/" className="hover:text-fg-strong">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href="/policies" className="hover:text-fg-strong">
          Policies
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-fg-strong">{page.title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
        <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
          <PolicyNav current={page.slug} />
        </aside>
        <article className="max-w-3xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">{page.title}</h1>
          <p className="mt-2 text-sm text-fg-muted">{COMPANY.legalName}</p>
          <div className="mt-8">
            <LegalBody page={page} />
          </div>
          <ContactCard className="mt-12" />
        </article>
      </div>
    </Container>
  );
}
