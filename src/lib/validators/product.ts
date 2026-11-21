import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skuRegex = /^[A-Z0-9][A-Z0-9_-]{0,59}$/;
const objectId = z.string().regex(/^[a-f0-9]{24}$/, "Choose a category");

const twoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

const rupees = z
  .number({ error: "Enter a price" })
  .positive("Price must be more than ₹0")
  .max(10_000_000, "Price is too high")
  .refine((n) => Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Max 2 decimals");

export const imageInputSchema = z.object({
  url: z.url().max(1000),
  fileId: z.string().max(100).optional(),
  alt: z.string().trim().max(200).default(""),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(120),
    slug: z.string().trim().toLowerCase().max(96).regex(slugRegex, "Use lowercase letters, numbers and dashes").optional().or(z.literal("")),
    shortDescription: z.string().trim().max(200).default(""),
    description: z.string().trim().max(5000).default(""),
    categoryId: objectId,
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20).default([]),
    status: z.enum(["draft", "active", "archived"]),
    isFeatured: z.boolean().default(false),
    mrpRupees: rupees,
    salePriceRupees: z.number({ error: "Enter the selling price" }).positive("Selling price must be more than ₹0").max(10_000_000, "Price is too high").refine(twoDecimals, "Max 2 decimals"),
    deliveryRupees: z.number({ error: "Enter a delivery charge (0 for free)" }).min(0, "Can't be negative").max(100_000, "Too high").refine(twoDecimals, "Max 2 decimals"),
    sku: z.string().trim().toUpperCase().regex(skuRegex, "Use A–Z, 0–9, dashes"),
    stock: z.number().int("Whole numbers only").min(0, "Can't be negative").max(1_000_000).default(0),
    options: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Option name required").max(20),
          values: z.array(z.string().trim().min(1).max(30)).min(1, "Add at least one value").max(20),
        }),
      )
      .max(2, "Up to 2 options (e.g. Size and Colour)")
      .default([]),
    variants: z
      .array(
        z.object({
          id: z.string().regex(/^[a-f0-9]{24}$/).optional(),
          sku: z.string().trim().toUpperCase().regex(skuRegex, "Invalid SKU"),
          options: z.record(z.string(), z.string()),
          stock: z.number().int().min(0).max(1_000_000),
          mrpRupees: rupees.optional(),
        }),
      )
      .max(200)
      .default([]),
    images: z.array(imageInputSchema).max(10, "Up to 10 images").default([]),
  })
  .superRefine((p, ctx) => {
    if (p.salePriceRupees > p.mrpRupees) ctx.addIssue({ code: "custom", path: ["salePriceRupees"], message: "Selling price can't be more than MRP" });
    if (p.options.length > 0 && p.variants.length === 0) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Generate variants for your options" });
    }
    const names = p.options.map((o) => o.name.toLowerCase());
    if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Option names must be different" });
    const skus = new Set<string>([p.sku]);
    const combos = new Set<string>();
    p.variants.forEach((v, i) => {
      if (skus.has(v.sku)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "Duplicate SKU" });
      skus.add(v.sku);
      const valid = p.options.every((o) => o.values.includes(v.options[o.name] ?? "")) && Object.keys(v.options).length === p.options.length;
      if (!valid) ctx.addIssue({ code: "custom", path: ["variants", i], message: "Variant doesn't match options — regenerate variants" });
      const key = p.options.map((o) => v.options[o.name]).join("|");
      if (combos.has(key)) ctx.addIssue({ code: "custom", path: ["variants", i], message: "Duplicate variant" });
      combos.add(key);
    });
  });

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductInputParsed = z.output<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  slug: z.string().trim().toLowerCase().max(96).regex(slugRegex, "Use lowercase letters, numbers and dashes").optional().or(z.literal("")),
  description: z.string().trim().max(500).default(""),
  image: imageInputSchema.optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.input<typeof categoryInputSchema>;

/** Flattens Zod issues into { "variants.0.sku": "Duplicate SKU" } for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
