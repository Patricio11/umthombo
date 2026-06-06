"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { reviews, products } from "@/server/db/schema";
import { requireUser, requireAdmin, getCurrentUser } from "@/server/auth/guard";
import { canReview, getMyReview, type MyReview } from "@/server/db/reviews";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1, "Pick a rating.").max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(3, "Please write a little more.").max(2000),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

async function revalidateProduct(productId: string) {
  const [p] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (p?.slug) revalidatePath(`/product/${p.slug}`);
}

export interface ReviewEligibility {
  eligible: boolean;
  myReview: MyReview | null;
}

/** Client island helper: can the current user review this, and have they? */
export async function getReviewEligibility(
  productId: string
): Promise<ReviewEligibility> {
  const user = await getCurrentUser();
  if (!user) return { eligible: false, myReview: null };
  const [orderId, mine] = await Promise.all([
    canReview(user.id, productId),
    getMyReview(user.id, productId),
  ]);
  return { eligible: !!orderId, myReview: mine };
}

/** Customer: create or update their review for a product they've paid for. */
export async function submitReview(input: ReviewInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid review." };
  }
  const d = parsed.data;
  const orderId = await canReview(user.id, d.productId);
  if (!orderId) {
    return { ok: false, error: "You can review this once your order is paid." };
  }

  await db
    .insert(reviews)
    .values({
      productId: d.productId,
      userId: user.id,
      orderId,
      authorName: user.name || "Customer",
      rating: d.rating,
      title: d.title || null,
      body: d.body,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [reviews.userId, reviews.productId],
      set: {
        rating: d.rating,
        title: d.title || null,
        body: d.body,
        status: "pending", // edits go back through moderation
        orderId,
        updatedAt: new Date(),
      },
    });

  await revalidateProduct(d.productId);
  revalidatePath("/admin/reviews");
  return { ok: true };
}

/** Admin: publish / reject / unpublish a review. */
export async function setReviewStatus(
  id: string,
  status: "published" | "rejected" | "pending"
): Promise<ActionResult> {
  await requireAdmin();
  const [r] = await db
    .select({ productId: reviews.productId })
    .from(reviews)
    .where(eq(reviews.id, id))
    .limit(1);
  await db.update(reviews).set({ status }).where(eq(reviews.id, id));
  if (r) await revalidateProduct(r.productId);
  revalidatePath("/admin/reviews");
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ActionResult> {
  await requireAdmin();
  const [r] = await db
    .select({ productId: reviews.productId })
    .from(reviews)
    .where(eq(reviews.id, id))
    .limit(1);
  await db.delete(reviews).where(eq(reviews.id, id));
  if (r) await revalidateProduct(r.productId);
  revalidatePath("/admin/reviews");
  return { ok: true };
}
