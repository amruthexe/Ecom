import type { Metadata } from "next";
import { ChevronRight, FolderTree, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Alert, PageHeader } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { ProductArt } from "@/components/store/product-art";
import { requireStaffPage } from "@/server/auth";
import { listAdminCategories } from "@/server/services/categories";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireStaffPage("categories");
  const [categories, sp] = await Promise.all([listAdminCategories(), searchParams]);

  return (
    <>
      <PageHeader
        title="Categories"
        description={`${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}
        actions={
          <Link href="/admin/categories/new" className={buttonClasses("primary")}>
            <Plus className="size-4" /> Add category
          </Link>
        }
      />
      {sp.saved && <Alert tone="success">Category saved.</Alert>}
      {sp.deleted && <Alert tone="success">Category deleted.</Alert>}

      {categories.length === 0 ? (
        <EmptyState icon={<FolderTree className="size-10" />} title="No categories yet" description="Create categories to organise your products." />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/categories/${c.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-border-strong">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border">
                  {c.imageUrl ? <Image src={c.imageUrl} alt="" fill sizes="56px" className="object-cover" /> : <ProductArt seed={`cat-${c.slug}`} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium text-fg-strong">{c.name}</span>
                    {!c.isActive && <span className="rounded-full border border-border px-2 text-[10px] text-fg-muted">Hidden</span>}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {c.productCount} product{c.productCount === 1 ? "" : "s"} · /{c.slug}
                  </span>
                </span>
                <ChevronRight className="size-4 text-fg-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
