import { model, models, Schema, type Model, type Types } from "mongoose";

/** A signed-in customer's cart, so it follows them across devices. Prices are never stored here. */
export interface CartDoc {
  _id: Types.ObjectId;
  userId: string;
  items: { productId: string; variantId?: string; qty: number }[];
  updatedAt: Date;
}

const schema = new Schema<CartDoc>(
  {
    userId: { type: String, required: true, unique: true },
    items: {
      type: [{ _id: false, productId: { type: String, required: true }, variantId: String, qty: { type: Number, required: true, min: 1, max: 10 } }],
      default: [],
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const Cart: Model<CartDoc> = (models.Cart as Model<CartDoc>) || model<CartDoc>("Cart", schema);
