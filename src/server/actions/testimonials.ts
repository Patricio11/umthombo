"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { testimonials } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import { testimonialSchema, type TestimonialInput } from "@/lib/admin-schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidate() {
  revalidatePath("/", "layout");
}

export async function createTestimonial(
  input: TestimonialInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = testimonialSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${testimonials.sortOrder}), -1)::int` })
    .from(testimonials);
  await db.insert(testimonials).values({ ...parsed.data, sortOrder: max + 1 });
  revalidate();
  return { ok: true };
}

export async function updateTestimonial(
  id: string,
  input: TestimonialInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = testimonialSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await db.update(testimonials).set(parsed.data).where(eq(testimonials.id, id));
  revalidate();
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  await requireAdmin();
  await db.delete(testimonials).where(eq(testimonials.id, id));
  revalidate();
  return { ok: true };
}

export async function toggleTestimonialPublished(
  id: string,
  published: boolean
): Promise<ActionResult> {
  await requireAdmin();
  await db.update(testimonials).set({ published }).where(eq(testimonials.id, id));
  revalidate();
  return { ok: true };
}

export async function moveTestimonial(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  await requireAdmin();
  const ordered = await db
    .select({ id: testimonials.id, sortOrder: testimonials.sortOrder })
    .from(testimonials)
    .orderBy(asc(testimonials.sortOrder), asc(testimonials.name));
  const idx = ordered.findIndex((t) => t.id === id);
  if (idx === -1) return { ok: false, error: "Not found." };
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= ordered.length) return { ok: true };
  const a = ordered[idx];
  const b = ordered[swap];
  await db.transaction(async (tx) => {
    await tx.update(testimonials).set({ sortOrder: b.sortOrder }).where(eq(testimonials.id, a.id));
    await tx.update(testimonials).set({ sortOrder: a.sortOrder }).where(eq(testimonials.id, b.id));
  });
  revalidate();
  return { ok: true };
}
