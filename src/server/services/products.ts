import "server-only";
import { priceOf } from "@/lib/catalog";
import mongoose, { Types } from "mongoose";
import type { StaffUser } from "@/lib/permissions";
import type { ProductStatus } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { fieldErrors, productInputSchema, type ProductInput } from "@/lib/validators/product";
import { audit } from "../audit";
import { connectDB } from "../db";
import { deleteImageKitFiles, isOwnImageUrl } from "../imagekit";
import { Category } from "../models/category";
import { InventoryTransaction, type InventoryTransactionDoc } from "../models/inventory-transaction";
import { Product, type ProductDoc } from "../models/product";

export type SaveResult = { ok: true; id: string; slug: string } | { ok: false; errors: Record<string, string> };

const toPaise = (rupees: number) => Math.round(rupees * 100);
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function isDuplicateKey(e: unknown): e is { code: 11000; keyPattern?: Record<string, unknown> } {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base.slice(0, 90) || "product";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await Product.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!clash) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Create (no id) or update a product. Validates, keeps stock history, audits, and cleans up removed images. */
export async function saveProduct(raw: unknown, actor: StaffUser, id?: string): Promise<SaveResult> {
  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;
  if (id && !Types.ObjectId.isValid(id)) return { ok: false, errors: { _form: "Product not found" } };

  await connectDB();

  if (!(await Category.exists({ _id: input.categoryId }))) return { ok: false, errors: { categoryId: "Category not found" } };
  const badImage = input.images.findIndex((img) => !isOwnImageUrl(img.url));
  if (badImage >= 0) return { ok: false, errors: { images: "Images must be uploaded through the uploader" } };

  // Slug: explicit slugs must be free; auto slugs get a numeric suffix.
  let slug: string;
  if (input.slug) {
    if (await Product.exists({ slug: input.slug, ...(id ? { _id: { $ne: id } } : {}) })) {
      return { ok: false, errors: { slug: "This URL is already used by another product" } };
    }
    slug = input.slug;
  } else {
    slug = await uniqueSlug(slugify(input.name), id);
  }

  // SKUs must be unique across all products.
  const allSkus = [input.sku, ...input.variants.map((v) => v.sku)];
  const skuClash = await Product.findOne(
    { ...(id ? { _id: { $ne: id } } : {}), $or: [{ sku: { $in: allSkus } }, { "variants.sku": { $in: allSkus } }] },
    { name: 1 },
  ).lean();
  if (skuClash) return { ok: false, errors: { sku: `SKU already used by “${skuClash.name}”` } };

  const hasVariants = input.options.length > 0;
  const variants = hasVariants
    ? input.variants.map((v) => ({
        _id: v.id ? new Types.ObjectId(v.id) : new Types.ObjectId(),
        sku: v.sku,
        options: v.options,
        stock: v.stock,
        mrpPaise: v.mrpRupees !== undefined ? toPaise(v.mrpRupees) : undefined,
      }))
    : [];

  const fields = {
    name: input.name,
    slug,
    shortDescription: input.shortDescription,
    description: input.description,
    categoryId: new Types.ObjectId(input.categoryId),
    tags: [...new Set(input.tags)],
    images: input.images,
    mrpPaise: toPaise(input.mrpRupees),
    salePricePaise: toPaise(input.salePriceRupees),
    deliveryPaise: toPaise(input.deliveryRupees),
    sku: input.sku,
    stock: hasVariants ? 0 : input.stock,
    options: input.options,
    variants,
    status: input.status,
    isFeatured: input.isFeatured,
  };

  let removedFileIds: string[] = [];
  let savedId = id ?? "";
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const existing = id ? await Product.findById(id).session(session) : null;
      if (id && !existing) throw new NotFoundError();

      // Stock before/after per stock-keeping unit, keyed by variant id (or "base").
      const before = new Map<string, { sku: string; stock: number }>();
      if (existing) {
        if (existing.variants.length) existing.variants.forEach((v) => before.set(String(v._id), { sku: v.sku, stock: v.stock }));
        else before.set("base", { sku: existing.sku, stock: existing.stock });
        removedFileIds = existing.images
          .map((i) => i.fileId)
          .filter((fid): fid is string => !!fid && !input.images.some((n) => n.fileId === fid));
      }

      const doc = existing ?? new Product();
      doc.set(fields);
      await doc.save({ session });
      savedId = String(doc._id);

      const after = new Map<string, { sku: string; stock: number; variantId?: Types.ObjectId }>();
      if (doc.variants.length) doc.variants.forEach((v) => after.set(String(v._id), { sku: v.sku, stock: v.stock, variantId: v._id }));
      else after.set("base", { sku: doc.sku, stock: doc.stock });

      const txns: Omit<InventoryTransactionDoc, "_id" | "createdAt">[] = [];
      for (const [key, now] of after) {
        const prev = before.get(key)?.stock ?? 0;
        const change = now.stock - prev;
        if (change !== 0) {
          txns.push({
            productId: doc._id,
            variantId: now.variantId,
            sku: now.sku,
            change,
            balanceAfter: now.stock,
            reason: existing && before.has(key) ? "manual_adjust" : "initial",
            actorId: actor.id,
          });
        }
      }
      for (const [key, old] of before) {
        if (!after.has(key) && old.stock !== 0) {
          txns.push({ productId: doc._id, sku: old.sku, change: -old.stock, balanceAfter: 0, reason: "manual_adjust", actorId: actor.id, note: "Variant removed" });
        }
      }
      if (txns.length) await InventoryTransaction.create(txns, { session, ordered: true });

      await audit(
        actor,
        {
          action: existing ? "product.update" : "product.create",
          entity: "product",
          entityId: savedId,
          summary: `${existing ? "Updated" : "Created"} product “${doc.name}”`,
          changes: existing
            ? { mrpPaise: [existing.mrpPaise, doc.mrpPaise], salePricePaise: [existing.salePricePaise, doc.salePricePaise], deliveryPaise: [existing.deliveryPaise, doc.deliveryPaise], status: [existing.status, doc.status] }
            : undefined,
        },
        session,
      );
    });
  } catch (e) {
    if (e instanceof NotFoundError) return { ok: false, errors: { _form: "Product not found" } };
    if (isDuplicateKey(e)) {
      const field = Object.keys(e.keyPattern ?? {})[0] ?? "";
      return { ok: false, errors: field.includes("slug") ? { slug: "URL already in use" } : { sku: "SKU already in use" } };
    }
    throw e;
  } finally {
    await session.endSession();
  }

  await deleteImageKitFiles(removedFileIds);
  return { ok: true, id: savedId, slug };
}

class NotFoundError extends Error {}

export async function setProductStatus(id: string, status: ProductStatus, actor: StaffUser): Promise<boolean> {
  if (!Types.ObjectId.isValid(id)) return false;
  await connectDB();
  const doc = await Product.findByIdAndUpdate(id, { status }, { returnDocument: "after" });
  if (!doc) return false;
  await audit(actor, { action: "product.status", entity: "product", entityId: id, summary: `Set “${doc.name}” to ${status}` });
  return true;
}

/**
 * Permanently deletes a product and its images.
 * TODO(Phase 10): once orders exist, refuse when the product appears in any order (archive instead).
 */
export async function deleteProduct(id: string, actor: StaffUser): Promise<boolean> {
  if (!Types.ObjectId.isValid(id)) return false;
  await connectDB();
  const doc = await Product.findByIdAndDelete(id);
  if (!doc) return false;
  await audit(actor, { action: "product.delete", entity: "product", entityId: id, summary: `Deleted product “${doc.name}” (${doc.sku})` });
  await deleteImageKitFiles(doc.images.map((i) => i.fileId).filter((f): f is string => !!f));
  return true;
}

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: ProductStatus;
  pricePaise: number;
  mrpPaise: number;
  deliveryPaise: number;
  totalStock: number;
  variantCount: number;
  imageUrl?: string;
  categoryName: string;
  updatedAt: string;
};

export const ADMIN_PAGE_SIZE = 20;

export async function listAdminProducts(params: { q?: string; status?: ProductStatus | "all"; page?: number; stock?: "low" | "out" }) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (params.status && params.status !== "all") filter.status = params.status;
  if (params.stock === "low") filter.totalStock = { $gt: 0, $lte: 5 };
  if (params.stock === "out") filter.totalStock = 0;
  if (params.q) {
    const rx = new RegExp(escapeRegex(params.q.slice(0, 80)), "i");
    filter.$or = [{ name: rx }, { sku: rx }, { "variants.sku": rx }, { tags: rx }];
  }
  const page = Math.max(1, params.page ?? 1);
  const [docs, total, categories] = await Promise.all([
    Product.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * ADMIN_PAGE_SIZE).limit(ADMIN_PAGE_SIZE).lean(),
    Product.countDocuments(filter),
    Category.find({}, { name: 1 }).lean(),
  ]);
  const catName = new Map(categories.map((c) => [String(c._id), c.name]));
  const rows: AdminProductRow[] = docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    sku: d.sku,
    status: d.status,
    pricePaise: d.pricePaise,
    mrpPaise: d.mrpPaise,
    deliveryPaise: d.deliveryPaise ?? 0,
    totalStock: d.totalStock,
    variantCount: d.variants.length,
    imageUrl: d.images[0]?.url,
    categoryName: catName.get(String(d.categoryId)) ?? "—",
    updatedAt: d.updatedAt.toISOString(),
  }));
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

export type ProductFormValues = ProductInput & { id?: string };

/** Loads a product shaped for the admin form (rupees, string ids). */
export async function getProductForEdit(id: string): Promise<ProductFormValues | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const d = await Product.findById(id).lean<ProductDoc>();
  if (!d) return null;
  return {
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    shortDescription: d.shortDescription,
    description: d.description,
    categoryId: String(d.categoryId),
    tags: d.tags,
    status: d.status,
    isFeatured: d.isFeatured,
    mrpRupees: d.mrpPaise / 100,
    // Older products have no stored selling price: show the price customers currently pay.
    salePriceRupees: priceOf({ mrpPaise: d.mrpPaise, salePricePaise: d.salePricePaise ?? undefined, discountPercent: d.discountPercent }).pricePaise / 100,
    deliveryRupees: (d.deliveryPaise ?? 0) / 100,
    sku: d.sku,
    stock: d.stock,
    options: d.options.map((o) => ({ name: o.name, values: [...o.values] })),
    variants: d.variants.map((v) => ({
      id: String(v._id),
      sku: v.sku,
      options: v.options instanceof Map ? Object.fromEntries(v.options) : { ...v.options },
      stock: v.stock,
      mrpRupees: v.mrpPaise !== undefined && v.mrpPaise !== null ? v.mrpPaise / 100 : undefined,
    })),
    images: d.images.map((i) => ({ url: i.url, fileId: i.fileId, alt: i.alt, width: i.width, height: i.height })),
  };
}

export async function getDashboardStats() {
  await connectDB();
  const [total, active, draft, archived, lowStock, outOfStock, categories, lowStockItems, recent] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ status: "active" }),
    Product.countDocuments({ status: "draft" }),
    Product.countDocuments({ status: "archived" }),
    Product.countDocuments({ status: { $ne: "archived" }, totalStock: { $gt: 0, $lte: 5 } }),
    Product.countDocuments({ status: { $ne: "archived" }, totalStock: 0 }),
    Category.countDocuments({}),
    Product.find({ status: { $ne: "archived" }, totalStock: { $lte: 5 } }, { name: 1, sku: 1, totalStock: 1 }).sort({ totalStock: 1 }).limit(6).lean(),
    Product.find({}, { name: 1, status: 1, updatedAt: 1, pricePaise: 1 }).sort({ updatedAt: -1 }).limit(5).lean(),
  ]);
  return {
    total,
    active,
    draft,
    archived,
    lowStock,
    outOfStock,
    categories,
    lowStockItems: lowStockItems.map((p) => ({ id: String(p._id), name: p.name, sku: p.sku, stock: p.totalStock })),
    recent: recent.map((p) => ({ id: String(p._id), name: p.name, status: p.status, pricePaise: p.pricePaise, updatedAt: p.updatedAt.toISOString() })),
  };
}
