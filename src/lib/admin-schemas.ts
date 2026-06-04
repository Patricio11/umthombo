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

/** Turn a label into a slug suggestion. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
