import { z } from "zod";

// ZA-friendly phone: +27… or 0… , 9–13 digits, spaces allowed.
const phoneRegex = /^(\+27|0)[\s-]?(\d[\s-]?){8,11}\d$/;

export const orderSchema = z.object({
  name: z.string().min(2, "Please tell us your name."),
  email: z.string().email("That email doesn't look quite right."),
  phone: z
    .string()
    .min(6, "A contact number, please.")
    .regex(phoneRegex, "Use a +27 or 0… South African number."),
  method: z.enum(["delivery", "collection"]),
  note: z
    .string()
    .max(500, "That's a little long — keep it under 500 characters.")
    .optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;
