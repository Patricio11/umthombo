import "server-only";
import { sql, desc } from "drizzle-orm";
import { db } from "@/server/db";
import {
  products,
  categories,
  testimonials,
  orders,
} from "@/server/db/schema";

export interface AdminStats {
  products: number;
  categories: number;
  testimonials: number;
  orders: number;
  ordersByStatus: Record<string, number>;
}

const ORDER_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "completed",
  "cancelled",
] as const;

export async function getAdminStats(): Promise<AdminStats> {
  const count = sql<number>`count(*)::int`;
  const [[p], [c], [t], byStatus] = await Promise.all([
    db.select({ n: count }).from(products),
    db.select({ n: count }).from(categories),
    db.select({ n: count }).from(testimonials),
    db
      .select({ status: orders.status, n: count })
      .from(orders)
      .groupBy(orders.status),
  ]);

  const ordersByStatus: Record<string, number> = Object.fromEntries(
    ORDER_STATUSES.map((s) => [s, 0])
  );
  let orderTotal = 0;
  for (const row of byStatus) {
    ordersByStatus[row.status] = row.n;
    orderTotal += row.n;
  }

  return {
    products: p.n,
    categories: c.n,
    testimonials: t.n,
    orders: orderTotal,
    ordersByStatus,
  };
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalZAR: number;
  status: string;
  createdAt: Date;
}

export async function getRecentOrders(limit = 6): Promise<RecentOrder[]> {
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      totalZAR: orders.totalZAR,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows;
}
