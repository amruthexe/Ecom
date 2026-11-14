import { model, models, Schema, type Model, type Types } from "mongoose";

export type InventoryReason = "initial" | "manual_adjust" | "order" | "cancel" | "refund_restock";

export interface InventoryTransactionDoc {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  sku: string;
  change: number;
  balanceAfter: number;
  reason: InventoryReason;
  orderId?: Types.ObjectId;
  actorId?: string;
  note?: string;
  createdAt: Date;
}

const schema = new Schema<InventoryTransactionDoc>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId },
    sku: { type: String, required: true },
    change: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, enum: ["initial", "manual_adjust", "order", "cancel", "refund_restock"], required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    actorId: { type: String },
    note: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ productId: 1, createdAt: -1 });
schema.index({ sku: 1, createdAt: -1 });

export const InventoryTransaction: Model<InventoryTransactionDoc> =
  (models.InventoryTransaction as Model<InventoryTransactionDoc>) ||
  model<InventoryTransactionDoc>("InventoryTransaction", schema);
