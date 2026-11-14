"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ProductStatus } from "@/lib/types";
import { AuthorizationError, requireStaff } from "../auth";
import { CATALOG_TAG } from "../catalog";
import { deleteCategory, saveCategory } from "../services/categories";
import { deleteProduct, saveProduct, setProductStatus } from "../services/products";

/**
 * Admin catalog mutations. Each action: authorize → validate (in service) → write → refresh storefront cache.
 */

export type FormState = { errors?: Record<string, string> };

async function authorize(permission: "products" | "categories") {
  try {
    return { user: await requireStaff(permission) };
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: e.message };
    throw e;
  }
}

function readPayload(formData: FormData): unknown {
  try {
    return JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return null;
  }
}

const idOf = (formData: FormData) => String(formData.get("id") ?? "") || undefined;

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorize("products");
  if ("error" in auth) return { errors: { _form: auth.error! } };
  const payload = readPayload(formData);
  if (!payload) return { errors: { _form: "Could not read the form. Please try again." } };

  const result = await saveProduct(payload, auth.user, idOf(formData));
  if (!result.ok) return { errors: result.errors };
  updateTag(CATALOG_TAG);
  redirect(`/admin/products/${result.id}?saved=1`);
}

const STATUSES: ProductStatus[] = ["draft", "active", "archived"];

export async function setProductStatusAction(formData: FormData): Promise<void> {
  const auth = await authorize("products");
  if ("error" in auth) redirect("/admin/login");
  const id = idOf(formData);
  const status = String(formData.get("status")) as ProductStatus;
  if (!id || !STATUSES.includes(status)) return;
  await setProductStatus(id, status, auth.user);
  updateTag(CATALOG_TAG);
  redirect(`/admin/products/${id}?saved=1`);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const auth = await authorize("products");
  if ("error" in auth) redirect("/admin/login");
  const id = idOf(formData);
  if (id) await deleteProduct(id, auth.user);
  updateTag(CATALOG_TAG);
  redirect("/admin/products?deleted=1");
}

export async function saveCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorize("categories");
  if ("error" in auth) return { errors: { _form: auth.error! } };
  const payload = readPayload(formData);
  if (!payload) return { errors: { _form: "Could not read the form. Please try again." } };

  const result = await saveCategory(payload, auth.user, idOf(formData));
  if (!result.ok) return { errors: result.errors };
  updateTag(CATALOG_TAG);
  redirect(`/admin/categories?saved=1`);
}

export async function deleteCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorize("categories");
  if ("error" in auth) return { errors: { _form: auth.error! } };
  const id = idOf(formData);
  if (!id) return { errors: { _form: "Category not found" } };
  const result = await deleteCategory(id, auth.user);
  if (!result.ok) return { errors: { _form: result.error } };
  updateTag(CATALOG_TAG);
  redirect("/admin/categories?deleted=1");
}
