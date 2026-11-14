import { describe, expect, it } from "vitest";
import { findVariant, fromPriceOf, priceOf, stockState, totalStock } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { catalogHref, parseCatalogQuery } from "@/lib/validators/catalog";
import { queryProducts, suggest } from "@/server/catalog";

const base: Product = {
  id: "t1", slug: "t", name: "Test", shortDescription: "", description: "", categorySlug: "x", tags: [], images: [],
  mrpPaise: 10000, salePaise: 8000, sku: "T", stock: 3, options: [], variants: [], isFeatured: false,
  soldCount: 0, ratingAvg: 0, ratingCount: 0, createdAt: "2026-01-01T00:00:00Z",
};

describe("pricing", () => {
  it("uses sale price when lower than MRP", () => {
    expect(priceOf(base)).toEqual({ pricePaise: 8000, mrpPaise: 10000, onSale: true });
  });
  it("ignores a sale price that is not lower", () => {
    expect(priceOf({ ...base, salePaise: 12000 })).toEqual({ pricePaise: 10000, mrpPaise: 10000, onSale: false });
  });
  it("variant MRP override without its own sale price is not discounted", () => {
    const p = { ...base, options: [{ name: "Size", values: ["S"] }], variants: [{ id: "v", sku: "V", options: { Size: "S" }, stock: 1, mrpPaise: 15000 }] };
    expect(priceOf(p, p.variants[0])).toEqual({ pricePaise: 15000, mrpPaise: 15000, onSale: false });
  });
  it("fromPrice picks the cheapest variant", () => {
    const p = {
      ...base,
      options: [{ name: "Size", values: ["S", "L"] }],
      variants: [
        { id: "a", sku: "A", options: { Size: "S" }, stock: 1, mrpPaise: 9000 },
        { id: "b", sku: "B", options: { Size: "L" }, stock: 1, mrpPaise: 20000, salePaise: 7000 },
      ],
    };
    expect(fromPriceOf(p).pricePaise).toBe(7000);
  });
});

describe("stock", () => {
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

describe("catalog service (demo data)", () => {
  it("filters by category and sorts by price", async () => {
    const r = await queryProducts(parseCatalogQuery({ category: "tech", sort: "price-asc" }));
    const prices = r.items.map((p) => fromPriceOf(p).pricePaise);
    expect(r.total).toBe(3);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
  it("filters by rupee price range", async () => {
    const r = await queryProducts(parseCatalogQuery({ min: "1000", max: "2000" }));
    expect(r.items.every((p) => fromPriceOf(p).pricePaise >= 100000 && fromPriceOf(p).pricePaise <= 200000)).toBe(true);
  });
  it("clamps out-of-range pages", async () => {
    const r = await queryProducts(parseCatalogQuery({ page: "99" }));
    expect(r.page).toBe(r.pages);
  });
  it("suggests nothing for 1-char queries", async () => {
    expect(await suggest("a")).toEqual([]);
    expect((await suggest("leather")).length).toBeGreaterThan(0);
  });
});
