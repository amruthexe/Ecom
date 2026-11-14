import type { Metadata } from "next";
import { Package } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Container, EmptyState, Skeleton } from "@/components/ui/layout";
import { CatalogFilters, CatalogToolbar, Pagination } from "@/components/store/catalog-controls";
import { ProductGrid } from "@/components/store/product-card";
import { ProductGridSkeleton } from "@/components/store/product-card-skeleton";
import { getCategory, listCategories, queryProducts } from "@/server/catalog";
import { parseCatalogQuery } from "@/lib/validators/catalog";

export async function generateStaticParams() {
  const categories = await listCategories();
  return categories.length ? categories.map((c) => ({ slug: c.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  return category ? { title: category.name, description: category.description } : { title: "Category not found" };
}

/** `params` is awaited inside <Suspense> so categories created in admin after the build work immediately. */
export default function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  return (
    <Container className="py-10 sm:py-14">
      <Suspense
        fallback={
          <div aria-busy="true">
            <Skeleton className="mb-3 h-3 w-24" />
            <Skeleton className="mb-8 h-10 w-64" />
            <ProductGridSkeleton />
          </div>
        }
      >
        <CategoryContent params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function CategoryContent({ params, searchParams }: Pick<PageProps<"/categories/[slug]">, "params" | "searchParams">) {
  const category = await getCategory((await params).slug);
  if (!category) notFound();

  return (
    <>
      <header className="mb-8">
        <p className="text-xs font-medium tracking-[0.25em] text-fg-muted uppercase">Category</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">{category.name}</h1>
        <p className="mt-2 max-w-xl text-fg-muted">{category.description}</p>
      </header>
      <Suspense fallback={<ProductGridSkeleton />}>
        <CategoryProducts slug={category.slug} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CategoryProducts({ slug, searchParams }: { slug: string; searchParams: PageProps<"/categories/[slug]">["searchParams"] }) {
  const query = { ...parseCatalogQuery(await searchParams), category: slug };
  const basePath = `/categories/${slug}`;
  const [categories, result] = await Promise.all([listCategories(), queryProducts(query)]);

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <CatalogFilters query={query} categories={categories} basePath={basePath} lockCategory />
      <div>
        <CatalogToolbar total={result.total} query={{ ...query, category: undefined }} basePath={basePath} />
        {result.items.length ? (
          <>
            <ProductGrid products={result.items} priorityCount={4} />
            <Pagination page={result.page} pages={result.pages} query={{ ...query, category: undefined }} basePath={basePath} />
          </>
        ) : (
          <EmptyState
            icon={<Package className="size-10" />}
            title="Nothing here yet"
            description="No products match these filters in this category."
            action={
              <Link href={basePath} className={buttonClasses("secondary")}>
                Clear filters
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
