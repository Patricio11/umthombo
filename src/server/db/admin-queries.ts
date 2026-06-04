import "server-only";
import { sql, desc, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  products,
  categories,
  testimonials,
  orders,
} from "@/server/db/schema";
import type { Accent } from "@/lib/accents";

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

export interface AdminCategory {
  id: string;
  slug: string;
  label: string;
  eyebrow: string;
  accent: Accent;
  blurb: string;
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
      sortOrder: products.sortOrder,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.sortOrder), asc(products.name));
  return rows.map((r) => ({ ...r, categoryLabel: r.categoryLabel ?? "—" }));
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
