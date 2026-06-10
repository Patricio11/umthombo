"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { posts } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import { postSchema, type PostInput, type PostStatus } from "@/lib/post-schema";
import { normaliseTags, readingMinutes } from "@/lib/journal";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Revalidate every surface a post can appear on. */
function revalidate(slug?: string) {
  revalidatePath("/journal");
  revalidatePath("/journal/rss.xml");
  revalidatePath("/admin/journal");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/journal/${slug}`);
}

/** Shared mapping from validated input → DB columns. */
function toRow(d: ReturnType<typeof postSchema.parse>) {
  const tags = normaliseTags(d.tags);
  return {
    title: d.title,
    slug: d.slug,
    excerpt: d.excerpt,
    body: d.body,
    coverImage: d.coverImage,
    coverAlt: d.coverAlt || d.title, // sensible alt fallback
    tags,
    status: d.status,
    featured: d.featured,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
    readingMinutes: readingMinutes(d.body),
  };
}

function isUniqueViolation(err: unknown): boolean {
  const msg = (err as Error)?.message ?? "";
  return /unique|duplicate|posts_slug_unique/i.test(msg);
}

export async function createPost(input: PostInput): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid post." };
  }
  const row = toRow(parsed.data);
  try {
    const [created] = await db
      .insert(posts)
      .values({
        ...row,
        publishedAt: row.status === "published" ? new Date() : null,
      })
      .returning({ id: posts.id });
    revalidate(row.slug);
    return { ok: true, id: created.id };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: "That slug is already taken." };
    }
    console.error("[journal] createPost failed:", err);
    return { ok: false, error: "Couldn’t save the post." };
  }
}

export async function updatePost(id: string, input: PostInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid post." };
  }
  const row = toRow(parsed.data);

  const [existing] = await db
    .select({ slug: posts.slug, publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "Post not found." };

  // Stamp publishedAt the first time it goes live; keep the original date after.
  const publishedAt =
    row.status === "published"
      ? existing.publishedAt ?? new Date()
      : existing.publishedAt;

  try {
    await db.update(posts).set({ ...row, publishedAt }).where(eq(posts.id, id));
    revalidate(row.slug);
    if (existing.slug !== row.slug) revalidate(existing.slug); // old URL too
    return { ok: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: "That slug is already taken." };
    }
    console.error("[journal] updatePost failed:", err);
    return { ok: false, error: "Couldn’t save the post." };
  }
}

/** Publish/unpublish from the list (the eye toggle). */
export async function setPostStatus(id: string, status: PostStatus): Promise<ActionResult> {
  await requireAdmin();
  const [existing] = await db
    .select({ publishedAt: posts.publishedAt, slug: posts.slug })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "Post not found." };

  await db
    .update(posts)
    .set({
      status,
      publishedAt:
        status === "published" ? existing.publishedAt ?? new Date() : existing.publishedAt,
    })
    .where(eq(posts.id, id));
  revalidate(existing.slug);
  return { ok: true };
}

export async function toggleFeatured(id: string, featured: boolean): Promise<ActionResult> {
  await requireAdmin();
  await db.update(posts).set({ featured }).where(eq(posts.id, id));
  revalidate();
  return { ok: true };
}

export async function deletePost(id: string): Promise<ActionResult> {
  await requireAdmin();
  const [existing] = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  await db.delete(posts).where(eq(posts.id, id));
  revalidate(existing?.slug);
  return { ok: true };
}
