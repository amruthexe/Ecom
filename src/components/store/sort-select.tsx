"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { catalogHref, SORT_OPTIONS, type CatalogQuery, type SortValue } from "@/lib/validators/catalog";

export function SortSelect({ query, basePath }: { query: CatalogQuery; basePath: string }) {
  const router = useRouter();
  return (
    <div className="relative">
      <label htmlFor="sort" className="sr-only">
        Sort by
      </label>
      <select
        id="sort"
        value={query.sort}
        onChange={(e) => router.push(catalogHref({ ...query, sort: e.target.value as SortValue, page: 1 }, basePath))}
        className="h-9 cursor-pointer appearance-none rounded-md border border-border bg-surface pr-8 pl-3 text-sm text-fg-strong hover:border-border-strong focus:border-accent focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-fg-muted" />
    </div>
  );
}
