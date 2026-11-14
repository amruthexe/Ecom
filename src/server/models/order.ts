import { model, models, Schema, type Model, type Types } from "mongoose";
import type { OrderStatus, PaymentStatus } from "@/lib/orders";
import { intValidator } from "./shared";

/** Items are SNAPSHOTS: historical orders never depend on current product data. */
export interface OrderItemDoc {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  options?: string; // e.g. "M / Black"
  imageUrl?: string;
  unitMrpPaise: number;
  unitPricePaise: number;
  qty: number;
  lineTotalPaise: number;
}

export interface AddressSnapshot {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface StatusEntry {
  status: OrderStatus;
  at: Date;
  by: string; // "system" | "customer" | "razorpay-webhook" | staff email
  note?: string;
}

export interface OrderDoc {
  _id: Types.ObjectId;
  orderNumber: string;
  userId?: string;
  contact: { name: string; email: string; phone: string };
  shippingAddress: AddressSnapshot;
  items: OrderItemDoc[];
  pricing: { subtotalPaise: number; mrpTotalPaise: number; shippingPaise: number; totalPaise: number; gstPaise: number; gstRatePercent: number; currency: "INR" };
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  statusHistory: StatusEntry[];
  razorpayOrderId?: string;
  paidAt?: Date;
  stockDeducted: boolean;
  refundedPaise: number;
  trackingNote?: string;
  cancelReason?: string;
  needsAttention?: string;
  idempotencyKey?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<OrderItemDoc>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String, required: true },
    options: String,
    imageUrl: String,
    unitMrpPaise: { type: Number, required: true, validate: intValidator },
    unitPricePaise: { type: Number, required: true, validate: intValidator },
    qty: { type: Number, required: true, min: 1, validate: intValidator },
    lineTotalPaise: { type: Number, required: true, validate: intValidator },
  },
  { _id: false },
);

const addressSchema = new Schema<AddressSnapshot>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: "IN" },
  },
  { _id: false },
);

const ORDER_STATUSES = ["pending_payment", "payment_failed", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "expired"];

const orderSchema = new Schema<OrderDoc>(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    contact: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, index: true },
      phone: { type: String, required: true },
    },
    shippingAddress: { type: addressSchema, required: true },
    items: { type: [itemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    pricing: {
      subtotalPaise: { type: Number, required: true },
      mrpTotalPaise: { type: Number, required: true },
      shippingPaise: { type: Number, required: true },
      totalPaise: { type: Number, required: true },
      gstPaise: { type: Number, required: true },
      gstRatePercent: { type: Number, required: true },
      currency: { type: String, default: "INR" },
    },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded", "partially_refunded"], default: "pending" },
    statusHistory: {
      type: [{ _id: false, status: { type: String, enum: ORDER_STATUSES }, at: Date, by: String, note: String }],
      default: [],
    },
    razorpayOrderId: { type: String },
    paidAt: Date,
    stockDeducted: { type: Boolean, default: false },
    refundedPaise: { type: Number, default: 0 },
    trackingNote: { type: String, maxlength: 300 },
    cancelReason: String,
    needsAttention: String,
    idempotencyKey: { type: String },
    expiresAt: Date,
  },
  { timestamps: true },
);

orderSchema.index({ razorpayOrderId: 1 }, { unique: true, partialFilterExpression: { razorpayOrderId: { $type: "string" } } });
orderSchema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, paidAt: -1 });
orderSchema.index({ createdAt: -1 });

export const Order: Model<OrderDoc> = (models.Order as Model<OrderDoc>) || model<OrderDoc>("Order", orderSchema);
