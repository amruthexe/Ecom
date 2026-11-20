import { ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { LEGAL_PAGES, type LegalPage } from "@/lib/legal";
import { cn } from "@/lib/utils";

/** Renders a policy's sections as readable prose. */
export function LegalBody({ page }: { page: LegalPage }) {
  return (
    <div className="space-y-8">
      {page.sections.map((s, i) => (
        <section key={i} className="space-y-4">
          {s.heading && <h2 className="font-display text-xl font-semibold text-fg-strong">{s.heading}</h2>}
          {s.blocks.map((b, j) =>
            typeof b === "string" ? (
              <p key={j} className="leading-7 text-fg">
                {b}
              </p>
            ) : (
              <ul key={j} className="ml-5 list-disc space-y-2 leading-7 text-fg marker:text-accent">
                {b.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </div>
  );
}

/** Side navigation between policies (stacks above the text on phones). */
export function PolicyNav({ current }: { current?: string }) {
  return (
    <nav aria-label="Policies" className="rounded-xl border border-border bg-surface p-2">
      <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.18em] text-fg-muted uppercase">Policies</p>
      <ul>
        {LEGAL_PAGES.map((p) => {
          const active = p.slug === current;
          return (
            <li key={p.slug}>
              <Link
                href={`/policies/${p.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-accent/10 font-medium text-fg-strong" : "text-fg hover:bg-surface-2 hover:text-fg-strong",
                )}
              >
                {p.title}
                <ChevronRight className={cn("size-4", active ? "text-accent" : "text-fg-muted")} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Company contact block (About page, policy pages). */
export function ContactCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5", className)}>
      <h2 className="font-display text-lg font-semibold text-fg-strong">Contact us</h2>
      <ul className="mt-4 space-y-3 text-sm text-fg">
        <li className="flex gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
          <address className="not-italic">
            <span className="font-medium text-fg-strong">{COMPANY.legalName}</span>
            {COMPANY.addressLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </address>
        </li>
        <li className="flex items-center gap-3">
          <Mail className="size-4 shrink-0 text-accent" />
          <a href={`mailto:${COMPANY.email}`} className="hover:text-fg-strong hover:underline">
            {COMPANY.email}
          </a>
        </li>
        <li className="flex items-center gap-3">
          <Phone className="size-4 shrink-0 text-accent" />
          <a href={COMPANY.phoneHref} className="hover:text-fg-strong hover:underline">
            Client support: {COMPANY.phoneDisplay}
          </a>
        </li>
      </ul>
    </div>
  );
}
