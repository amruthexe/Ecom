import "server-only";
import { Types } from "mongoose";
import type { StaffUser } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import { categoryInputSchema, fieldErrors, type CategoryInput } from "@/lib/validators/product";
import { audit } from "../audit";
import { connectDB } from "../db";
import { deleteImageKitFiles, isOwnImageUrl } from "../imagekit";
import { Category, type CategoryDoc } from "../models/category";
import { Product } from "../models/product";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
};

export async function listAdminCategories(): Promise<CategoryRow[]> {
  await connectDB();
  const [cats, counts] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean<CategoryDoc[]>(),
    Product.aggregate<{ _id: Types.ObjectId; n: number }>([{ $group: { _id: "$categoryId", n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  return cats.map((c) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.image?.url,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    productCount: byId.get(String(c._id)) ?? 0,
  }));
}

/** Minimal list for selects. */
export async function listCategoryOptions(): Promise<{ id: string; name: string }[]> {
  await connectDB();
  const cats = await Category.find({}, { name: 1 }).sort({ sortOrder: 1, name: 1 }).lean();
  return cats.map((c) => ({ id: String(c._id), name: c.name }));
}

export type CategoryFormValues = CategoryInput & { id?: string; productCount?: number };

export async function getCategoryForEdit(id: string): Promise<CategoryFormValues | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const c = await Category.findById(id).lean<CategoryDoc>();
  if (!c) return null;
  return {
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image ? { url: c.image.url, fileId: c.image.fileId, alt: c.image.alt } : null,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    productCount: await Product.countDocuments({ categoryId: c._id }),
  };
}

export type CategorySaveResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

export async function saveCategory(raw: unknown, actor: StaffUser, id?: string): Promise<CategorySaveResult> {
  const parsed = categoryInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;
  if (id && !Types.ObjectId.isValid(id)) return { ok: false, errors: { _form: "Category not found" } };
  if (input.image && !isOwnImageUrl(input.image.url)) return { ok: false, errors: { image: "Upload images through the uploader" } };

  await connectDB();
  const slug = input.slug || slugify(input.name);
  if (!slug) return { ok: false, errors: { slug: "Enter a URL slug" } };
  if (await Category.exists({ slug, ...(id ? { _id: { $ne: id } } : {}) })) {
    return { ok: false, errors: { slug: "Another category already uses this URL" } };
  }

  const existing = id ? await Category.findById(id) : null;
  if (id && !existing) return { ok: false, errors: { _form: "Category not found" } };
  const oldFileId = existing?.image?.fileId;

  const doc = existing ?? new Category();
  doc.set({ name: input.name, slug, description: input.description, sortOrder: input.sortOrder, isActive: input.isActive });
  doc.set("image", input.image ?? undefined);
  await doc.save();

  await audit(actor, {
    action: existing ? "category.update" : "category.create",
    entity: "category",
    entityId: String(doc._id),
    summary: `${existing ? "Updated" : "Created"} category “${doc.name}”`,
  });
  if (oldFileId && oldFileId !== input.image?.fileId) await deleteImageKitFiles([oldFileId]);
  return { ok: true, id: String(doc._id) };
}

export type DeleteCategoryResult = { ok: true } | { ok: false; error: string };

/** Safe delete: refuses while any product still belongs to the category. */
export async function deleteCategory(id: string, actor: StaffUser): Promise<DeleteCategoryResult> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Category not found" };
  await connectDB();
  const count = await Product.countDocuments({ categoryId: id });
  if (count > 0) return { ok: false, error: `Move or delete its ${count} product${count === 1 ? "" : "s"} first.` };
  const doc = await Category.findByIdAndDelete(id);
  if (!doc) return { ok: false, error: "Category not found" };
  await audit(actor, { action: "category.delete", entity: "category", entityId: id, summary: `Deleted category “${doc.name}”` });
  if (doc.image?.fileId) await deleteImageKitFiles([doc.image.fileId]);
  return { ok: true };
}
