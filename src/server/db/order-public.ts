import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems } from "@/server/db/schema";

export interface OrderConfirmation {
  orderNumber: string;
  customerName: string;
  method: "delivery" | "collection";
  subtotalZAR: number;
  deliveryFeeZAR: number;
  totalZAR: number;
  ownContainer: boolean;
  shippingService: string | null;
  paymentStatus: "pending" | "paid" | "failed" | "cancelled";
  items: { name: string; variant: string | null; qty: number; lineTotalZAR: number }[];
}

/** Minimal, non-sensitive order summary for the public confirmation page. */
export async function getOrderConfirmation(
  orderNumber: string
): Promise<OrderConfirmation | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  if (!order) return null;

  const items = await db
    .select({
      name: orderItems.name,
      variant: orderItems.variant,
      qty: orderItems.qty,
      lineTotalZAR: orderItems.lineTotalZAR,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  return {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    method: order.method,
    subtotalZAR: order.subtotalZAR,
    deliveryFeeZAR: order.deliveryFeeZAR,
    totalZAR: order.totalZAR,
    ownContainer: order.ownContainer,
    shippingService: order.shippingService,
    paymentStatus: order.paymentStatus,
    items,
  };
}
