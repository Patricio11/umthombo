import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems } from "@/server/db/schema";

export interface AccountOrderRow {
  id: string;
  orderNumber: string;
  createdAt: Date;
  totalZAR: number;
  status: string;
  paymentStatus: string;
  method: "delivery" | "collection";
  itemCount: number;
  shipmentStatus: string | null;
  trackingUrl: string | null;
}

export interface AccountOrderDetail {
  id: string;
  orderNumber: string;
  createdAt: Date;
  method: "delivery" | "collection";
  status: string;
  paymentStatus: string;
  shippingAddress: string | null;
  shippingService: string | null;
  shipmentStatus: string | null;
  trackingReference: string | null;
  trackingUrl: string | null;
  subtotalZAR: number;
  deliveryFeeZAR: number;
  totalZAR: number;
  ownContainer: boolean;
  items: {
    productId: string | null;
    name: string;
    variant: string | null;
    qty: number;
    unitPriceZAR: number;
    lineTotalZAR: number;
  }[];
}

/**
 * Link any guest orders placed with this (verified) email to the account.
 * Idempotent and case-insensitive — only touches still-unlinked rows.
 */
export async function linkGuestOrdersByEmail(userId: string, email: string) {
  await db
    .update(orders)
    .set({ userId })
    .where(
      and(
        isNull(orders.userId),
        eq(sql`lower(${orders.customerEmail})`, email.toLowerCase())
      )
    );
}

export async function getUserOrders(userId: string): Promise<AccountOrderRow[]> {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      createdAt: orders.createdAt,
      totalZAR: orders.totalZAR,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      method: orders.method,
      shipmentStatus: orders.shipmentStatus,
      trackingUrl: orders.trackingUrl,
      itemCount: sql<number>`count(${orderItems.id})::int`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.userId, userId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt));
}

export async function getUserOrder(
  id: string,
  userId: string
): Promise<AccountOrderDetail | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, userId)))
    .limit(1);
  if (!order) return null;

  const items = await db
    .select({
      productId: orderItems.productId,
      name: orderItems.name,
      variant: orderItems.variant,
      qty: orderItems.qty,
      unitPriceZAR: orderItems.unitPriceZAR,
      lineTotalZAR: orderItems.lineTotalZAR,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, id));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    method: order.method,
    status: order.status,
    paymentStatus: order.paymentStatus,
    shippingAddress: order.shippingAddress,
    shippingService: order.shippingService,
    shipmentStatus: order.shipmentStatus,
    trackingReference: order.trackingReference,
    trackingUrl: order.trackingUrl,
    subtotalZAR: order.subtotalZAR,
    deliveryFeeZAR: order.deliveryFeeZAR,
    totalZAR: order.totalZAR,
    ownContainer: order.ownContainer,
    items,
  };
}
