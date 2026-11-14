import "server-only";
import type { Category, Product, ProductOption, ProductVariant } from "@/lib/types";

/**
 * TEMPORARY demo catalog for Phase 2 (storefront UI).
 * Replaced by MongoDB in Phase 3. Pages only use `src/server/catalog`, never this file directly.
 */

export const demoCategories: Category[] = [
  { id: "c1", slug: "apparel", name: "Apparel", description: "Everyday essentials, cut clean and built to last." },
  { id: "c2", slug: "footwear", name: "Footwear", description: "Comfort-first shoes for the city and beyond." },
  { id: "c3", slug: "accessories", name: "Accessories", description: "Bags, caps and the small things that finish a look." },
  { id: "c4", slug: "home", name: "Home", description: "Objects for calmer, better-designed spaces." },
  { id: "c5", slug: "tech", name: "Tech", description: "Gear that works as good as it looks." },
];

const rs = (rupees: number) => rupees * 100;

function variantGrid(skuPrefix: string, options: ProductOption[], stockFor: (i: number) => number): ProductVariant[] {
  const combos = options.reduce<Record<string, string>[]>(
    (acc, opt) => acc.flatMap((c) => opt.values.map((v) => ({ ...c, [opt.name]: v }))),
    [{}],
  );
  return combos.map((combo, i) => ({
    id: `${skuPrefix}-v${i + 1}`,
    sku: `${skuPrefix}-${Object.values(combo).map((v) => v.slice(0, 3).toUpperCase()).join("-")}`,
    options: combo,
    stock: stockFor(i),
  }));
}

type Seed = Omit<Product, "id" | "images" | "variants" | "options" | "stock" | "tags" | "isFeatured"> & {
  options?: ProductOption[];
  stock?: number;
  tags?: string[];
  isFeatured?: boolean;
  stockFor?: (i: number) => number;
};

function product(id: string, seed: Seed): Product {
  const options = seed.options ?? [];
  const { stockFor, ...rest } = seed;
  return {
    ...rest,
    id,
    images: [],
    tags: seed.tags ?? [],
    isFeatured: seed.isFeatured ?? false,
    options,
    stock: seed.stock ?? 0,
    variants: options.length ? variantGrid(seed.sku, options, stockFor ?? ((i) => 4 + ((i * 7) % 15))) : [],
  };
}

const SIZES: ProductOption = { name: "Size", values: ["S", "M", "L", "XL"] };
const SHOE_SIZES: ProductOption = { name: "Size", values: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"] };

export const demoProducts: Product[] = [
  product("p1", {
    slug: "core-heavyweight-tee", name: "Core Heavyweight Tee", sku: "VV-TEE-CORE", categorySlug: "apparel",
    shortDescription: "240 GSM combed cotton tee with a structured drape.",
    description: "Our signature tee in 240 GSM combed cotton. Pre-shrunk, double-stitched seams, and a relaxed fit that keeps its shape wash after wash.",
    mrpPaise: rs(1499), salePaise: rs(1199), isFeatured: true, soldCount: 412, ratingAvg: 4.7, ratingCount: 128,
    createdAt: "2026-10-28T10:00:00Z", tags: ["cotton", "tee", "essentials"],
    options: [SIZES, { name: "Colour", values: ["Black", "Olive"] }],
  }),
  product("p2", {
    slug: "relaxed-cargo-pants", name: "Relaxed Cargo Pants", sku: "VV-CRG-RLX", categorySlug: "apparel",
    shortDescription: "Ripstop cargos with six utility pockets.",
    description: "Lightweight ripstop cotton with an adjustable hem, six utility pockets and a gusseted crotch for full range of motion.",
    mrpPaise: rs(2999), soldCount: 188, ratingAvg: 4.5, ratingCount: 64,
    createdAt: "2026-11-02T10:00:00Z", tags: ["cargo", "pants"], options: [SIZES],
  }),
  product("p3", {
    slug: "merino-crew-sweater", name: "Merino Crew Sweater", sku: "VV-SWT-MER", categorySlug: "apparel",
    shortDescription: "Fine-gauge extra-fine merino, naturally temperature regulating.",
    description: "Knitted from extra-fine merino wool. Breathable, soft against skin and naturally odour-resistant.",
    mrpPaise: rs(4999), salePaise: rs(3999), isFeatured: true, soldCount: 97, ratingAvg: 4.8, ratingCount: 41,
    createdAt: "2026-09-18T10:00:00Z", tags: ["wool", "knit"], options: [SIZES], stockFor: (i) => (i === 3 ? 0 : 3),
  }),
  product("p4", {
    slug: "overshirt-twill", name: "Twill Overshirt", sku: "VV-OVR-TWL", categorySlug: "apparel",
    shortDescription: "Heavy twill overshirt. Layer it, or wear it alone.",
    description: "Brushed heavy twill with corozo buttons and two chest pockets. Works as a light jacket or a heavy shirt.",
    mrpPaise: rs(3499), soldCount: 140, ratingAvg: 4.6, ratingCount: 52,
    createdAt: "2026-10-10T10:00:00Z", tags: ["shirt", "layering"], options: [SIZES, { name: "Colour", values: ["Black", "Forest"] }],
  }),
  product("p5", {
    slug: "runner-one", name: "Runner One", sku: "VV-RUN-ONE", categorySlug: "footwear",
    shortDescription: "Lightweight daily trainer with responsive foam.",
    description: "Engineered mesh upper, responsive EVA midsole and a grippy rubber outsole for daily miles.",
    mrpPaise: rs(5999), salePaise: rs(4799), isFeatured: true, soldCount: 265, ratingAvg: 4.6, ratingCount: 93,
    createdAt: "2026-11-08T10:00:00Z", tags: ["running", "sneakers"], options: [SHOE_SIZES],
  }),
  product("p6", {
    slug: "court-low-leather", name: "Court Low Leather", sku: "VV-CRT-LOW", categorySlug: "footwear",
    shortDescription: "Minimal full-grain leather court sneaker.",
    description: "Full-grain leather upper, cushioned insole and a stitched cupsole. A clean silhouette that goes with everything.",
    mrpPaise: rs(6999), soldCount: 120, ratingAvg: 4.7, ratingCount: 38,
    createdAt: "2026-08-22T10:00:00Z", tags: ["leather", "sneakers"], options: [SHOE_SIZES],
  }),
  product("p7", {
    slug: "trail-slide", name: "Trail Slide", sku: "VV-SLD-TRL", categorySlug: "footwear",
    shortDescription: "Contoured recovery slide.",
    description: "Soft contoured footbed made for recovery days and lazy weekends.",
    mrpPaise: rs(1799), salePaise: rs(1299), soldCount: 330, ratingAvg: 4.4, ratingCount: 110,
    createdAt: "2026-07-14T10:00:00Z", tags: ["slides"], options: [SHOE_SIZES],
  }),
  product("p8", {
    slug: "daypack-20l", name: "Daypack 20L", sku: "VV-BAG-D20", categorySlug: "accessories",
    shortDescription: "Water-resistant daypack with a padded laptop sleeve.",
    description: "Recycled nylon shell, padded 16\" laptop sleeve, quick-access front pocket and a luggage pass-through.",
    mrpPaise: rs(3999), salePaise: rs(3199), isFeatured: true, soldCount: 205, ratingAvg: 4.8, ratingCount: 77,
    createdAt: "2026-10-30T10:00:00Z", tags: ["bag", "backpack"], stock: 24,
  }),
  product("p9", {
    slug: "six-panel-cap", name: "Six Panel Cap", sku: "VV-CAP-SIX", categorySlug: "accessories",
    shortDescription: "Washed cotton cap with an adjustable strap.",
    description: "Garment-washed cotton twill, embroidered eyelets and a brass-buckle adjustable strap.",
    mrpPaise: rs(999), soldCount: 290, ratingAvg: 4.5, ratingCount: 84,
    createdAt: "2026-06-05T10:00:00Z", tags: ["cap", "hat"], stock: 3,
  }),
  product("p10", {
    slug: "card-wallet", name: "Card Wallet", sku: "VV-WLT-CRD", categorySlug: "accessories",
    shortDescription: "Slim vegetable-tanned leather card holder.",
    description: "Holds six cards and folded notes. Vegetable-tanned leather that ages beautifully.",
    mrpPaise: rs(1499), soldCount: 175, ratingAvg: 4.6, ratingCount: 58,
    createdAt: "2026-09-01T10:00:00Z", tags: ["leather", "wallet"], stock: 40,
  }),
  product("p11", {
    slug: "stoneware-mug", name: "Stoneware Mug", sku: "VV-MUG-STN", categorySlug: "home",
    shortDescription: "Hand-glazed 350 ml stoneware mug.",
    description: "Each mug is hand-glazed, so no two are exactly alike. Dishwasher and microwave safe.",
    mrpPaise: rs(799), salePaise: rs(649), soldCount: 360, ratingAvg: 4.9, ratingCount: 143,
    createdAt: "2026-11-05T10:00:00Z", tags: ["kitchen", "ceramic"], stock: 60,
  }),
  product("p12", {
    slug: "linen-throw", name: "Linen Throw", sku: "VV-THR-LIN", categorySlug: "home",
    shortDescription: "Stonewashed linen throw, 130 × 170 cm.",
    description: "Stonewashed European linen that gets softer with every wash. Finished with a simple fringe.",
    mrpPaise: rs(3299), soldCount: 66, ratingAvg: 4.7, ratingCount: 22,
    createdAt: "2026-08-12T10:00:00Z", tags: ["linen", "bedroom"], stock: 0,
  }),
  product("p13", {
    slug: "desk-lamp-arc", name: "Arc Desk Lamp", sku: "VV-LMP-ARC", categorySlug: "home",
    shortDescription: "Dimmable LED desk lamp with a warm-to-cool range.",
    description: "Aluminium body, touch dimmer and adjustable colour temperature from 2700K to 6000K.",
    mrpPaise: rs(4499), salePaise: rs(3799), isFeatured: true, soldCount: 88, ratingAvg: 4.6, ratingCount: 31,
    createdAt: "2026-11-10T10:00:00Z", tags: ["lighting", "desk"], stock: 15,
  }),
  product("p14", {
    slug: "wireless-earbuds-pro", name: "Earbuds Pro", sku: "VV-AUD-PRO", categorySlug: "tech",
    shortDescription: "ANC earbuds with 30-hour battery.",
    description: "Hybrid active noise cancellation, transparency mode, wireless charging case and 30 hours total playtime.",
    mrpPaise: rs(7999), salePaise: rs(5999), isFeatured: true, soldCount: 310, ratingAvg: 4.5, ratingCount: 201,
    createdAt: "2026-11-12T10:00:00Z", tags: ["audio", "wireless"], stock: 35,
  }),
  product("p15", {
    slug: "power-bank-10k", name: "Power Bank 10K", sku: "VV-PWR-10K", categorySlug: "tech",
    shortDescription: "Compact 10,000 mAh, 22.5W fast charging.",
    description: "Charges two devices at once with USB-C PD and 22.5W fast charge. Fits in a jeans pocket.",
    mrpPaise: rs(2499), soldCount: 240, ratingAvg: 4.4, ratingCount: 97,
    createdAt: "2026-10-01T10:00:00Z", tags: ["charging", "travel"], stock: 50,
  }),
  product("p16", {
    slug: "braided-usb-c-cable", name: "Braided USB-C Cable", sku: "VV-CBL-USC", categorySlug: "tech",
    shortDescription: "2 m braided cable, 100W.",
    description: "Nylon-braided, 100W PD, tested to 25,000 bends.",
    mrpPaise: rs(699), salePaise: rs(499), soldCount: 520, ratingAvg: 4.7, ratingCount: 260,
    createdAt: "2026-05-20T10:00:00Z", tags: ["cable", "charging"], stock: 120,
  }),
];
