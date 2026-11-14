import { model, models, Schema, type Model, type Types } from "mongoose";

export interface AddressDoc {
  _id: Types.ObjectId;
  userId: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AddressDoc>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true, maxlength: 120 },
    line2: { type: String, trim: true, maxlength: 120 },
    landmark: { type: String, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    state: { type: String, required: true },
    pincode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const MAX_ADDRESSES = 10;

export const Address: Model<AddressDoc> = (models.Address as Model<AddressDoc>) || model<AddressDoc>("Address", schema);
