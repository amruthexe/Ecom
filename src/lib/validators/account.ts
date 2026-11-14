import { z } from "zod";
import { INDIAN_STATES } from "@/lib/orders";

export const phoneSchema = z
  .string()
  .trim()
  .transform((p) => p.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"));

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.email("Enter a valid email").max(200).transform((e) => e.toLowerCase()),
    phone: phoneSchema,
    password: z.string().min(8, "At least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const loginSchema = z.object({
  email: z.email("Enter a valid email").max(200).transform((e) => e.toLowerCase()),
  password: z.string().min(1, "Enter your password").max(128),
});

export const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient's name").max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(3, "Enter house / flat and street").max(120),
  line2: z.string().trim().max(120).optional().default(""),
  landmark: z.string().trim().max(80).optional().default(""),
  city: z.string().trim().min(2, "Enter your city").max(60),
  state: z.enum(INDIAN_STATES, { error: "Choose your state" }),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code"),
});

export type AddressInput = z.input<typeof addressSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: phoneSchema,
});

export const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password").max(128),
    password: z.string().min(8, "At least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

/** Only allow same-site relative redirects after login (prevents open redirects). */
export function safeNext(next: unknown, fallback = "/my-orders"): string {
  return typeof next === "string" && /^\/(?!\/)[\w\-/?=&.%]*$/.test(next) && !next.startsWith("/admin") ? next : fallback;
}
