import { z } from "zod";

/** Structured delivery address (matches lib/shipping DeliveryAddress). */
export const deliveryAddressSchema = z.object({
  company: z.string().trim().max(120).optional().default(""),
  streetAddress: z.string().trim().min(3, "Enter a street address.").max(200),
  localArea: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().min(2, "Enter a city.").max(120),
  zone: z.string().trim().min(2, "Choose a province.").max(40),
  code: z.string().trim().min(4, "Enter a postal code.").max(10),
  country: z.string().trim().max(2).optional().default("ZA"),
});

export const checkoutItemSchema = z.object({
  slug: z.string().min(1),
  variant: z.string().nullable().optional(),
  qty: z.number().int().min(1).max(99),
  unitPriceZAR: z.number().int().min(0),
});

export const createPendingOrderSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(120),
    email: z.string().trim().email("Enter a valid email.").max(160),
    phone: z.string().trim().min(6, "Enter a phone number.").max(30),
    method: z.enum(["delivery", "collection"]),
    address: deliveryAddressSchema.optional(),
    serviceCode: z.string().trim().max(80).optional(),
    note: z.string().trim().max(500).optional(),
    ownContainer: z.boolean().default(false),
    // Account hooks (logged-out: offer account creation; logged-in: save address)
    createAccount: z.boolean().optional().default(false),
    saveAddress: z.boolean().optional().default(false),
    items: z.array(checkoutItemSchema).min(1, "Your selection is empty."),
    // Honeypot - must stay empty; a value means a bot filled the decoy field.
    hp: z.string().optional(),
    // Customer's chosen gateway (only honoured when the admin offers a choice).
    paymentProvider: z.enum(["yetopay", "yoco"]).optional(),
  })
  .refine((d) => d.method !== "delivery" || !!d.address, {
    message: "Please enter a delivery address.",
    path: ["address"],
  })
  .refine((d) => d.method !== "delivery" || !!d.serviceCode, {
    message: "Please choose a delivery option.",
    path: ["serviceCode"],
  });

// Use the *input* type so fields with defaults (and optional address parts)
// stay optional for callers; the action reads validated output internally.
export type CreatePendingOrderInput = z.input<typeof createPendingOrderSchema>;
