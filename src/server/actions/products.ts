"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import { productSchema, type ProductInput } from "@/lib/admin-schemas";
import {
  uploadProductImage,
  deleteProductImage,
} from "@/server/storage/supabase";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidate() {
  revalidatePath("/", "layout");
}

async function slugTaken(slug: string, exceptId?: string) {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(
      exceptId
        ? and(eq(products.slug, slug), ne(products.id, exceptId))
        : eq(products.slug, slug)
    )
    .limit(1);
  return rows.length > 0;
}

export async function createProduct(
  input: ProductInput
): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (await slugTaken(parsed.data.slug)) {
    return { ok: false, error: "That slug is already in use." };
  }
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${products.sortOrder}), -1)::int` })
    .from(products);
  const [row] = await db
    .insert(products)
    .values({ ...parsed.data, sortOrder: max + 1 })
    .returning({ id: products.id });
  revalidate();
  return { ok: true, id: row.id };
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (await slugTaken(parsed.data.slug, id)) {
    return { ok: false, error: "That slug is already in use." };
  }
  await db.update(products).set(parsed.data).where(eq(products.id, id));
  revalidate();
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();
  const [row] = await db
    .select({ image: products.image, gallery: products.gallery })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  await db.delete(products).where(eq(products.id, id));
  // Best-effort cleanup of uploaded images (no-ops for seed paths).
  if (row) {
    const urls = [row.image, ...(row.gallery ?? [])].filter(Boolean);
    await Promise.allSettled(urls.map((u) => deleteProductImage(u)));
  }
  revalidate();
  return { ok: true };
}

export async function toggleFeatured(
  id: string,
  featured: boolean
): Promise<ActionResult> {
  await requireAdmin();
  await db.update(products).set({ featured }).where(eq(products.id, id));
  revalidate();
  return { ok: true };
}

export async function setProductStatus(
  id: string,
  status: "draft" | "active"
): Promise<ActionResult> {
  await requireAdmin();
  await db.update(products).set({ status }).where(eq(products.id, id));
  revalidate();
  return { ok: true };
}

/** Upload a single image (FormData with `file`) → returns its public URL. */
export async function uploadImage(
  formData: FormData
): Promise<{ ok: boolean; url?: string; error?: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file received." };
  }
  try {
    const url = await uploadProductImage(file);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
