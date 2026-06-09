import "server-only";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/server/db";
import {
  products,
  categories,
  testimonials,
  customRequests,
} from "@/server/db/schema";
import type { Accent } from "@/lib/accents";
import type {
  ProductView,
  CategoryView,
  TestimonialView,
} from "@/lib/view-types";

export type { ProductView, CategoryView, TestimonialView };

type ProductRow = typeof products.$inferSelect & {
  category: typeof categories.$inferSelect;
};

function toProductView(row: ProductRow): ProductView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category.slug,
    categoryLabel: row.category.label,
    categoryEyebrow: row.category.eyebrow,
    accent: (row.category.accent as Accent) ?? "olive",
    tagline: row.tagline,
    description: row.description,
    notes: row.notes,
    size: row.size,
    weight: row.weight,
    priceZAR: row.priceZAR,
    priceMaxZAR: row.priceMaxZAR,
    packPriceZAR: row.packPriceZAR,
    customisable: row.customisable,
    featured: row.featured,
    status: row.status,
    image: row.image,
    gallery: row.gallery ?? [],
    variants: row.variants ?? [],
  };
}

function toCategoryView(row: typeof categories.$inferSelect): CategoryView {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    eyebrow: row.eyebrow,
    accent: (row.accent as Accent) ?? "olive",
    blurb: row.blurb,
    image: row.image,
  };
}

/* ------------------------------------------------------------------ */
/*  Categories                                                         */
/* ------------------------------------------------------------------ */
export async function getCategories(): Promise<CategoryView[]> {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.label));
  return rows.map(toCategoryView);
}

export async function getCategoryBySlug(
  slug: string
): Promise<CategoryView | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return row ? toCategoryView(row) : null;
}

/* ------------------------------------------------------------------ */
/*  Products (public = active only)                                    */
/* ------------------------------------------------------------------ */
export async function getProducts(opts?: {
  category?: string;
}): Promise<ProductView[]> {
  let categoryId: string | undefined;
  if (opts?.category) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, opts.category))
      .limit(1);
    if (!cat) return [];
    categoryId = cat.id;
  }
  const rows = await db.query.products.findMany({
    where: categoryId
      ? and(eq(products.status, "active"), eq(products.categoryId, categoryId))
      : eq(products.status, "active"),
    with: { category: true },
    // Newest first; sortOrder (a creation counter) only breaks ties when two
    // products share a createdAt timestamp (e.g. a seeded batch).
    orderBy: [desc(products.createdAt), desc(products.sortOrder)],
  });
  return (rows as ProductRow[]).map(toProductView);
}

export async function getFeaturedProducts(
  limit = 4
): Promise<ProductView[]> {
  const rows = await db.query.products.findMany({
    where: and(eq(products.status, "active"), eq(products.featured, true)),
    with: { category: true },
    // Newest first; sortOrder (a creation counter) only breaks ties when two
    // products share a createdAt timestamp (e.g. a seeded batch).
    orderBy: [desc(products.createdAt), desc(products.sortOrder)],
    limit,
  });
  return (rows as ProductRow[]).map(toProductView);
}

export async function getCustomisableProducts(): Promise<ProductView[]> {
  const rows = await db.query.products.findMany({
    where: and(eq(products.status, "active"), eq(products.customisable, true)),
    with: { category: true },
    // Newest first; sortOrder (a creation counter) only breaks ties when two
    // products share a createdAt timestamp (e.g. a seeded batch).
    orderBy: [desc(products.createdAt), desc(products.sortOrder)],
  });
  return (rows as ProductRow[]).map(toProductView);
}

export async function getProductBySlug(
  slug: string
): Promise<ProductView | null> {
  const row = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: true },
  });
  return row ? toProductView(row as ProductRow) : null;
}

export async function getActiveProductSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.status, "active"));
  return rows.map((r) => r.slug);
}

export interface SitemapEntry {
  slug: string;
  image: string | null;
  updatedAt: Date;
}

/** Active products with their image + last-modified, for the sitemap. */
export async function getProductsForSitemap(): Promise<SitemapEntry[]> {
  return db
    .select({
      slug: products.slug,
      image: products.image,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(eq(products.status, "active"));
}

/** Categories with last-modified, for the sitemap. */
export async function getCategoriesForSitemap(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return db
    .select({ slug: categories.slug, updatedAt: categories.updatedAt })
    .from(categories)
    .orderBy(asc(categories.sortOrder));
}

export async function getRelatedProducts(
  product: Pick<ProductView, "id" | "category">,
  limit = 3
): Promise<ProductView[]> {
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, product.category))
    .limit(1);
  if (!cat) return [];
  const rows = await db.query.products.findMany({
    where: and(
      eq(products.status, "active"),
      eq(products.categoryId, cat.id),
      ne(products.id, product.id)
    ),
    with: { category: true },
    // Newest first; sortOrder (a creation counter) only breaks ties when two
    // products share a createdAt timestamp (e.g. a seeded batch).
    orderBy: [desc(products.createdAt), desc(products.sortOrder)],
    limit,
  });
  return (rows as ProductRow[]).map(toProductView);
}

/* ------------------------------------------------------------------ */
/*  Custom request - public status (by token)                          */
/* ------------------------------------------------------------------ */
export interface CustomRequestStatusView {
  requestNumber: string;
  title: string;
  status: string;
  requestType: string | null;
  scent: string | null;
  colour: string | null;
  size: string | null;
  occasion: string | null;
  quantity: number;
  notes: string | null;
  quotedPriceZAR: number | null;
  etaText: string | null;
  etaDate: Date | null;
  depositRequired: boolean;
  depositZAR: number | null;
  depositPaidAt: Date | null;
  balancePaidAt: Date | null;
  declineReason: string | null;
  createdAt: Date;
}

export async function getCustomRequestByToken(
  token: string
): Promise<CustomRequestStatusView | null> {
  const [row] = await db
    .select({
      requestNumber: customRequests.requestNumber,
      title: customRequests.title,
      status: customRequests.status,
      requestType: customRequests.requestType,
      scent: customRequests.scent,
      colour: customRequests.colour,
      size: customRequests.size,
      occasion: customRequests.occasion,
      quantity: customRequests.quantity,
      notes: customRequests.notes,
      quotedPriceZAR: customRequests.quotedPriceZAR,
      etaText: customRequests.etaText,
      etaDate: customRequests.etaDate,
      depositRequired: customRequests.depositRequired,
      depositZAR: customRequests.depositZAR,
      depositPaidAt: customRequests.depositPaidAt,
      balancePaidAt: customRequests.balancePaidAt,
      declineReason: customRequests.declineReason,
      createdAt: customRequests.createdAt,
    })
    .from(customRequests)
    .where(eq(customRequests.statusToken, token))
    .limit(1);
  return row ?? null;
}

export interface UserCustomRequestRow {
  id: string;
  requestNumber: string;
  statusToken: string;
  title: string;
  status: string;
  requestType: string | null;
  quotedPriceZAR: number | null;
  depositRequired: boolean;
  depositZAR: number | null;
  depositPaidAt: Date | null;
  balancePaidAt: Date | null;
  etaText: string | null;
  createdAt: Date;
}

export async function getUserCustomRequests(
  userId: string
): Promise<UserCustomRequestRow[]> {
  return db
    .select({
      id: customRequests.id,
      requestNumber: customRequests.requestNumber,
      statusToken: customRequests.statusToken,
      title: customRequests.title,
      status: customRequests.status,
      requestType: customRequests.requestType,
      quotedPriceZAR: customRequests.quotedPriceZAR,
      depositRequired: customRequests.depositRequired,
      depositZAR: customRequests.depositZAR,
      depositPaidAt: customRequests.depositPaidAt,
      balancePaidAt: customRequests.balancePaidAt,
      etaText: customRequests.etaText,
      createdAt: customRequests.createdAt,
    })
    .from(customRequests)
    .where(eq(customRequests.userId, userId))
    .orderBy(desc(customRequests.createdAt));
}

/* ------------------------------------------------------------------ */
/*  Testimonials (public = published only)                             */
/* ------------------------------------------------------------------ */
export async function getTestimonials(): Promise<TestimonialView[]> {
  const rows = await db
    .select()
    .from(testimonials)
    .where(eq(testimonials.published, true))
    .orderBy(asc(testimonials.sortOrder));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    quote: r.quote,
    location: r.location,
  }));
}
