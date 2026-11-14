import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader, inputCls } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { formatDate } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requireStaffPage } from "@/server/auth";
import { listCustomers } from "@/server/services/customers";

// Admin pages always check the signed-in user on the server before rendering, so they block by design.
export const instant = false;

export const metadata: Metadata = { title: "Customers" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireStaffPage("customers");
  const sp = await searchParams;
  const q = first(sp.q)?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const { rows, total, pages } = await listCustomers({ q, page });
  const href = (p: number) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <PageHeader title="Customers" description={`${total} registered customer${total === 1 ? "" : "s"}`} />
      <form action="/admin/customers" className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted" />
        <input name="q" type="search" defaultValue={q} placeholder="Name, email or phone" className={cn(inputCls, "pl-9")} aria-label="Search customers" />
      </form>
      {rows.length === 0 ? (
        <EmptyState icon={<Users className="size-10" />} title={q ? "No customers match" : "No customers yet"} description="Customers appear here when they create an account." />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/customers/${c.id}`} className="block rounded-lg border border-border bg-surface p-3 hover:border-border-strong sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg-strong">{c.name}</p>
                    <p className="truncate text-xs text-fg-muted">
                      {c.email}
                      {c.phone && ` · ${c.phone}`}
                    </p>
                  </div>
                  {c.status === "blocked" && <span className="rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-[11px] text-danger">Blocked</span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                  <span>
                    <span className="text-fg-strong">{c.orders}</span> order{c.orders === 1 ? "" : "s"}
                  </span>
                  <span>
                    Spent <span className="text-fg-strong">{formatPaise(c.spentPaise)}</span>
                  </span>
                  <span>Joined {formatDate(c.joinedAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          <Link href={href(page - 1)} className={cn(buttonClasses("secondary", "sm"), page <= 1 && "pointer-events-none opacity-40")}>
            <ChevronLeft className="size-4" /> Prev
          </Link>
          <span className="text-sm text-fg-muted">
            Page {page} of {pages}
          </span>
          <Link href={href(page + 1)} className={cn(buttonClasses("secondary", "sm"), page >= pages && "pointer-events-none opacity-40")}>
            Next <ChevronRight className="size-4" />
          </Link>
        </nav>
      )}
    </>
  );
}
