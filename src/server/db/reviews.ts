import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { reviews, orders, orderItems, products } from "@/server/db/schema";

export interface PublicReview {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: Date;
}

export interface ReviewStats {
  count: number;
  avg: number; // rounded to 1 dp
}

/** Published reviews for a product (newest first). */
export async function getProductReviews(
  productId: string
): Promise<PublicReview[]> {
  return db
    .select({
      id: reviews.id,
      authorName: reviews.authorName,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "published")))
    .orderBy(desc(reviews.createdAt));
}

export async function getReviewStats(productId: string): Promise<ReviewStats> {
  const [s] = await db
    .select({
      count: sql<number>`count(*)::int`,
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "published")));
  return { count: s?.count ?? 0, avg: Math.round((s?.avg ?? 0) * 10) / 10 };
}

/**
 * Can this user review this product? Returns the qualifying (paid) order id,
 * or null. Purchase-gated: the customer must have a paid order containing it.
 */
export async function canReview(
  userId: string,
  productId: string
): Promise<string | null> {
  const [row] = await db
    .select({ orderId: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.paymentStatus, "paid"),
        eq(orderItems.productId, productId)
      )
    )
    .limit(1);
  return row?.orderId ?? null;
}

export interface MyReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: "pending" | "published" | "rejected";
}

/** The current user's existing review for a product (any status), or null. */
export async function getMyReview(
  userId: string,
  productId: string
): Promise<MyReview | null> {
  const [row] = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      status: reviews.status,
    })
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.productId, productId)))
    .limit(1);
  return row ?? null;
}

/* ------------------------------------------------------------------ */
/*  Admin                                                              */
/* ------------------------------------------------------------------ */
export interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  status: "pending" | "published" | "rejected";
  createdAt: Date;
}

export async function getAdminReviews(): Promise<AdminReview[]> {
  return db
    .select({
      id: reviews.id,
      productId: reviews.productId,
      productName: products.name,
      productSlug: products.slug,
      authorName: reviews.authorName,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      status: reviews.status,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .leftJoin(products, eq(reviews.productId, products.id))
    .orderBy(desc(reviews.createdAt))
    .then((rows) =>
      rows.map((r) => ({
        ...r,
        productName: r.productName ?? "(deleted)",
        productSlug: r.productSlug ?? "",
      }))
    );
}
