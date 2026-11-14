import "server-only";
import { z } from "zod";

/**
 * Server environment, validated lazily on first access so `next build`
 * works without secrets. Each group is validated only when used.
 */

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v : undefined));

const dbSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: optional,
  MONGODB_TLS_CA_CERT: optional,
});

const authSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  /** Extra origins allowed to sign in, comma separated (e.g. phone testing on http://192.168.1.5:3000). */
  BETTER_AUTH_TRUSTED_ORIGINS: optional,
});

const razorpaySchema = z.object({
  RAZORPAY_KEY_ID: z.string().regex(/^rzp_(test|live)_/, "Invalid Razorpay key id"),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
});

const cloudinarySchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default("vevvion"),
});

const imagekitSchema = z.object({
  IMAGEKIT_PUBLIC_KEY: z.string().min(1),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1),
  IMAGEKIT_URL_ENDPOINT: z.url(),
});

const emailSchema = z.object({
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
});

const cronSchema = z.object({ CRON_SECRET: z.string().min(16) });

function parse<T extends z.ZodType>(name: string, schema: T): z.output<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid ${name} environment variables:\n${issues}`);
  }
  return result.data;
}

function lazy<T>(fn: () => T): () => T {
  let cached: T | undefined;
  return () => (cached ??= fn());
}

export const env = {
  db: lazy(() => parse("database", dbSchema)),
  auth: lazy(() => parse("auth", authSchema)),
  razorpay: lazy(() => parse("Razorpay", razorpaySchema)),
  cloudinary: lazy(() => parse("Cloudinary", cloudinarySchema)),
  imagekit: lazy(() => parse("ImageKit", imagekitSchema)),
  email: lazy(() => parse("email", emailSchema)),
  cron: lazy(() => parse("cron", cronSchema)),
  imageProvider: (): "cloudinary" | "imagekit" =>
    process.env.IMAGE_PROVIDER === "imagekit" ? "imagekit" : "cloudinary",
};
