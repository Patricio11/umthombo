import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { posts, type Post } from "@/server/db/schema";
import { tagSlug } from "@/lib/journal";

/** Light shape for cards/lists (no body/SEO/author). */
export interface PostCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
  tags: string[];
  readingMinutes: number;
  publishedAt: Date | null;
  featured: boolean;
}

const CARD = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  coverImage: posts.coverImage,
  coverAlt: posts.coverAlt,
  tags: posts.tags,
  readingMinutes: posts.readingMinutes,
  publishedAt: posts.publishedAt,
  featured: posts.featured,
} as const;

/* ------------------------------------------------------------------ */
/*  Public reads (published only)                                      */
/* ------------------------------------------------------------------ */

/** Published posts, newest first. Featured ones are excluded by default so the
 *  index can show the featured post in a hero without duplicating it. */
export async function getPublishedPosts(
  opts: { limit?: number; offset?: number; includeFeatured?: boolean } = {}
): Promise<PostCard[]> {
  const { limit = 12, offset = 0, includeFeatured = true } = opts;
  const where = includeFeatured
    ? eq(posts.status, "published")
    : and(eq(posts.status, "published"), eq(posts.featured, false));
  return db
    .select(CARD)
    .from(posts)
    .where(where)
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function countPublishedPosts(): Promise<number> {
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.status, "published"));
  return rows.length;
}

/** The newest featured, published post — the index hero. Null if none. */
export async function getFeaturedPost(): Promise<PostCard | null> {
  const [row] = await db
    .select(CARD)
    .from(posts)
    .where(and(eq(posts.status, "published"), eq(posts.featured, true)))
    .orderBy(desc(posts.publishedAt))
    .limit(1);
  return row ?? null;
}

/** A single published post by slug (full record). Null if missing/unpublished. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const [row] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .limit(1);
  return row ?? null;
}

/** Related posts: most shared tags, then most recent. Excludes the given slug. */
export async function getRelatedPosts(
  slug: string,
  tags: string[],
  limit = 3
): Promise<PostCard[]> {
  const others = await db
    .select(CARD)
    .from(posts)
    .where(and(eq(posts.status, "published"), ne(posts.slug, slug)))
    .orderBy(desc(posts.publishedAt));

  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  return others
    .map((p) => ({
      p,
      overlap: p.tags.filter((t) => tagSet.has(t.toLowerCase())).length,
    }))
    .sort((a, b) => b.overlap - a.overlap) // stable: recency already applied
    .slice(0, limit)
    .map((x) => x.p);
}

export interface TagCount {
  tag: string;
  slug: string;
  count: number;
}

/** Distinct tags across published posts, with counts (busiest first). */
export async function getAllTags(): Promise<TagCount[]> {
  const rows = await db
    .select({ tags: posts.tags })
    .from(posts)
    .where(eq(posts.status, "published"));

  const byTag = new Map<string, TagCount>();
  for (const row of rows) {
    for (const tag of row.tags) {
      const slug = tagSlug(tag);
      const existing = byTag.get(slug);
      if (existing) existing.count += 1;
      else byTag.set(slug, { tag, slug, count: 1 });
    }
  }
  return [...byTag.values()].sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag)
  );
}

/** Published posts carrying a tag (matched by slug, since tags are free-text). */
export async function getPostsByTagSlug(
  slug: string
): Promise<{ label: string; posts: PostCard[] }> {
  const rows = await db
    .select(CARD)
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt));

  let label = "";
  const matched = rows.filter((p) =>
    p.tags.some((t) => {
      if (tagSlug(t) !== slug) return false;
      if (!label) label = t; // first real-cased tag wins
      return true;
    })
  );
  return { label, posts: matched };
}

/* ------------------------------------------------------------------ */
/*  Admin reads (any status)                                           */
/* ------------------------------------------------------------------ */
export interface AdminPostRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  featured: boolean;
  tags: string[];
  publishedAt: Date | null;
  updatedAt: Date;
}

export async function getAdminPosts(): Promise<AdminPostRow[]> {
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      featured: posts.featured,
      tags: posts.tags,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .orderBy(desc(posts.updatedAt));
}

export async function getAdminPost(id: string): Promise<Post | null> {
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row ?? null;
}

export async function countPosts(): Promise<number> {
  const rows = await db.select({ id: posts.id }).from(posts);
  return rows.length;
}

/** Minimal rows for the sitemap (published only). */
export async function getPostsForSitemap(): Promise<
  { slug: string; updatedAt: Date; coverImage: string }[]
> {
  return db
    .select({
      slug: posts.slug,
      updatedAt: posts.updatedAt,
      coverImage: posts.coverImage,
    })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt));
}
