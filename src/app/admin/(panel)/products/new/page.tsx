import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { requireStaffPage } from "@/server/auth";
import { listCategoryOptions } from "@/server/services/categories";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireStaffPage("products");
  const categories = await listCategoryOptions();
  return (
    <>
      <PageHeader title="Add product" />
      <ProductForm categories={categories} />
    </>
  );
}
