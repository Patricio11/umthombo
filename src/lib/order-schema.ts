import { z } from "zod";
import { orderSchema } from "@/lib/zod-schemas";

export const orderItemInput = z.object({
  slug: z.string().min(1),
  variant: z.string().nullable().optional(),
  qty: z.number().int().min(1).max(99),
  unitPriceZAR: z.number().int().min(0),
});

export const createOrderSchema = orderSchema
  .extend({
    ownContainer: z.boolean().default(false),
    address: z.string().trim().max(400).optional().default(""),
    items: z.array(orderItemInput).min(1, "Your selection is empty."),
  })
  .refine((d) => d.method !== "delivery" || d.address.trim().length >= 5, {
    message: "Please enter a delivery address.",
    path: ["address"],
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** The fields the customer fills in the order modal (items + ownContainer
 *  come from the cart store). */
export const orderFormSchema = orderSchema
  .extend({
    address: z.string().trim().max(400).optional(),
  })
  .refine((d) => d.method !== "delivery" || (d.address ?? "").trim().length >= 5, {
    message: "Please enter a delivery address.",
    path: ["address"],
  });

export type OrderFormInput = z.infer<typeof orderFormSchema>;

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/* ------------------------------------------------------------------ */
/*  Admin-managed orders (create/edit by the admin)                    */
/* ------------------------------------------------------------------ */
export const adminOrderItemSchema = z.object({
  productId: z.string().uuid("Choose a product."),
  variant: z.string().nullable().optional(),
  qty: z.number().int().min(1).max(99),
});

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "cancelled",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const adminOrderSchema = orderSchema.extend({
  surname: z.string().trim().min(1, "Enter the surname.").max(120),
  ownContainer: z.boolean().default(false),
  address: z.string().trim().max(400).optional().default(""),
  status: z.enum(ORDER_STATUSES),
  paymentStatus: z.enum(PAYMENT_STATUSES).default("pending"),
  deliveryFeeZAR: z.number().int().min(0).optional().default(0),
  shippingService: z.string().trim().max(120).optional().default(""),
  items: z.array(adminOrderItemSchema).min(1, "Add at least one item."),
});

export type AdminOrderInput = z.infer<typeof adminOrderSchema>;
