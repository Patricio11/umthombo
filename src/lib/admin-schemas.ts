import { z } from "zod";

export const accentEnum = z.enum(["olive", "clay", "mist", "taupe"]);

const slug = z
  .string()
  .trim()
  .min(1, "A slug is required.")
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.");

export const categorySchema = z.object({
  slug,
  label: z.string().trim().min(1, "A name is required.").max(60),
  eyebrow: z.string().trim().max(60).optional().default(""),
  accent: accentEnum,
  blurb: z.string().trim().max(300).optional().default(""),
});

export type CategoryInput = z.infer<typeof categorySchema>;

/* ------------------------------------------------------------------ */
/*  Products                                                           */
/* ------------------------------------------------------------------ */
const optionalInt = z
  .union([z.number(), z.null()])
  .optional()
  .transform((v) => (v == null ? null : Math.round(v)))
  .refine((v) => v == null || v >= 0, "Must be 0 or more.");

const optionalText = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => (v ? v : null));

export const productSchema = z.object({
  name: z.string().trim().min(1, "A name is required.").max(120),
  slug,
  categoryId: z.string().uuid("Choose a category."),
  tagline: z.string().trim().max(160).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  notes: optionalText,
  size: optionalText,
  weight: optionalText,
  priceZAR: z
    .number({ message: "A price is required." })
    .int()
    .min(0, "Must be 0 or more."),
  priceMaxZAR: optionalInt,
  packPriceZAR: optionalInt,
  customisable: z.boolean().default(false),
  featured: z.boolean().default(false),
  status: z.enum(["draft", "active"]),
  image: z.string().trim().default(""),
  gallery: z.array(z.string()).default([]),
  variants: z.array(z.string().trim().min(1)).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

/** Turn a label into a slug suggestion. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
