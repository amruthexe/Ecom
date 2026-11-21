import { describe, expect, it } from "vitest";
import { applyDiscount, findVariant, fromPriceOf, hasVariablePricing, optionCombinations, priceOf, stockState, totalStock } from "@/lib/catalog";
import { hasPermission } from "@/lib/permissions";
import type { Product } from "@/lib/types";
import { catalogHref, parseCatalogQuery } from "@/lib/validators/catalog";
import { productInputSchema } from "@/lib/validators/product";

const base: Product = {
  id: "t1", slug: "t", name: "Test", shortDescription: "", description: "", categorySlug: "x", tags: [], images: [],
  mrpPaise: 149900, discountPercent: 20, deliveryPaise: 0, sku: "T", stock: 3, options: [], variants: [], isFeatured: false,
  soldCount: 0, ratingAvg: 0, ratingCount: 0, createdAt: "2026-01-01T00:00:00Z",
};

describe("selling price (owner enters MRP + selling price)", () => {
  const sp = { ...base, discountPercent: undefined, mrpPaise: 100000, salePricePaise: 89550 };
  it("uses the selling price exactly, to the paisa", () => {
    expect(priceOf(sp)).toEqual({ pricePaise: 89550, mrpPaise: 100000, onSale: true });
  });
  it("variant MRP override keeps the same discount ratio", () => {
    expect(priceOf(sp, { mrpPaise: 200000 })).toEqual({ pricePaise: 179100, mrpPaise: 200000, onSale: true });
  });
  it("never charges more than MRP", () => {
    expect(priceOf({ ...sp, salePricePaise: 120000 }).pricePaise).toBe(100000);
  });
  it("falls back to the legacy discount % for products saved before selling prices", () => {
    expect(priceOf({ ...base, salePricePaise: undefined })).toEqual({ pricePaise: 119900, mrpPaise: 149900, onSale: true });
  });
});

describe("discount pricing (legacy)", () => {
  it("applies percentage and rounds to the rupee", () => {
    expect(applyDiscount(149900, 20)).toBe(119900); // 1199.2 → 1199
    expect(applyDiscount(79900, 15)).toBe(67900); // 679.15 → 679
    expect(applyDiscount(100000, 0)).toBe(100000);
  });
  it("clamps discount to 0–90%", () => {
    expect(applyDiscount(100000, 150)).toBe(10000);
    expect(applyDiscount(100000, -5)).toBe(100000);
  });
  it("priceOf reports sale state", () => {
    expect(priceOf(base)).toEqual({ pricePaise: 119900, mrpPaise: 149900, onSale: true });
    expect(priceOf({ ...base, discountPercent: 0 })).toEqual({ pricePaise: 149900, mrpPaise: 149900, onSale: false });
  });
  it("variant MRP override still gets the product discount", () => {
    expect(priceOf(base, { mrpPaise: 200000 })).toEqual({ pricePaise: 160000, mrpPaise: 200000, onSale: true });
  });
  it("fromPrice picks the cheapest variant and detects variable pricing", () => {
    const p = { ...base, variants: [{ id: "a", sku: "A", options: {}, stock: 1, mrpPaise: 90000 }, { id: "b", sku: "B", options: {}, stock: 1 }] };
    expect(fromPriceOf(p).pricePaise).toBe(72000);
    expect(hasVariablePricing(p)).toBe(true);
    expect(hasVariablePricing({ variants: [{ id: "a", sku: "A", options: {}, stock: 1 }] })).toBe(false);
  });
});

describe("stock & variants", () => {
  it("sums variant stock", () => {
    const p = { ...base, variants: [{ id: "a", sku: "A", options: {}, stock: 2 }, { id: "b", sku: "B", options: {}, stock: 5 }] };
    expect(totalStock(p)).toBe(7);
  });
  it("classifies stock levels", () => {
    expect(stockState(0)).toBe("out_of_stock");
    expect(stockState(5)).toBe("low_stock");
    expect(stockState(6)).toBe("in_stock");
  });
  it("finds variant only when all options chosen", () => {
    const p = {
      ...base,
      options: [{ name: "Size", values: ["S"] }, { name: "Colour", values: ["Black"] }],
      variants: [{ id: "a", sku: "A", options: { Size: "S", Colour: "Black" }, stock: 1 }],
    };
    expect(findVariant(p, { Size: "S" })).toBeUndefined();
    expect(findVariant(p, { Size: "S", Colour: "Black" })?.id).toBe("a");
  });
  it("builds option combinations", () => {
    expect(optionCombinations([{ name: "Size", values: ["S", "M"] }, { name: "Colour", values: ["Black"] }])).toEqual([
      { Size: "S", Colour: "Black" },
      { Size: "M", Colour: "Black" },
    ]);
    expect(optionCombinations([])).toEqual([]);
  });
});

describe("catalog query parsing", () => {
  it("falls back to safe defaults for junk input", () => {
    expect(parseCatalogQuery({ page: "abc", sort: "evil", min: "-5", category: "../etc" })).toEqual({
      q: undefined, category: undefined, min: undefined, max: undefined, sort: "newest", page: 1,
    });
  });
  it("takes the first value of repeated params", () => {
    expect(parseCatalogQuery({ sort: ["price-asc", "price-desc"] }).sort).toBe("price-asc");
  });
  it("builds clean URLs", () => {
    expect(catalogHref({ sort: "newest", page: 1 })).toBe("/products");
    expect(catalogHref({ q: "tee", category: "apparel", page: 2, sort: "popular" })).toBe("/products?q=tee&category=apparel&sort=popular&page=2");
  });
});

describe("product input validation", () => {
  const valid = {
    name: "Tee", categoryId: "a".repeat(24), status: "active", mrpRupees: 999, salePriceRupees: 899.1, deliveryRupees: 300, sku: "vv-tee",
  };
  it("accepts a simple product and normalises SKU", () => {
    const r = productInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data.sku).toBe("VV-TEE");
  });
  it("requires a selling price no higher than MRP, and a non-negative delivery charge", () => {
    expect(productInputSchema.safeParse({ ...valid, salePriceRupees: undefined }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, salePriceRupees: 1000 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, salePriceRupees: 999 }).success).toBe(true);
    expect(productInputSchema.safeParse({ ...valid, deliveryRupees: -1 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, deliveryRupees: 0 }).success).toBe(true);
  });
  it("rejects zero/negative price and >2 decimals", () => {
    expect(productInputSchema.safeParse({ ...valid, mrpRupees: 0 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, mrpRupees: 9.999 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, mrpRupees: 9.99, salePriceRupees: 9.99 }).success).toBe(true);
  });
  it("requires variants when options exist and rejects duplicate SKUs", () => {
    const opts = { options: [{ name: "Size", values: ["S", "M"] }] };
    expect(productInputSchema.safeParse({ ...valid, ...opts }).success).toBe(false);
    const dup = productInputSchema.safeParse({
      ...valid,
      ...opts,
      variants: [
        { sku: "A-1", options: { Size: "S" }, stock: 1 },
        { sku: "A-1", options: { Size: "M" }, stock: 1 },
      ],
    });
    expect(dup.success).toBe(false);
  });
  it("rejects variants that don't match options", () => {
    const r = productInputSchema.safeParse({
      ...valid,
      options: [{ name: "Size", values: ["S"] }],
      variants: [{ sku: "A-1", options: { Size: "XXL" }, stock: 1 }],
    });
    expect(r.success).toBe(false);
  });
});

describe("permissions", () => {
  it("owner has everything, staff only what is granted", () => {
    expect(hasPermission({ role: "owner", permissions: [] }, "settings")).toBe(true);
    expect(hasPermission({ role: "staff", permissions: ["products"] }, "products")).toBe(true);
    expect(hasPermission({ role: "staff", permissions: ["products"] }, "refunds")).toBe(false);
  });
});
