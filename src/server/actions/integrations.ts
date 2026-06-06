"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { integrations } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import { SECRET_FIELDS, type IntegrationKey } from "@/lib/integrations";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

type Cfg = Record<string, unknown>;
const KEYS = new Set<IntegrationKey>(["bobgo", "yetopay", "resend", "whatsapp"]);

const pick = (...vals: unknown[]): string => {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
};

export async function updateIntegration(
  key: string,
  input: { enabled: boolean; config: Cfg }
): Promise<ActionResult> {
  await requireAdmin();
  if (!KEYS.has(key as IntegrationKey)) {
    return { ok: false, error: "Unknown integration." };
  }
  const k = key as IntegrationKey;
  const [row] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.key, k))
    .limit(1);
  if (!row) return { ok: false, error: "Integration not found." };

  const existing = (row.config ?? {}) as Cfg;
  const merged = mergeConfig(k, existing, input.config ?? {});

  await db
    .update(integrations)
    .set({ enabled: !!input.enabled, config: merged })
    .where(eq(integrations.key, k));

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Flip enabled on/off without touching the stored config. */
export async function toggleIntegration(
  key: string,
  enabled: boolean
): Promise<ActionResult> {
  await requireAdmin();
  if (!KEYS.has(key as IntegrationKey)) {
    return { ok: false, error: "Unknown integration." };
  }
  await db
    .update(integrations)
    .set({ enabled: !!enabled })
    .where(eq(integrations.key, key));
  revalidatePath("/", "layout");
  return { ok: true };
}

function mergeConfig(key: IntegrationKey, existing: Cfg, incoming: Cfg): Cfg {
  const out: Cfg = { ...existing };
  const secrets = SECRET_FIELDS[key];

  const setStr = (field: string, max = 500) => {
    const v = incoming[field];
    if (typeof v !== "string") return;
    const t = v.trim();
    if (secrets.includes(field)) {
      if (t) out[field] = t; // blank → keep existing secret
    } else {
      out[field] = t.slice(0, max);
    }
  };

  if (key === "bobgo") {
    setStr("apiKey");
    out.sandbox = incoming.sandbox === true;
    const col = (incoming.collection ?? {}) as Cfg;
    const ecol = (existing.collection ?? {}) as Cfg;
    out.collection = {
      company: pick(col.company, ecol.company),
      streetAddress: pick(col.streetAddress, ecol.streetAddress),
      localArea: pick(col.localArea, ecol.localArea),
      city: pick(col.city, ecol.city),
      zone: pick(col.zone, ecol.zone),
      country: pick(col.country, ecol.country, "ZA"),
      code: pick(col.code, ecol.code),
    };
  } else if (key === "yetopay") {
    setStr("apiKey");
    setStr("apiSecret");
    setStr("webhookSecret");
    setStr("baseUrl");
    setStr("merchantId");
    out.paymentMethod = incoming.paymentMethod === "card" ? "card" : "eft_direct";
    out.displayMode = incoming.displayMode === "iframe" ? "iframe" : "redirect";
  } else if (key === "resend") {
    setStr("apiKey");
    setStr("fromEmail", 160);
    setStr("fromName", 80);
  }
  // whatsapp has no config

  return out;
}
