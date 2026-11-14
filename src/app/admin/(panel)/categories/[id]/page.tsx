import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import { PageHeader } from "@/components/admin/ui";
import { requireStaffPage } from "@/server/auth";
import { getCategoryForEdit } from "@/server/services/categories";

// Admin pages always check the signed-in user on the server before rendering, so they block by design.
export const instant = false;

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  await requireStaffPage("categories");
  const category = await getCategoryForEdit((await params).id);
  if (!category) notFound();
  return (
    <>
      <PageHeader title={category.name} />
      <CategoryForm initial={category} />
    </>
  );
}
