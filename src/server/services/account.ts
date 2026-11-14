import "server-only";
import { Types } from "mongoose";
import { addressSchema, type AddressInput } from "@/lib/validators/account";
import { fieldErrors } from "@/lib/validators/product";
import { connectDB } from "../db";
import { Address, MAX_ADDRESSES, type AddressDoc } from "../models/address";
import { Cart } from "../models/cart";
import { Order, type OrderDoc } from "../models/order";
import { quoteCart, type CartItemInput } from "./pricing";

/* ───────────── addresses (always scoped to the signed-in user) ───────────── */

export type SavedAddress = Required<Pick<AddressDoc, "name" | "phone" | "line1" | "city" | "state" | "pincode" | "isDefault">> & { id: string; line2: string; landmark: string };

const toAddress = (a: AddressDoc): SavedAddress => ({
  id: String(a._id),
  name: a.name,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2 ?? "",
  landmark: a.landmark ?? "",
  city: a.city,
  state: a.state,
  pincode: a.pincode,
  isDefault: a.isDefault,
});

export async function listAddresses(userId: string): Promise<SavedAddress[]> {
  await connectDB();
  const docs = await Address.find({ userId }).sort({ isDefault: -1, updatedAt: -1 }).lean<AddressDoc[]>();
  return docs.map(toAddress);
}

const sameAddress = (a: AddressDoc, b: Record<string, string>) =>
  a.line1.toLowerCase() === b.line1.toLowerCase() && a.pincode === b.pincode && a.name.toLowerCase() === b.name.toLowerCase() && (a.line2 ?? "") === (b.line2 ?? "");

export async function addAddress(userId: string, raw: AddressInput, makeDefault = false): Promise<{ ok: true; id: string } | { ok: false; errors: Record<string, string> }> {
  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  await connectDB();
  const existing = await Address.find({ userId }).lean<AddressDoc[]>();
  const dup = existing.find((a) => sameAddress(a, parsed.data));
  if (dup) return { ok: true, id: String(dup._id) };
  if (existing.length >= MAX_ADDRESSES) return { ok: false, errors: { _form: `You can save up to ${MAX_ADDRESSES} addresses. Delete one first.` } };
  const isDefault = makeDefault || existing.length === 0;
  if (isDefault) await Address.updateMany({ userId }, { isDefault: false });
  const doc = await Address.create({ ...parsed.data, userId, isDefault });
  return { ok: true, id: String(doc._id) };
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDB();
  const removed = await Address.findOneAndDelete({ _id: id, userId });
  if (removed?.isDefault) {
    const next = await Address.findOne({ userId }).sort({ updatedAt: -1 });
    if (next) await Address.updateOne({ _id: next._id }, { isDefault: true });
  }
}

export async function setDefaultAddress(userId: string, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDB();
  if (!(await Address.exists({ _id: id, userId }))) return;
  await Address.updateMany({ userId }, { isDefault: false });
  await Address.updateOne({ _id: id, userId }, { isDefault: true });
}

/* ───────────── cart (follows the customer across devices) ───────────── */

export type ServerCartLine = {
  productId: string;
  variantId?: string;
  slug: string;
  name: string;
  optionsLabel?: string;
  unitPricePaise: number;
  mrpPaise: number;
  qty: number;
  maxQty: number;
  imageUrl?: string;
};

/** Cart items with live display info; items that no longer exist are dropped. */
export async function getCartLines(userId: string): Promise<ServerCartLine[]> {
  await connectDB();
  const cart = await Cart.findOne({ userId }).lean();
  if (!cart?.items.length) return [];
  const quote = await quoteCart(cart.items);
  return quote.lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    slug: l.slug,
    name: l.name,
    optionsLabel: l.options,
    unitPricePaise: l.unitPricePaise,
    mrpPaise: l.unitMrpPaise,
    qty: Math.max(1, Math.min(l.qty, Math.max(l.available, 1), 10)),
    maxQty: l.available,
    imageUrl: l.imageUrl,
  }));
}

export async function saveCart(userId: string, items: CartItemInput[]): Promise<void> {
  await connectDB();
  const clean = items
    .filter((i) => Types.ObjectId.isValid(i.productId) && (!i.variantId || Types.ObjectId.isValid(i.variantId)))
    .slice(0, 50)
    .map((i) => ({ productId: i.productId, variantId: i.variantId, qty: Math.max(1, Math.min(10, Math.trunc(i.qty))) }));
  await Cart.updateOne({ userId }, { $set: { items: clean } }, { upsert: true });
}

/* ───────────── orders (only the customer's own) ───────────── */

export type MyOrderRow = { id: string; orderNumber: string; createdAt: string; status: OrderDoc["status"]; paymentStatus: OrderDoc["paymentStatus"]; totalPaise: number; itemCount: number; firstItem: string; imageUrl?: string; slug: string };

export async function listMyOrders(userId: string): Promise<MyOrderRow[]> {
  await connectDB();
  const docs = await Order.find({ userId, status: { $nin: ["expired"] } }).sort({ createdAt: -1 }).limit(100).lean<OrderDoc[]>();
  return docs
    .filter((o) => o.status !== "pending_payment" || o.paymentStatus !== "pending" || Date.now() - o.createdAt.getTime() < 60 * 60 * 1000)
    .map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalPaise: o.pricing.totalPaise,
      itemCount: o.items.reduce((n, i) => n + i.qty, 0),
      firstItem: o.items[0]?.name ?? "",
      imageUrl: o.items[0]?.imageUrl,
      slug: o.items[0]?.slug ?? "order",
    }));
}

/** True only if the order belongs to this user (ownership check for /my-orders/[id]). */
export async function ownsOrder(userId: string, orderId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(orderId)) return false;
  await connectDB();
  return !!(await Order.exists({ _id: orderId, userId }));
}
