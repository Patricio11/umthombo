import "server-only";
import { sql, desc, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  products,
  categories,
  testimonials,
  orders,
  orderItems,
  customRequests,
  type CustomRequest,
} from "@/server/db/schema";
import type { Accent } from "@/lib/accents";
import type { OrderStatus } from "@/lib/order-schema";

export interface AdminStats {
  products: number;
  categories: number;
  testimonials: number;
  orders: number;
  ordersByStatus: Record<string, number>;
  customRequestsPending: number;
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
  const [[p], [c], [t], byStatus, [cr]] = await Promise.all([
    db.select({ n: count }).from(products),
    db.select({ n: count }).from(categories),
    db.select({ n: count }).from(testimonials),
    db
      .select({ status: orders.status, n: count })
      .from(orders)
      .groupBy(orders.status),
    db
      .select({ n: count })
      .from(customRequests)
      .where(eq(customRequests.status, "pending")),
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
    customRequestsPending: cr?.n ?? 0,
  };
}

export interface AdminCategory {
  id: string;
  slug: string;
  label: string;
  eyebrow: string;
  accent: Accent;
  blurb: string;
  image: string;
  sortOrder: number;
  productCount: number;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      label: categories.label,
      eyebrow: categories.eyebrow,
      accent: categories.accent,
      blurb: categories.blurb,
      image: categories.image,
      sortOrder: categories.sortOrder,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.label));
  return rows.map((r) => ({ ...r, accent: (r.accent as Accent) ?? "olive" }));
}

export async function getAdminCategory(
  id: string
): Promise<AdminCategory | null> {
  const list = await getAdminCategories();
  return list.find((c) => c.id === id) ?? null;
}

export interface AdminTestimonial {
  id: string;
  name: string;
  quote: string;
  location: string | null;
  sortOrder: number;
  published: boolean;
}

export async function getAdminTestimonials(): Promise<AdminTestimonial[]> {
  return db
    .select({
      id: testimonials.id,
      name: testimonials.name,
      quote: testimonials.quote,
      location: testimonials.location,
      sortOrder: testimonials.sortOrder,
      published: testimonials.published,
    })
    .from(testimonials)
    .orderBy(asc(testimonials.sortOrder), asc(testimonials.name));
}

export async function getAdminTestimonial(
  id: string
): Promise<AdminTestimonial | null> {
  const [row] = await db
    .select({
      id: testimonials.id,
      name: testimonials.name,
      quote: testimonials.quote,
      location: testimonials.location,
      sortOrder: testimonials.sortOrder,
      published: testimonials.published,
    })
    .from(testimonials)
    .where(eq(testimonials.id, id))
    .limit(1);
  return row ?? null;
}

export interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  categoryLabel: string;
  priceZAR: number;
  priceMaxZAR: number | null;
  featured: boolean;
  status: "draft" | "active";
  image: string;
}

export async function getAdminProducts(): Promise<AdminProductRow[]> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      categoryLabel: categories.label,
      priceZAR: products.priceZAR,
      priceMaxZAR: products.priceMaxZAR,
      featured: products.featured,
      status: products.status,
      image: products.image,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt));
  return rows.map((r) => ({ ...r, categoryLabel: r.categoryLabel ?? "" }));
}

export type AdminProductDetail = typeof products.$inferSelect;

export async function getAdminProduct(
  id: string
): Promise<AdminProductDetail | null> {
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return row ?? null;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalZAR: number;
  status: string;
  createdAt: Date;
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  totalZAR: number;
  status: OrderStatus;
  paymentStatus: "pending" | "paid" | "failed" | "cancelled";
  method: "delivery" | "collection";
  itemCount: number;
  image: string | null;
  createdAt: Date;
}

export async function getAdminOrders(): Promise<AdminOrderRow[]> {
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      totalZAR: orders.totalZAR,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      method: orders.method,
      createdAt: orders.createdAt,
      itemCount: sql<number>`count(${orderItems.id})::int`,
      // A representative thumbnail: an image of one product in the order.
      image: sql<string | null>`max(${products.image})`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(products.id, orderItems.productId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt));
  return rows;
}

export type AdminOrderDetail = typeof orders.$inferSelect & {
  items: {
    id: string;
    productId: string | null;
    name: string;
    variant: string | null;
    qty: number;
    unitPriceZAR: number;
    lineTotalZAR: number;
    image: string | null;
  }[];
};

export async function getAdminOrder(
  id: string
): Promise<AdminOrderDetail | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      name: orderItems.name,
      variant: orderItems.variant,
      qty: orderItems.qty,
      unitPriceZAR: orderItems.unitPriceZAR,
      lineTotalZAR: orderItems.lineTotalZAR,
      image: products.image,
    })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, id));
  return { ...order, items };
}

export interface OrderableProduct {
  id: string;
  name: string;
  priceZAR: number;
  variants: string[];
}

export async function getOrderableProducts(): Promise<OrderableProduct[]> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      priceZAR: products.priceZAR,
      variants: products.variants,
    })
    .from(products)
    .where(eq(products.status, "active"))
    .orderBy(asc(products.name));
  return rows.map((r) => ({ ...r, variants: r.variants ?? [] }));
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

/* ------------------------------------------------------------------ */
/*  Custom order requests                                              */
/* ------------------------------------------------------------------ */
export type CustomRequestStatus = CustomRequest["status"];

export interface AdminCustomRequestRow {
  id: string;
  requestNumber: string;
  name: string;
  requestType: string | null;
  status: CustomRequestStatus;
  quotedPriceZAR: number | null;
  createdAt: Date;
}

export async function getAdminCustomRequests(): Promise<AdminCustomRequestRow[]> {
  return db
    .select({
      id: customRequests.id,
      requestNumber: customRequests.requestNumber,
      name: customRequests.name,
      requestType: customRequests.requestType,
      status: customRequests.status,
      quotedPriceZAR: customRequests.quotedPriceZAR,
      createdAt: customRequests.createdAt,
    })
    .from(customRequests)
    .orderBy(desc(customRequests.createdAt));
}

export type AdminCustomRequestDetail = CustomRequest;

export async function getAdminCustomRequest(
  id: string
): Promise<AdminCustomRequestDetail | null> {
  const [row] = await db
    .select()
    .from(customRequests)
    .where(eq(customRequests.id, id))
    .limit(1);
  return row ?? null;
}

export async function countPendingCustomRequests(): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(customRequests)
    .where(eq(customRequests.status, "pending"));
  return r?.n ?? 0;
}
