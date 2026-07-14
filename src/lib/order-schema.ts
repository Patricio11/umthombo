import { z } from "zod";
import { orderSchema } from "@/lib/zod-schemas";

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
  /** Containers brought back for this line — clamped to `qty` server-side and
   *  only honoured when the product is container-eligible. */
  containersReturned: z.number().int().min(0).max(99).optional().default(0),
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
  address: z.string().trim().max(400).optional().default(""),
  status: z.enum(ORDER_STATUSES),
  paymentStatus: z.enum(PAYMENT_STATUSES).default("pending"),
  deliveryFeeZAR: z.number().int().min(0).optional().default(0),
  shippingService: z.string().trim().max(120).optional().default(""),
  items: z.array(adminOrderItemSchema).min(1, "Add at least one item."),
});

export type AdminOrderInput = z.infer<typeof adminOrderSchema>;
