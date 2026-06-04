"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { categories, products } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import { categorySchema, type CategoryInput } from "@/lib/admin-schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidate() {
  revalidatePath("/", "layout");
}

async function slugTaken(slug: string, exceptId?: string) {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      exceptId
        ? and(eq(categories.slug, slug), ne(categories.id, exceptId))
        : eq(categories.slug, slug)
    )
    .limit(1);
  return rows.length > 0;
}

export async function createCategory(
  input: CategoryInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (await slugTaken(parsed.data.slug)) {
    return { ok: false, error: "That slug is already in use." };
  }
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${categories.sortOrder}), -1)::int` })
    .from(categories);
  await db.insert(categories).values({ ...parsed.data, sortOrder: max + 1 });
  revalidate();
  return { ok: true };
}

export async function updateCategory(
  id: string,
  input: CategoryInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (await slugTaken(parsed.data.slug, id)) {
    return { ok: false, error: "That slug is already in use." };
  }
  await db.update(categories).set(parsed.data).where(eq(categories.id, id));
  revalidate();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireAdmin();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.categoryId, id));
  if (n > 0) {
    return {
      ok: false,
      error: `This category has ${n} product${n === 1 ? "" : "s"}. Move or remove them first.`,
    };
  }
  await db.delete(categories).where(eq(categories.id, id));
  revalidate();
  return { ok: true };
}

/** Swap sortOrder with the neighbouring category in the given direction. */
export async function moveCategory(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  await requireAdmin();
  const ordered = await db
    .select({ id: categories.id, sortOrder: categories.sortOrder })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.label));
  const idx = ordered.findIndex((c) => c.id === id);
  if (idx === -1) return { ok: false, error: "Not found." };
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= ordered.length) return { ok: true };

  const a = ordered[idx];
  const b = ordered[swapWith];
  await db.transaction(async (tx) => {
    await tx
      .update(categories)
      .set({ sortOrder: b.sortOrder })
      .where(eq(categories.id, a.id));
    await tx
      .update(categories)
      .set({ sortOrder: a.sortOrder })
      .where(eq(categories.id, b.id));
  });
  revalidate();
  return { ok: true };
}
