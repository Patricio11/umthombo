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
  image: z.string().trim().default(""),
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

/** Optional positive decimal (e.g. weight in kg, dimensions in cm). */
const optionalFloat = z
  .union([z.number(), z.null()])
  .optional()
  .transform((v) => (v == null || !Number.isFinite(v) ? null : v))
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
  weightKg: optionalFloat,
  lengthCm: optionalFloat,
  widthCm: optionalFloat,
  heightCm: optionalFloat,
  status: z.enum(["draft", "active"]),
  image: z.string().trim().default(""),
  gallery: z.array(z.string()).default([]),
  variants: z.array(z.string().trim().min(1)).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

/* ------------------------------------------------------------------ */
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */
export const testimonialSchema = z.object({
  name: z.string().trim().min(1, "A name is required.").max(80),
  quote: z.string().trim().min(1, "A quote is required.").max(600),
  location: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v : null)),
  published: z.boolean().default(true),
});

export type TestimonialInput = z.infer<typeof testimonialSchema>;

/* ------------------------------------------------------------------ */
/*  Site settings                                                      */
/* ------------------------------------------------------------------ */
const optionalStr = (max: number) =>
  z.string().trim().max(max).optional().default("");

export const settingsSchema = z.object({
  tagline: optionalStr(160),
  story: optionalStr(2000),
  collection: optionalStr(200),
  whatsappNumber: optionalStr(20),
  whatsappDisplay: optionalStr(30),
  instagramHandle: optionalStr(60),
  instagramUrl: optionalStr(200),
  facebookHandle: optionalStr(60),
  facebookUrl: optionalStr(200),
  email: optionalStr(120),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

/** Turn a label into a slug suggestion. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
