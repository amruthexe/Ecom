import type { Metadata } from "next";
import { Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Container, EmptyState, Skeleton } from "@/components/ui/layout";
import { CatalogFilters, CatalogToolbar, Pagination } from "@/components/store/catalog-controls";
import { ProductGrid } from "@/components/store/product-card";
import { ProductGridSkeleton } from "@/components/store/product-card-skeleton";
import { listCategories, queryProducts } from "@/server/catalog";
import { parseCatalogQuery } from "@/lib/validators/catalog";

export const metadata: Metadata = { title: "Shop all", description: "Explore Vevvion's full range of wellness essentials." };

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">Shop all</h1>
        <p className="mt-2 text-fg-muted">Explore our full range of wellness essentials.</p>
      </header>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Catalog({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const query = parseCatalogQuery(await searchParams);
  const [categories, result] = await Promise.all([listCategories(), queryProducts(query)]);

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <CatalogFilters query={query} categories={categories} />
      <div>
        <CatalogToolbar total={result.total} query={query} />
        {result.items.length ? (
          <>
            <ProductGrid products={result.items} priorityCount={4} />
            <Pagination page={result.page} pages={result.pages} query={query} />
          </>
        ) : (
          <EmptyState
            icon={<Search className="size-10" />}
            title="No products found"
            description="Try a different search term or remove some filters."
            action={
              <Link href="/products" className={buttonClasses("secondary")}>
                Clear all filters
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <div className="hidden space-y-3 lg:block">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
      <div>
        <Skeleton className="mb-6 h-9 w-full max-w-xs" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
