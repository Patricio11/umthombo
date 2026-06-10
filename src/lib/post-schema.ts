import { z } from "zod";

export const POST_STATUSES = ["draft", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const postSchema = z
  .object({
    title: z.string().trim().min(1, "A title is required.").max(200),
    slug: z
      .string()
      .trim()
      .min(1, "A slug is required.")
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens."),
    excerpt: z.string().trim().max(400).default(""),
    body: z.string().max(50_000).default(""),
    coverImage: z.string().trim().max(600).default(""),
    coverAlt: z.string().trim().max(200).default(""),
    tags: z.array(z.string().trim().max(40)).max(12).default([]),
    status: z.enum(POST_STATUSES).default("draft"),
    featured: z.boolean().default(false),
    seoTitle: z
      .string()
      .trim()
      .max(70)
      .optional()
      .transform((v) => (v ? v : null)),
    seoDescription: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : null)),
  })
  // A published post must actually be complete; drafts may be a work in progress.
  .superRefine((d, ctx) => {
    if (d.status !== "published") return;
    if (!d.excerpt.trim())
      ctx.addIssue({ code: "custom", path: ["excerpt"], message: "Add a short excerpt before publishing." });
    if (!d.body.trim())
      ctx.addIssue({ code: "custom", path: ["body"], message: "Write the post before publishing." });
    if (!d.coverImage.trim())
      ctx.addIssue({ code: "custom", path: ["coverImage"], message: "Add a cover image before publishing." });
  });

export type PostInput = z.input<typeof postSchema>;
