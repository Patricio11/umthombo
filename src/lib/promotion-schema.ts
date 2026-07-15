import { z } from "zod";
import { PROMOTION_TYPES } from "@/lib/promotions";

const optionalInt = (max: number) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Math.trunc(Number(v));
      return Number.isFinite(n) ? n : null;
    })
    .refine((n) => n === null || (n >= 0 && n <= max), {
      message: "That number looks out of range.",
    });

const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

export const promotionSchema = z
  .object({
    name: z.string().trim().min(1, "Give it a name.").max(120),
    /** Blank = applies automatically (no code). */
    code: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((v) => (v ? v.toUpperCase() : null))
      .refine((v) => v === null || /^[A-Z0-9-]+$/.test(v), {
        message: "Codes can use letters, numbers and hyphens only.",
      }),
    type: z.enum(PROMOTION_TYPES as [string, ...string[]]),
    value: z.union([z.number(), z.string()]).transform((v) => {
      const n = Math.trunc(Number(v));
      return Number.isFinite(n) && n > 0 ? n : 0;
    }),
    minSubtotalZAR: optionalInt(1_000_000),
    freeShippingCapZAR: optionalInt(100_000),
    startsAt: optionalDate,
    endsAt: optionalDate,
    usageLimit: optionalInt(1_000_000),
    stackable: z.boolean().default(false),
    enabled: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    if (d.type === "percent" && (d.value < 1 || d.value > 100)) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "A percentage must be between 1 and 100.",
      });
    }
    if (d.type === "fixed" && d.value < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Enter the amount off, in rand.",
      });
    }
    if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "The end date is before the start date.",
      });
    }
  });

export type PromotionInput = z.input<typeof promotionSchema>;
