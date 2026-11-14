import { model, models, Schema, type Model, type Types } from "mongoose";
import { imageSchema, intValidator, type ImageDoc } from "./shared";

export interface CategoryDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  image?: ImageDoc;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9-]{1,96}$/, unique: true },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    image: { type: imageSchema, required: false },
    sortOrder: { type: Number, default: 0, validate: intValidator },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Category: Model<CategoryDoc> = (models.Category as Model<CategoryDoc>) || model<CategoryDoc>("Category", categorySchema);
