import { model, models, Schema, type Model, type Types } from "mongoose";

/** Razorpay webhook events: unique eventId makes processing idempotent. */
export interface WebhookEventDoc {
  _id: Types.ObjectId;
  eventId: string;
  event: string;
  status: "received" | "processed" | "failed" | "ignored";
  error?: string;
  processedAt?: Date;
  createdAt: Date;
}

const webhookSchema = new Schema<WebhookEventDoc>(
  {
    eventId: { type: String, required: true, unique: true },
    event: { type: String, required: true },
    status: { type: String, enum: ["received", "processed", "failed", "ignored"], default: "received" },
    error: String,
    processedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
webhookSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const WebhookEvent: Model<WebhookEventDoc> =
  (models.WebhookEvent as Model<WebhookEventDoc>) || model<WebhookEventDoc>("WebhookEvent", webhookSchema);

/** Atomic counters (order numbers). */
interface CounterDoc {
  _id: string;
  seq: number;
}
const counterSchema = new Schema<CounterDoc>({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } });
export const Counter: Model<CounterDoc> = (models.Counter as Model<CounterDoc>) || model<CounterDoc>("Counter", counterSchema);

/** Store-wide settings (singleton, key "default"). */
export interface StoreSettingsDoc {
  _id: Types.ObjectId;
  key: string;
  shippingFlatPaise: number;
  freeShippingAbovePaise: number;
  gstRatePercent: number;
  pendingOrderTtlMinutes: number;
}
const settingsSchema = new Schema<StoreSettingsDoc>({
  key: { type: String, required: true, unique: true, default: "default" },
  shippingFlatPaise: { type: Number, default: 0, min: 0 },
  freeShippingAbovePaise: { type: Number, default: 0, min: 0 },
  gstRatePercent: { type: Number, default: 18, min: 0, max: 28 },
  pendingOrderTtlMinutes: { type: Number, default: 30, min: 5 },
});
export const StoreSettings: Model<StoreSettingsDoc> =
  (models.StoreSettings as Model<StoreSettingsDoc>) || model<StoreSettingsDoc>("StoreSettings", settingsSchema);
