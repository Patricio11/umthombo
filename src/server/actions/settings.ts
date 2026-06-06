"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import { settingsSchema, type SettingsInput } from "@/lib/admin-schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const nullify = (v: string) => (v.trim() ? v.trim() : null);

export async function updateSettings(
  input: SettingsInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;
  const digits = d.whatsappNumber.replace(/[^\d]/g, "");
  const values = {
    id: "site",
    tagline: nullify(d.tagline),
    story: nullify(d.story),
    collection: nullify(d.collection),
    whatsappNumber: digits || null,
    whatsappDisplay: nullify(d.whatsappDisplay),
    instagramHandle: nullify(d.instagramHandle),
    instagramUrl: nullify(d.instagramUrl),
    facebookHandle: nullify(d.facebookHandle),
    facebookUrl: nullify(d.facebookUrl),
    email: nullify(d.email),
  };
  await db
    .insert(settings)
    .values(values)
    .onConflictDoUpdate({ target: settings.id, set: values });
  revalidatePath("/", "layout");
  return { ok: true };
}
