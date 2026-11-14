import { z } from "zod";
import { INDIAN_STATES } from "@/lib/orders";

const objectId = z.string().regex(/^[a-f0-9]{24}$/);

export const cartItemsSchema = z
  .array(
    z.object({
      productId: objectId,
      variantId: objectId.optional(),
      qty: z.number().int().min(1).max(10),
    }),
  )
  .min(1, "Your cart is empty")
  .max(50);

export const checkoutSchema = z.object({
  items: cartItemsSchema,
  contact: z.object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.email("Enter a valid email").max(200).transform((e) => e.toLowerCase()),
    phone: z
      .string()
      .trim()
      .transform((p) => p.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
      .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number")),
  }),
  address: z.object({
    line1: z.string().trim().min(3, "Enter house / flat and street").max(120),
    line2: z.string().trim().max(120).optional().default(""),
    landmark: z.string().trim().max(80).optional().default(""),
    city: z.string().trim().min(2, "Enter your city").max(60),
    state: z.enum(INDIAN_STATES, { error: "Choose your state" }),
    pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code"),
  }),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  saveAddress: z.boolean().optional().default(false),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export const verifySchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
});
