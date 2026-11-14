import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { catalogHref, type CatalogQuery } from "@/lib/validators/catalog";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SortSelect } from "./sort-select";

/**
 * Filters render as plain links + a GET form, so they work before JS loads.
 * `basePath` lets category pages reuse them (category is then implied by the path).
 */
export function CatalogFilters({
  query,
  categories,
  basePath = "/products",
  lockCategory = false,
}: {
  query: CatalogQuery;
  categories: Category[];
  basePath?: string;
  lockCategory?: boolean;
}) {
  const filters = (
    <div className="space-y-8">
      {!lockCategory && (
        <div>
          <h3 className="mb-3 text-xs font-medium tracking-[0.2em] text-fg-strong uppercase">Category</h3>
          <ul className="space-y-1">
            <CategoryLink href={catalogHref({ ...query, category: undefined, page: 1 }, basePath)} active={!query.category}>
              All
            </CategoryLink>
            {categories.map((c) => (
              <CategoryLink key={c.id} href={catalogHref({ ...query, category: c.slug, page: 1 }, basePath)} active={query.category === c.slug}>
                {c.name}
              </CategoryLink>
            ))}
          </ul>
        </div>
      )}
      <form action={basePath} className="space-y-3">
        <h3 className="text-xs font-medium tracking-[0.2em] text-fg-strong uppercase">Price (₹)</h3>
        {query.q && <input type="hidden" name="q" value={query.q} />}
        {query.category && !lockCategory && <input type="hidden" name="category" value={query.category} />}
        {query.sort !== "newest" && <input type="hidden" name="sort" value={query.sort} />}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="min">Min</Label>
            <Input id="min" name="min" type="number" min={0} inputMode="numeric" defaultValue={query.min} placeholder="0" />
          </div>
          <div>
            <Label htmlFor="max">Max</Label>
            <Input id="max" name="max" type="number" min={0} inputMode="numeric" defaultValue={query.max} placeholder="Any" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className={buttonClasses("secondary", "sm", "flex-1")}>
            Apply
          </button>
          {(query.min !== undefined || query.max !== undefined) && (
            <Link href={catalogHref({ ...query, min: undefined, max: undefined, page: 1 }, basePath)} className={buttonClasses("ghost", "sm")}>
              Clear
            </Link>
          )}
        </div>
      </form>
    </div>
  );

  return (
    <>
      {/* Mobile: collapsible, no JS needed */}
      <details className="group rounded-lg border border-border bg-surface lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm text-fg-strong">
          <SlidersHorizontal className="size-4" /> Filters
          <span className="ml-auto text-xs text-fg-muted group-open:hidden">Show</span>
          <span className="ml-auto hidden text-xs text-fg-muted group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-border p-4">{filters}</div>
      </details>
      <aside className="hidden lg:block">{filters}</aside>
    </>
  );
}

function CategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
          active ? "bg-accent/10 text-fg-strong" : "text-fg-muted hover:bg-surface-2 hover:text-fg-strong",
        )}
      >
        {children}
      </Link>
    </li>
  );
}

export function CatalogToolbar({ total, query, basePath = "/products" }: { total: number; query: CatalogQuery; basePath?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-fg-muted">
        {total} {total === 1 ? "product" : "products"}
        {query.q && (
          <>
            {" "}
            for <span className="text-fg-strong">&ldquo;{query.q}&rdquo;</span>
          </>
        )}
      </p>
      <SortSelect query={query} basePath={basePath} />
    </div>
  );
}

export function Pagination({ page, pages, query, basePath = "/products" }: { page: number; pages: number; query: CatalogQuery; basePath?: string }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav className="mt-12 flex items-center justify-center gap-1" aria-label="Pagination">
      <PageLink href={catalogHref({ ...query, page: page - 1 }, basePath)} disabled={page <= 1} label="Previous page">
        <ChevronLeft className="size-4" />
      </PageLink>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-fg-muted">…</span>}
          <PageLink href={catalogHref({ ...query, page: n }, basePath)} active={n === page} label={`Page ${n}`}>
            {n}
          </PageLink>
        </span>
      ))}
      <PageLink href={catalogHref({ ...query, page: page + 1 }, basePath)} disabled={page >= pages} label="Next page">
        <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({ href, children, active, disabled, label }: { href: string; children: React.ReactNode; active?: boolean; disabled?: boolean; label: string }) {
  const cls = cn(
    "grid h-9 min-w-9 place-items-center rounded-md border px-2 text-sm tabular-nums",
    active ? "border-accent bg-accent/10 text-fg-strong" : "border-border text-fg hover:border-border-strong",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled) return <span className={cls} aria-hidden>{children}</span>;
  return (
    <Link href={href} className={cls} aria-label={label} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
