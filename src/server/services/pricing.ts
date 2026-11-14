import "server-only";
import { Types } from "mongoose";
import { priceOf } from "@/lib/catalog";
import { splitInclusiveGst } from "@/lib/money";
import { connectDB } from "../db";
import { StoreSettings, type StoreSettingsDoc } from "../models/misc";
import { Product, type ProductDoc } from "../models/product";

/**
 * Server-side price calculation. The ONLY source of truth for what a customer pays.
 * Client-sent prices are never used.
 */

export type CartItemInput = { productId: string; variantId?: string; qty: number };

export type QuoteLine = {
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  sku: string;
  options?: string;
  imageUrl?: string;
  unitMrpPaise: number;
  unitPricePaise: number;
  qty: number;
  lineTotalPaise: number;
  available: number;
};

export type QuoteProblem = { index: number; productId: string; variantId?: string; message: string; available: number };

export type Quote = {
  lines: QuoteLine[];
  problems: QuoteProblem[];
  mrpTotalPaise: number;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  gstPaise: number;
  gstRatePercent: number;
};

export async function getStoreSettings(): Promise<Pick<StoreSettingsDoc, "shippingFlatPaise" | "freeShippingAbovePaise" | "gstRatePercent" | "pendingOrderTtlMinutes">> {
  await connectDB();
  const s = await StoreSettings.findOneAndUpdate({ key: "default" }, { $setOnInsert: { key: "default" } }, { upsert: true, returnDocument: "after" }).lean();
  return {
    shippingFlatPaise: s?.shippingFlatPaise ?? 0,
    freeShippingAbovePaise: s?.freeShippingAbovePaise ?? 0,
    gstRatePercent: s?.gstRatePercent ?? 18,
    pendingOrderTtlMinutes: s?.pendingOrderTtlMinutes ?? 30,
  };
}

export function shippingFor(subtotalPaise: number, s: { shippingFlatPaise: number; freeShippingAbovePaise: number }): number {
  if (s.shippingFlatPaise <= 0) return 0;
  if (s.freeShippingAbovePaise > 0 && subtotalPaise >= s.freeShippingAbovePaise) return 0;
  return s.shippingFlatPaise;
}

export async function quoteCart(items: CartItemInput[]): Promise<Quote> {
  await connectDB();
  const ids = [...new Set(items.map((i) => i.productId))].filter((id) => Types.ObjectId.isValid(id));
  const [docs, settings] = await Promise.all([
    Product.find({ _id: { $in: ids } }).lean<ProductDoc[]>(),
    getStoreSettings(),
  ]);
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  const lines: QuoteLine[] = [];
  const problems: QuoteProblem[] = [];

  // Merge duplicate lines (same product + variant) so stock checks are correct.
  const merged = new Map<string, CartItemInput>();
  for (const it of items) {
    const key = `${it.productId}:${it.variantId ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, qty: prev.qty + it.qty } : { ...it });
  }

  [...merged.values()].forEach((item, index) => {
    const p = byId.get(item.productId);
    if (!p || p.status !== "active") {
      problems.push({ index, productId: item.productId, variantId: item.variantId, message: "This product is no longer available", available: 0 });
      return;
    }
    const variant = item.variantId ? p.variants.find((v) => String(v._id) === item.variantId) : undefined;
    if (p.variants.length > 0 && !variant) {
      problems.push({ index, productId: item.productId, variantId: item.variantId, message: "This option is no longer available", available: 0 });
      return;
    }
    if (p.variants.length === 0 && item.variantId) {
      problems.push({ index, productId: item.productId, variantId: item.variantId, message: "This option is no longer available", available: 0 });
      return;
    }
    const available = variant ? variant.stock : p.stock;
    const price = priceOf({ mrpPaise: p.mrpPaise, discountPercent: p.discountPercent }, variant ? { mrpPaise: variant.mrpPaise ?? undefined } : undefined);
    const optionValues = variant ? Object.values(variant.options instanceof Map ? Object.fromEntries(variant.options) : variant.options) : [];
    lines.push({
      productId: item.productId,
      variantId: variant ? String(variant._id) : undefined,
      name: p.name,
      slug: p.slug,
      sku: variant?.sku ?? p.sku,
      options: optionValues.length ? optionValues.join(" / ") : undefined,
      imageUrl: p.images[0]?.url,
      unitMrpPaise: price.mrpPaise,
      unitPricePaise: price.pricePaise,
      qty: item.qty,
      lineTotalPaise: price.pricePaise * item.qty,
      available,
    });
    if (available < item.qty) {
      problems.push({
        index,
        productId: item.productId,
        variantId: item.variantId,
        message: available <= 0 ? "Out of stock" : `Only ${available} left`,
        available,
      });
    }
  });

  const subtotalPaise = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
  const mrpTotalPaise = lines.reduce((s, l) => s + l.unitMrpPaise * l.qty, 0);
  const shippingPaise = lines.length ? shippingFor(subtotalPaise, settings) : 0;
  const totalPaise = subtotalPaise + shippingPaise;
  return {
    lines,
    problems,
    mrpTotalPaise,
    subtotalPaise,
    shippingPaise,
    totalPaise,
    gstPaise: splitInclusiveGst(totalPaise, settings.gstRatePercent).gstPaise,
    gstRatePercent: settings.gstRatePercent,
  };
}
