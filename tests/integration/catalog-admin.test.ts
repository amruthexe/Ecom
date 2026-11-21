import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { StaffUser } from "@/lib/permissions";
import { connectDB } from "@/server/db";
import { AuditLog } from "@/server/models/audit-log";
import { InventoryTransaction } from "@/server/models/inventory-transaction";
import { Product } from "@/server/models/product";
import { deleteCategory, saveCategory } from "@/server/services/categories";
import { deleteProduct, getProductForEdit, saveProduct, setProductStatus } from "@/server/services/products";

/**
 * Runs against an isolated database (MONGODB_DB_NAME=vevvion_test, set in vitest.config.ts).
 * Uses a fake actor object — no user accounts are created.
 */

const actor: StaffUser = { id: "test-actor", name: "Test", email: "test@example.invalid", role: "owner", permissions: [] };
let categoryId = "";
const IK = process.env.IMAGEKIT_URL_ENDPOINT ?? "https://ik.imagekit.io/x";

beforeAll(async () => {
  if (!process.env.MONGODB_DB_NAME?.endsWith("_test")) throw new Error("Refusing to run: MONGODB_DB_NAME must end with _test");
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([Product.syncIndexes(), InventoryTransaction.syncIndexes()]);
  const res = await saveCategory({ name: "Test Apparel" }, actor);
  if (!res.ok) throw new Error(JSON.stringify(res.errors));
  categoryId = res.id;
}, 60_000);

afterAll(async () => {
  if (process.env.MONGODB_DB_NAME?.endsWith("_test")) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const base = () => ({ name: "Test Tee", categoryId, status: "active", mrpRupees: 1499, salePriceRupees: 1199, deliveryRupees: 300, sku: "T-TEE", stock: 10 });

describe("product service", () => {
  let id = "";

  it("creates a product, derives slug/price and logs initial stock + audit", async () => {
    const r = await saveProduct(base(), actor);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    id = r.id;
    expect(r.slug).toBe("test-tee");
    const doc = await Product.findById(id).lean();
    expect(doc?.mrpPaise).toBe(149900);
    expect(doc?.pricePaise).toBe(119900);
    expect(doc?.salePricePaise).toBe(119900);
    expect(doc?.deliveryPaise).toBe(30000);
    expect(doc?.totalStock).toBe(10);
    const txns = await InventoryTransaction.find({ productId: id }).lean();
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ change: 10, balanceAfter: 10, reason: "initial" });
    expect(await AuditLog.countDocuments({ entityId: id, action: "product.create" })).toBe(1);
  });

  it("rejects a selling price above MRP", async () => {
    const r = await saveProduct({ ...base(), salePriceRupees: 1500 }, actor, id);
    expect(!r.ok && r.errors.salePriceRupees).toBe("Selling price can't be more than MRP");
  });

  it("updates selling price (paise allowed) and stock, recording a manual adjustment", async () => {
    const r = await saveProduct({ ...base(), salePriceRupees: 749.5, stock: 7 }, actor, id);
    expect(r.ok).toBe(true);
    const doc = await Product.findById(id).lean();
    expect(doc?.pricePaise).toBe(74950); // exactly what the owner typed
    const adj = await InventoryTransaction.findOne({ productId: id, reason: "manual_adjust" }).lean();
    expect(adj).toMatchObject({ change: -3, balanceAfter: 7 });
  });

  it("gives a second product with the same name a unique slug", async () => {
    const r = await saveProduct({ ...base(), sku: "T-TEE-2" }, actor);
    expect(r.ok && r.slug).toBe("test-tee-2");
  });

  it("rejects duplicate SKUs across products", async () => {
    const r = await saveProduct({ ...base(), name: "Other", sku: "T-TEE" }, actor);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.sku).toMatch(/already used/);
  });

  it("rejects explicit slugs that are taken", async () => {
    const r = await saveProduct({ ...base(), name: "Other", sku: "T-OTHER", slug: "test-tee" }, actor);
    expect(!r.ok && r.errors.slug).toBeTruthy();
  });

  it("rejects images not hosted on our ImageKit endpoint", async () => {
    const r = await saveProduct({ ...base(), sku: "T-IMG", images: [{ url: "https://evil.example.com/x.png", alt: "" }] }, actor);
    expect(!r.ok && r.errors.images).toBeTruthy();
    const ok = await saveProduct({ ...base(), name: "With image", sku: "T-IMG", images: [{ url: `${IK}/vevvion/products/a.jpg`, alt: "front" }] }, actor);
    expect(ok.ok).toBe(true);
  });

  it("rejects a non-existent category", async () => {
    const r = await saveProduct({ ...base(), sku: "T-CAT", categoryId: "0".repeat(24) }, actor);
    expect(!r.ok && r.errors.categoryId).toBeTruthy();
  });

  it("handles variants: totals stock, round-trips for editing, logs removed variants", async () => {
    const r = await saveProduct(
      {
        ...base(),
        name: "Variant Tee",
        sku: "T-VAR",
        options: [{ name: "Size", values: ["S", "M"] }],
        variants: [
          { sku: "T-VAR-S", options: { Size: "S" }, stock: 4 },
          { sku: "T-VAR-M", options: { Size: "M" }, stock: 6, mrpRupees: 1999 },
        ],
      },
      actor,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const doc = await Product.findById(r.id).lean();
    expect(doc?.totalStock).toBe(10);
    expect(doc?.stock).toBe(0);
    expect(doc?.pricePaise).toBe(119900); // cheapest: S at 1499 −20%

    const form = await getProductForEdit(r.id);
    expect(form?.variants?.map((v) => v.options.Size)).toEqual(["S", "M"]);
    expect(form?.variants?.[1].mrpRupees).toBe(1999);

    // Drop the M variant → a −6 adjustment is recorded
    const keep = form!.variants!.filter((v) => v.options.Size === "S");
    const r2 = await saveProduct({ ...form!, options: [{ name: "Size", values: ["S"] }], variants: keep }, actor, r.id);
    expect(r2.ok).toBe(true);
    const removed = await InventoryTransaction.findOne({ productId: r.id, note: "Variant removed" }).lean();
    expect(removed).toMatchObject({ change: -6, sku: "T-VAR-M" });
  });

  it("changes status and deletes", async () => {
    expect(await setProductStatus(id, "archived", actor)).toBe(true);
    expect((await Product.findById(id).lean())?.status).toBe("archived");
    expect(await deleteProduct(id, actor)).toBe(true);
    expect(await Product.exists({ _id: id })).toBeNull();
    expect(await deleteProduct("not-an-id", actor)).toBe(false);
  });
});

describe("category service", () => {
  it("refuses to delete a category that still has products", async () => {
    const r = await deleteCategory(categoryId, actor);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/Move or delete/);
  });

  it("rejects duplicate category slugs and deletes empty categories", async () => {
    const dup = await saveCategory({ name: "Test Apparel" }, actor);
    expect(!dup.ok && dup.errors.slug).toBeTruthy();
    const empty = await saveCategory({ name: "Empty One" }, actor);
    expect(empty.ok).toBe(true);
    if (empty.ok) expect((await deleteCategory(empty.id, actor)).ok).toBe(true);
  });
});
