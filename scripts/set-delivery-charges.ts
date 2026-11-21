/**
 * One-time update (owner request, 2026-11-21): give every existing product a ₹300 delivery charge,
 * and store its current selling price explicitly (so the discount % is derived from MRP + selling price).
 * Customers' item prices do not change — only the delivery charge is added.
 *
 *   pnpm set-delivery-charges            → dry run: prints what would change, writes nothing
 *   pnpm set-delivery-charges --apply    → applies the changes (and writes an audit log entry per product)
 *   --rupees=300                         → delivery charge to set (default 300)
 */
import mongoose from "mongoose";
import { fromPriceOf, priceOf } from "@/lib/catalog";
import { AuditLog } from "@/server/models/audit-log";
import { Product } from "@/server/models/product";

const fmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

async function main() {
  const { MONGODB_URI, MONGODB_DB_NAME } = process.env;
  if (!MONGODB_URI) throw new Error("MONGODB_URI is required");
  const apply = process.argv.includes("--apply");
  const rupees = Number(process.argv.find((a) => a.startsWith("--rupees="))?.split("=")[1] ?? 300);
  if (!Number.isFinite(rupees) || rupees < 0) throw new Error("--rupees must be a number ≥ 0");
  const deliveryPaise = Math.round(rupees * 100);

  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME || undefined });
  const docs = await Product.find({}).lean();
  console.log(`${apply ? "APPLYING" : "DRY RUN"} — ${docs.length} product(s), delivery ${fmt(deliveryPaise)} per piece\n`);

  let changed = 0;
  for (const d of docs) {
    // Selling price customers pay today (legacy MRP − discount % when no selling price is stored yet).
    const salePricePaise = d.salePricePaise ?? priceOf({ mrpPaise: d.mrpPaise, discountPercent: d.discountPercent }).pricePaise;
    const variants = d.variants.map((v) => ({ id: String(v._id), sku: v.sku, options: {}, stock: v.stock, mrpPaise: v.mrpPaise ?? undefined }));
    const pricePaise = fromPriceOf({ mrpPaise: d.mrpPaise, salePricePaise, variants }).pricePaise;
    const same = d.salePricePaise === salePricePaise && d.deliveryPaise === deliveryPaise && d.pricePaise === pricePaise;
    console.log(
      `${same ? "  unchanged" : "  update   "} ${d.name.padEnd(32).slice(0, 32)} [${d.status}]  MRP ${fmt(d.mrpPaise)}  price ${fmt(salePricePaise)}` +
        `  delivery ${fmt(d.deliveryPaise ?? 0)} → ${fmt(deliveryPaise)}  = customer pays ${fmt(salePricePaise + deliveryPaise)} per piece`,
    );
    if (same) continue;
    changed++;
    if (!apply) continue;
    await Product.updateOne({ _id: d._id }, { $set: { salePricePaise, deliveryPaise, pricePaise } });
    await AuditLog.create({
      actorId: "script",
      actorEmail: "script:set-delivery-charges",
      action: "product.update",
      entity: "product",
      entityId: String(d._id),
      summary: `Delivery charge set to ${fmt(deliveryPaise)}; selling price stored as ${fmt(salePricePaise)}`,
      changes: { deliveryPaise: [d.deliveryPaise ?? 0, deliveryPaise], salePricePaise: [d.salePricePaise ?? null, salePricePaise] },
    });
  }
  console.log(`\n${changed} product(s) ${apply ? "updated" : "would be updated"}.${apply ? "" : " Run with --apply to make the changes."}`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
