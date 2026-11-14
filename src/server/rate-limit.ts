import "server-only";
import { model, models, Schema, type Model } from "mongoose";
import { headers } from "next/headers";
import { connectDB } from "./db";

/**
 * Fixed-window rate limiter stored in MongoDB (works across serverless instances).
 * Expired windows are removed automatically by a TTL index.
 */

interface RateLimitDoc {
  key: string;
  count: number;
  expiresAt: Date;
}

const schema = new Schema<RateLimitDoc>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit: Model<RateLimitDoc> = (models.AppRateLimit as Model<RateLimitDoc>) || model<RateLimitDoc>("AppRateLimit", schema, "app_rate_limits");

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
  await connectDB();
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const bucket = `${key}:${windowStart}`;
  const doc = await RateLimit.findOneAndUpdate(
    { key: bucket },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((windowStart + windowSeconds) * 1000) } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  const count = doc?.count ?? 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
