import { model, models, Schema, type Model, type Types } from "mongoose";
import { fromPriceOf, MAX_DISCOUNT_PERCENT, totalStock } from "@/lib/catalog";
import type { ProductStatus } from "@/lib/types";
import { imageSchema, intValidator, type ImageDoc } from "./shared";

export interface VariantDoc {
  _id: Types.ObjectId;
  sku: string;
  options: Map<string, string> | Record<string, string>;
  stock: number;
  mrpPaise?: number;
}

export interface ProductDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: Types.ObjectId;
  tags: string[];
  images: ImageDoc[];
  mrpPaise: number;
  /** Selling price entered by the owner (GST-inclusive). Missing on products saved before 2026-11-21. */
  salePricePaise?: number;
  /** LEGACY: only used when salePricePaise is missing. */
  discountPercent: number;
  /** Delivery charge per unit, added at checkout. */
  deliveryPaise: number;
  sku: string;
  stock: number;
  options: { name: string; values: string[] }[];
  variants: VariantDoc[];
  status: ProductStatus;
  isFeatured: boolean;
  /** Denormalized: lowest effective price across variants (for sort/filter). */
  pricePaise: number;
  /** Denormalized: sum of stock (for low-stock queries). */
  totalStock: number;
  soldCount: number;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<VariantDoc>({
  sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 60 },
  options: { type: Map, of: String, required: true },
  stock: { type: Number, required: true, min: 0, default: 0, validate: intValidator },
  mrpPaise: { type: Number, min: 0, validate: intValidator },
});

const productSchema = new Schema<ProductDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9-]{1,96}$/, unique: true },
    shortDescription: { type: String, default: "", trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 5000 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    tags: { type: [String], default: [] },
    images: { type: [imageSchema], default: [] },
    mrpPaise: { type: Number, required: true, min: 0, validate: intValidator },
    salePricePaise: { type: Number, min: 0, validate: intValidator },
    discountPercent: { type: Number, default: 0, min: 0, max: MAX_DISCOUNT_PERCENT, validate: intValidator },
    deliveryPaise: { type: Number, default: 0, min: 0, validate: intValidator },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    stock: { type: Number, default: 0, min: 0, validate: intValidator },
    options: { type: [{ _id: false, name: { type: String, required: true, trim: true }, values: [String] }], default: [] },
    variants: { type: [variantSchema], default: [] },
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft", index: true },
    isFeatured: { type: Boolean, default: false },
    pricePaise: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ "variants.sku": 1 }, { unique: true, partialFilterExpression: { "variants.sku": { $type: "string" } } });
productSchema.index({ status: 1, categoryId: 1, createdAt: -1 });
productSchema.index({ status: 1, soldCount: -1 });
productSchema.index({ status: 1, pricePaise: 1 });
productSchema.index({ status: 1, totalStock: 1 });

/** Keep denormalized price/stock fields in sync on every save. */
productSchema.pre("validate", function () {
  const variants = this.variants.map((v) => ({ mrpPaise: v.mrpPaise ?? undefined, stock: v.stock }));
  this.pricePaise = fromPriceOf({ mrpPaise: this.mrpPaise, salePricePaise: this.salePricePaise ?? undefined, discountPercent: this.discountPercent, variants: variants as never }).pricePaise;
  this.totalStock = totalStock({ stock: this.stock, variants: variants as never });
});

export const Product: Model<ProductDoc> = (models.Product as Model<ProductDoc>) || model<ProductDoc>("Product", productSchema);
