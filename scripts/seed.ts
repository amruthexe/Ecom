/**
 * Seeds starter categories + products into an EMPTY catalog.
 *   pnpm seed            → only runs when there are no products yet
 *   pnpm seed --force    → also runs when products exist (skips existing slugs)
 */
import mongoose, { Types } from "mongoose";
import { optionCombinations } from "@/lib/catalog";
import { Category } from "@/server/models/category";
import { InventoryTransaction } from "@/server/models/inventory-transaction";
import { Product } from "@/server/models/product";

const SIZES = { name: "Size", values: ["S", "M", "L", "XL"] };
const SHOE = { name: "Size", values: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"] };

const categories = [
  { slug: "apparel", name: "Apparel", description: "Everyday essentials, cut clean and built to last.", sortOrder: 1 },
  { slug: "footwear", name: "Footwear", description: "Comfort-first shoes for the city and beyond.", sortOrder: 2 },
  { slug: "accessories", name: "Accessories", description: "Bags, caps and the small things that finish a look.", sortOrder: 3 },
  { slug: "home", name: "Home", description: "Objects for calmer, better-designed spaces.", sortOrder: 4 },
  { slug: "tech", name: "Tech", description: "Gear that works as good as it looks.", sortOrder: 5 },
];

type Seed = {
  slug: string; name: string; sku: string; cat: string; short: string; desc: string; mrp: number; off?: number;
  featured?: boolean; sold: number; rating: [number, number]; tags: string[]; stock?: number;
  options?: { name: string; values: string[] }[]; stockFor?: (i: number) => number; daysAgo: number;
};

const products: Seed[] = [
  { slug: "core-heavyweight-tee", name: "Core Heavyweight Tee", sku: "VV-TEE-CORE", cat: "apparel", short: "240 GSM combed cotton tee with a structured drape.", desc: "Our signature tee in 240 GSM combed cotton. Pre-shrunk, double-stitched seams, and a relaxed fit that keeps its shape wash after wash.", mrp: 1499, off: 20, featured: true, sold: 412, rating: [4.7, 128], tags: ["cotton", "tee", "essentials"], options: [SIZES, { name: "Colour", values: ["Black", "Olive"] }], daysAgo: 17 },
  { slug: "relaxed-cargo-pants", name: "Relaxed Cargo Pants", sku: "VV-CRG-RLX", cat: "apparel", short: "Ripstop cargos with six utility pockets.", desc: "Lightweight ripstop cotton with an adjustable hem, six utility pockets and a gusseted crotch for full range of motion.", mrp: 2999, sold: 188, rating: [4.5, 64], tags: ["cargo", "pants"], options: [SIZES], daysAgo: 12 },
  { slug: "merino-crew-sweater", name: "Merino Crew Sweater", sku: "VV-SWT-MER", cat: "apparel", short: "Fine-gauge extra-fine merino, naturally temperature regulating.", desc: "Knitted from extra-fine merino wool. Breathable, soft against skin and naturally odour-resistant.", mrp: 4999, off: 20, featured: true, sold: 97, rating: [4.8, 41], tags: ["wool", "knit"], options: [SIZES], stockFor: (i) => (i === 3 ? 0 : 3), daysAgo: 57 },
  { slug: "overshirt-twill", name: "Twill Overshirt", sku: "VV-OVR-TWL", cat: "apparel", short: "Heavy twill overshirt. Layer it, or wear it alone.", desc: "Brushed heavy twill with corozo buttons and two chest pockets. Works as a light jacket or a heavy shirt.", mrp: 3499, sold: 140, rating: [4.6, 52], tags: ["shirt", "layering"], options: [SIZES, { name: "Colour", values: ["Black", "Forest"] }], daysAgo: 35 },
  { slug: "runner-one", name: "Runner One", sku: "VV-RUN-ONE", cat: "footwear", short: "Lightweight daily trainer with responsive foam.", desc: "Engineered mesh upper, responsive EVA midsole and a grippy rubber outsole for daily miles.", mrp: 5999, off: 20, featured: true, sold: 265, rating: [4.6, 93], tags: ["running", "sneakers"], options: [SHOE], daysAgo: 6 },
  { slug: "court-low-leather", name: "Court Low Leather", sku: "VV-CRT-LOW", cat: "footwear", short: "Minimal full-grain leather court sneaker.", desc: "Full-grain leather upper, cushioned insole and a stitched cupsole. A clean silhouette that goes with everything.", mrp: 6999, sold: 120, rating: [4.7, 38], tags: ["leather", "sneakers"], options: [SHOE], daysAgo: 84 },
  { slug: "trail-slide", name: "Trail Slide", sku: "VV-SLD-TRL", cat: "footwear", short: "Contoured recovery slide.", desc: "Soft contoured footbed made for recovery days and lazy weekends.", mrp: 1799, off: 25, sold: 330, rating: [4.4, 110], tags: ["slides"], options: [SHOE], daysAgo: 123 },
  { slug: "daypack-20l", name: "Daypack 20L", sku: "VV-BAG-D20", cat: "accessories", short: "Water-resistant daypack with a padded laptop sleeve.", desc: "Recycled nylon shell, padded 16\" laptop sleeve, quick-access front pocket and a luggage pass-through.", mrp: 3999, off: 20, featured: true, sold: 205, rating: [4.8, 77], tags: ["bag", "backpack"], stock: 24, daysAgo: 15 },
  { slug: "six-panel-cap", name: "Six Panel Cap", sku: "VV-CAP-SIX", cat: "accessories", short: "Washed cotton cap with an adjustable strap.", desc: "Garment-washed cotton twill, embroidered eyelets and a brass-buckle adjustable strap.", mrp: 999, sold: 290, rating: [4.5, 84], tags: ["cap", "hat"], stock: 3, daysAgo: 162 },
  { slug: "card-wallet", name: "Card Wallet", sku: "VV-WLT-CRD", cat: "accessories", short: "Slim vegetable-tanned leather card holder.", desc: "Holds six cards and folded notes. Vegetable-tanned leather that ages beautifully.", mrp: 1499, sold: 175, rating: [4.6, 58], tags: ["leather", "wallet"], stock: 40, daysAgo: 74 },
  { slug: "stoneware-mug", name: "Stoneware Mug", sku: "VV-MUG-STN", cat: "home", short: "Hand-glazed 350 ml stoneware mug.", desc: "Each mug is hand-glazed, so no two are exactly alike. Dishwasher and microwave safe.", mrp: 799, off: 15, sold: 360, rating: [4.9, 143], tags: ["kitchen", "ceramic"], stock: 60, daysAgo: 9 },
  { slug: "linen-throw", name: "Linen Throw", sku: "VV-THR-LIN", cat: "home", short: "Stonewashed linen throw, 130 × 170 cm.", desc: "Stonewashed European linen that gets softer with every wash. Finished with a simple fringe.", mrp: 3299, sold: 66, rating: [4.7, 22], tags: ["linen", "bedroom"], stock: 0, daysAgo: 94 },
  { slug: "desk-lamp-arc", name: "Arc Desk Lamp", sku: "VV-LMP-ARC", cat: "home", short: "Dimmable LED desk lamp with a warm-to-cool range.", desc: "Aluminium body, touch dimmer and adjustable colour temperature from 2700K to 6000K.", mrp: 4499, off: 15, featured: true, sold: 88, rating: [4.6, 31], tags: ["lighting", "desk"], stock: 15, daysAgo: 4 },
  { slug: "wireless-earbuds-pro", name: "Earbuds Pro", sku: "VV-AUD-PRO", cat: "tech", short: "ANC earbuds with 30-hour battery.", desc: "Hybrid active noise cancellation, transparency mode, wireless charging case and 30 hours total playtime.", mrp: 7999, off: 25, featured: true, sold: 310, rating: [4.5, 201], tags: ["audio", "wireless"], stock: 35, daysAgo: 2 },
  { slug: "power-bank-10k", name: "Power Bank 10K", sku: "VV-PWR-10K", cat: "tech", short: "Compact 10,000 mAh, 22.5W fast charging.", desc: "Charges two devices at once with USB-C PD and 22.5W fast charge. Fits in a jeans pocket.", mrp: 2499, sold: 240, rating: [4.4, 97], tags: ["charging", "travel"], stock: 50, daysAgo: 44 },
  { slug: "braided-usb-c-cable", name: "Braided USB-C Cable", sku: "VV-CBL-USC", cat: "tech", short: "2 m braided cable, 100W.", desc: "Nylon-braided, 100W PD, tested to 25,000 bends.", mrp: 699, off: 30, sold: 520, rating: [4.7, 260], tags: ["cable", "charging"], stock: 120, daysAgo: 178 },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (run with --env-file=.env.local)");
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME || undefined });
  await Promise.all([Category.syncIndexes(), Product.syncIndexes(), InventoryTransaction.syncIndexes()]);

  const force = process.argv.includes("--force");
  if (!force && (await Product.estimatedDocumentCount()) > 0) {
    console.log("Products already exist — skipping seed. Use --force to add missing starter products.");
    return;
  }

  const catIds = new Map<string, Types.ObjectId>();
  for (const c of categories) {
    const doc = await Category.findOneAndUpdate({ slug: c.slug }, { $setOnInsert: { ...c, isActive: true } }, { upsert: true, returnDocument: "after" });
    catIds.set(c.slug, doc._id);
  }

  let created = 0;
  for (const p of products) {
    if (await Product.exists({ slug: p.slug })) continue;
    const combos = optionCombinations(p.options ?? []);
    const doc = await Product.create({
      name: p.name, slug: p.slug, sku: p.sku, shortDescription: p.short, description: p.desc,
      categoryId: catIds.get(p.cat), tags: p.tags, mrpPaise: p.mrp * 100, discountPercent: p.off ?? 0,
      isFeatured: !!p.featured, status: "active", soldCount: p.sold, ratingAvg: p.rating[0], ratingCount: p.rating[1],
      options: p.options ?? [], stock: combos.length ? 0 : (p.stock ?? 0),
      variants: combos.map((o, i) => ({
        sku: `${p.sku}-${Object.values(o).map((v) => v.replace(/\s+/g, "").slice(0, 3).toUpperCase()).join("-")}`,
        options: o,
        stock: p.stockFor ? p.stockFor(i) : 4 + ((i * 7) % 15),
      })),
      createdAt: new Date(Date.now() - p.daysAgo * 86_400_000),
    });
    const txns = doc.variants.length
      ? doc.variants.map((v) => ({ productId: doc._id, variantId: v._id, sku: v.sku, change: v.stock, balanceAfter: v.stock, reason: "initial", note: "Seed" }))
      : [{ productId: doc._id, sku: doc.sku, change: doc.stock, balanceAfter: doc.stock, reason: "initial", note: "Seed" }];
    await InventoryTransaction.insertMany(txns.filter((t) => t.change > 0));
    created++;
  }
  console.log(`Seed complete: ${categories.length} categories ensured, ${created} products created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
