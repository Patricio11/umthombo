import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { products, categories, testimonials } from "@/server/db/schema";
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
    deliveryFeeZAR: row.deliveryFeeZAR,
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
    orderBy: [asc(products.sortOrder), asc(products.name)],
  });
  return (rows as ProductRow[]).map(toProductView);
}

export async function getFeaturedProducts(
  limit = 4
): Promise<ProductView[]> {
  const rows = await db.query.products.findMany({
    where: and(eq(products.status, "active"), eq(products.featured, true)),
    with: { category: true },
    orderBy: [asc(products.sortOrder), asc(products.name)],
    limit,
  });
  return (rows as ProductRow[]).map(toProductView);
}

export async function getCustomisableProducts(): Promise<ProductView[]> {
  const rows = await db.query.products.findMany({
    where: and(eq(products.status, "active"), eq(products.customisable, true)),
    with: { category: true },
    orderBy: [asc(products.sortOrder), asc(products.name)],
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
    orderBy: [asc(products.sortOrder), asc(products.name)],
    limit,
  });
  return (rows as ProductRow[]).map(toProductView);
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
