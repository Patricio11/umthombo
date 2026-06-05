import { z } from "zod";
import { orderSchema } from "@/lib/zod-schemas";

export const orderItemInput = z.object({
  slug: z.string().min(1),
  variant: z.string().nullable().optional(),
  qty: z.number().int().min(1).max(99),
  unitPriceZAR: z.number().int().min(0),
});

export const createOrderSchema = orderSchema.extend({
  ownContainer: z.boolean().default(false),
  items: z.array(orderItemInput).min(1, "Your selection is empty."),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
