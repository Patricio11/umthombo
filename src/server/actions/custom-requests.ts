"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { customRequests, categories } from "@/server/db/schema";
import { getCurrentUser } from "@/server/auth/guard";
import { resolveOrCreateUser } from "@/server/auth/account";
import { verifyTurnstile } from "@/server/security/turnstile";
import { isHoneypotFilled } from "@/lib/honeypot";
import {
  customRequestSchema,
  type CustomRequestInput,
} from "@/lib/custom-request-schema";
import { sendEmail } from "@/server/email/resend";
import {
  customRequestReceivedEmail,
  customRequestAdminEmail,
} from "@/server/email/templates";
import { getSiteSettings } from "@/server/db/settings";
import { uploadReferenceImage as uploadRefImage } from "@/server/storage/supabase";
import { site } from "@/data/site";

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || site.url).replace(/\/+$/, "");

function genRequestNumber(): string {
  const d = new Date();
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `CR-${ymd}-${rand}`;
}

export interface CreateCustomRequestResult {
  ok: boolean;
  error?: string;
  requestNumber?: string;
  statusToken?: string;
}

export async function createCustomRequest(
  input: CustomRequestInput
): Promise<CreateCustomRequestResult> {
  if (isHoneypotFilled(input.hp)) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  const parsed = customRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check your details.",
    };
  }
  const d = parsed.data;

  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    const human = await verifyTurnstile(d.captchaToken);
    if (!human) {
      return { ok: false, error: "Please complete the verification and try again." };
    }
  }

  const [cat] = await db
    .select({ id: categories.id, label: categories.label })
    .from(categories)
    .where(eq(categories.id, d.categoryId))
    .limit(1);
  if (!cat) return { ok: false, error: "Please choose a valid category." };

  // Every request is attached to a user (resolve existing, else auto-create).
  let userId = sessionUser?.id ?? null;
  let isNewAccount = false;
  if (!userId) {
    const resolved = await resolveOrCreateUser({
      name: d.name,
      email: d.email,
      phone: d.phone,
    });
    userId = resolved?.id ?? null;
    isNewAccount = resolved?.isNew ?? false;
  }

  const requestNumber = genRequestNumber();
  const statusToken =
    randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8);

  try {
    await db.insert(customRequests).values({
      requestNumber,
      statusToken,
      userId,
      name: d.name,
      email: d.email.toLowerCase(),
      phone: d.phone,
      categoryId: d.categoryId,
      title: d.title,
      scent: d.scent || null,
      colour: d.colour || null,
      size: d.size || null,
      occasion: d.occasion || null,
      quantity: d.quantity ?? 1,
      notes: d.notes || null,
      referenceImages: d.referenceImages?.length ? d.referenceImages : null,
    });
  } catch (err) {
    console.error("[custom-request] insert failed:", err);
    return { ok: false, error: "Couldn’t save your request. Please try again." };
  }

  // Notifications (best-effort — never block the submission).
  const statusUrl = `${appUrl()}/custom/request/${statusToken}`;
  const settings = await getSiteSettings();
  const clientMail = customRequestReceivedEmail({
    requestNumber,
    customerName: d.name,
    title: d.title,
    categoryLabel: cat.label,
    statusUrl,
    isNewAccount,
  });
  await sendEmail({ to: d.email, subject: clientMail.subject, html: clientMail.html });

  const adminMail = customRequestAdminEmail({
    requestNumber,
    customerName: d.name,
    customerEmail: d.email,
    customerPhone: d.phone,
    title: d.title,
    categoryLabel: cat.label,
    adminUrl: `${appUrl()}/admin/custom-requests`,
  });
  await sendEmail({
    to: settings.email,
    subject: adminMail.subject,
    html: adminMail.html,
    replyTo: d.email,
  });

  revalidatePath("/admin/custom-requests");
  return { ok: true, requestNumber, statusToken };
}

/** Guarded public upload for reference images (image-only, ≤6MB). */
export async function uploadReferenceImage(
  formData: FormData
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file received." };
  try {
    const url = await uploadRefImage(file);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
