import { Schema } from "mongoose";

/** Image stored on ImageKit. `fileId` lets us delete it when removed. */
export interface ImageDoc {
  url: string;
  fileId?: string;
  alt: string;
  width?: number;
  height?: number;
}

export const imageSchema = new Schema<ImageDoc>(
  {
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    fileId: { type: String, trim: true, maxlength: 100 },
    alt: { type: String, default: "", trim: true, maxlength: 200 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
  },
  { _id: false },
);

export const intValidator = { validator: Number.isInteger, message: "{PATH} must be an integer" };
