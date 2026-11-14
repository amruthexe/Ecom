import "server-only";
import { ObjectId } from "mongodb";
import type { StaffUser } from "@/lib/permissions";
import { audit } from "../audit";
import { connectDB } from "../db";
import { Address, type AddressDoc } from "../models/address";
import { Order, type OrderDoc } from "../models/order";

/** Admin view of customer accounts (Better Auth "user" collection + their orders). */

type UserRow = { _id: ObjectId; name: string; email: string; phone?: string; role?: string; status?: string; createdAt: Date };

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "blocked";
  joinedAt: string;
  orders: number;
  spentPaise: number;
  lastOrderAt?: string;
};

const PAGE = 25;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function users() {
  const m = await connectDB();
  return m.connection.db!.collection<UserRow>("user");
}

async function orderStats(userIds: string[]) {
  const stats = await Order.aggregate<{ _id: string; orders: number; spent: number; last: Date }>([
    { $match: { userId: { $in: userIds }, paymentStatus: { $in: ["paid", "partially_refunded", "refunded"] } } },
    { $group: { _id: "$userId", orders: { $sum: 1 }, spent: { $sum: { $subtract: ["$pricing.totalPaise", "$refundedPaise"] } }, last: { $max: "$paidAt" } } },
  ]);
  return new Map(stats.map((s) => [s._id, s]));
}

export async function listCustomers(params: { q?: string; page?: number }) {
  const col = await users();
  const filter: Record<string, unknown> = { role: { $nin: ["owner", "staff"] } };
  if (params.q) {
    const rx = new RegExp(escapeRegex(params.q.slice(0, 80)), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const page = Math.max(1, params.page ?? 1);
  const [docs, total] = await Promise.all([
    col.find(filter, { projection: { name: 1, email: 1, phone: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).toArray(),
    col.countDocuments(filter),
  ]);
  const stats = await orderStats(docs.map((d) => String(d._id)));
  const rows: CustomerRow[] = docs.map((u) => {
    const s = stats.get(String(u._id));
    return {
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone ?? "",
      status: u.status === "blocked" ? "blocked" : "active",
      joinedAt: new Date(u.createdAt).toISOString(),
      orders: s?.orders ?? 0,
      spentPaise: s?.spent ?? 0,
      lastOrderAt: s?.last ? new Date(s.last).toISOString() : undefined,
    };
  });
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE)) };
}

export async function getCustomerDetail(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const col = await users();
  const u = await col.findOne({ _id: new ObjectId(id), role: { $nin: ["owner", "staff"] } });
  if (!u) return null;
  const [orders, addresses, stats] = await Promise.all([
    Order.find({ userId: id }).sort({ createdAt: -1 }).limit(50).lean<OrderDoc[]>(),
    Address.find({ userId: id }).sort({ isDefault: -1 }).lean<AddressDoc[]>(),
    orderStats([id]),
  ]);
  const s = stats.get(id);
  return {
    id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? "",
    status: (u.status === "blocked" ? "blocked" : "active") as "active" | "blocked",
    joinedAt: new Date(u.createdAt).toISOString(),
    paidOrders: s?.orders ?? 0,
    spentPaise: s?.spent ?? 0,
    orders: orders.map((o) => ({ id: String(o._id), orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, totalPaise: o.pricing.totalPaise, createdAt: o.createdAt.toISOString() })),
    addresses: addresses.map((a) => `${a.name}, ${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city}, ${a.state} ${a.pincode} · ${a.phone}${a.isDefault ? " (default)" : ""}`),
  };
}

/** Block/unblock a customer. Blocking also signs them out everywhere. */
export async function setCustomerStatus(id: string, status: "active" | "blocked", actor: StaffUser): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await users();
  const res = await col.updateOne({ _id: new ObjectId(id), role: { $nin: ["owner", "staff"] } }, { $set: { status } });
  if (!res.matchedCount) return false;
  if (status === "blocked") {
    const m = await connectDB();
    await m.connection.db!.collection("session").deleteMany({ userId: { $in: [id, new ObjectId(id)] } });
  }
  await audit(actor, { action: `customer.${status === "blocked" ? "block" : "unblock"}`, entity: "customer", entityId: id, summary: `${status === "blocked" ? "Blocked" : "Unblocked"} customer ${id}` });
  return true;
}
