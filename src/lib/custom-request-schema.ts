import { z } from "zod";

/** Friendly "what would you like?" options — NOT the shop's internal
 *  categories (guests don't know those). "Other" lets them type their own. */
export const REQUEST_TYPES = [
  "Candles",
  "Diffusers & Mists",
  "Body & Skin",
  "Hampers",
] as const;

/** Public custom-order request. Client-safe (no server imports). */
export const customRequestSchema = z.object({
  // Contact
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email.").max(160),
  phone: z.string().trim().min(6, "Enter a phone number.").max(30),

  // What they'd like — a friendly type (preset label or free-typed "Other")
  requestType: z
    .string()
    .trim()
    .min(1, "Tell us what you'd like.")
    .max(80),
  title: z
    .string()
    .trim()
    .min(3, "Give your idea a short title.")
    .max(140),
  scent: z.string().trim().max(160).optional(),
  colour: z.string().trim().max(160).optional(),
  size: z.string().trim().max(120).optional(),
  occasion: z.string().trim().max(120).optional(),
  quantity: z.number().int().min(1).max(999).default(1),
  notes: z.string().trim().max(2000).optional(),
  referenceImages: z.array(z.string().url()).max(5).optional(),

  // Anti-abuse (stripped server-side)
  hp: z.string().optional(),
  captchaToken: z.string().optional(),
});

export type CustomRequestInput = z.input<typeof customRequestSchema>;

export const CUSTOM_REQUEST_STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  quoted: "Quoted",
  in_progress: "In progress",
  ready: "Ready",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};
