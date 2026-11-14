import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDangerZone } from "@/components/admin/product-actions";
import { ProductForm } from "@/components/admin/product-form";
import { Alert, PageHeader, StatusBadge } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireStaffPage } from "@/server/auth";
import { listCategoryOptions } from "@/server/services/categories";
import { getProductForEdit } from "@/server/services/products";

// Admin pages always check the signed-in user on the server before rendering, so they block by design.
export const instant = false;

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireStaffPage("products");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, categories] = await Promise.all([getProductForEdit(id), listCategoryOptions()]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        description={product.sku}
        actions={
          <>
            <StatusBadge status={product.status} />
            {product.status === "active" && (
              <Link href={`/products/${product.slug}`} target="_blank" className={buttonClasses("secondary", "sm")}>
                <ExternalLink className="size-4" /> View in store
              </Link>
            )}
          </>
        }
      />
      {sp.saved && <Alert tone="success">Saved. Changes are live in the store{product.status !== "active" ? " once the product is Active" : ""}.</Alert>}
      <ProductForm key={JSON.stringify(product)} initial={product} categories={categories} />
      <ProductDangerZone id={product.id!} name={product.name} status={product.status} />
    </>
  );
}
