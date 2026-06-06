"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { faqs } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const faqSchema = z.object({
  question: z.string().trim().min(1, "A question is required.").max(300),
  answer: z.string().trim().min(1, "An answer is required.").max(3000),
  category: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : null)),
  published: z.boolean().default(true),
});
export type FaqInput = z.input<typeof faqSchema>;

function revalidate() {
  revalidatePath("/faq");
  revalidatePath("/admin/faqs");
}

export async function createFaq(input: FaqInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = faqSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${faqs.sortOrder}), -1)::int` })
    .from(faqs);
  await db.insert(faqs).values({ ...parsed.data, sortOrder: max + 1 });
  revalidate();
  return { ok: true };
}

export async function updateFaq(
  id: string,
  input: FaqInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = faqSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await db.update(faqs).set(parsed.data).where(eq(faqs.id, id));
  revalidate();
  return { ok: true };
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  await requireAdmin();
  await db.delete(faqs).where(eq(faqs.id, id));
  revalidate();
  return { ok: true };
}

export async function toggleFaqPublished(
  id: string,
  published: boolean
): Promise<ActionResult> {
  await requireAdmin();
  await db.update(faqs).set({ published }).where(eq(faqs.id, id));
  revalidate();
  return { ok: true };
}

export async function moveFaq(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  await requireAdmin();
  const ordered = await db
    .select({ id: faqs.id, sortOrder: faqs.sortOrder })
    .from(faqs)
    .orderBy(asc(faqs.sortOrder));
  const idx = ordered.findIndex((f) => f.id === id);
  if (idx === -1) return { ok: false, error: "Not found." };
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= ordered.length) return { ok: true };
  const a = ordered[idx];
  const b = ordered[swap];
  await db.transaction(async (tx) => {
    await tx.update(faqs).set({ sortOrder: b.sortOrder }).where(eq(faqs.id, a.id));
    await tx.update(faqs).set({ sortOrder: a.sortOrder }).where(eq(faqs.id, b.id));
  });
  revalidate();
  return { ok: true };
}
