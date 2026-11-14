import type { Metadata } from "next";
import { CategoryForm } from "@/components/admin/category-form";
import { PageHeader } from "@/components/admin/ui";
import { requireStaffPage } from "@/server/auth";

// Admin pages always check the signed-in user on the server before rendering, so they block by design.
export const instant = false;

export const metadata: Metadata = { title: "Add category" };

export default async function NewCategoryPage() {
  await requireStaffPage("categories");
  return (
    <>
      <PageHeader title="Add category" />
      <CategoryForm />
    </>
  );
}
