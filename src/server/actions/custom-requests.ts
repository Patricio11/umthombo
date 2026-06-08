"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { customRequests, categories } from "@/server/db/schema";
import { getCurrentUser, requireAdmin } from "@/server/auth/guard";
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
  customRequestQuotedEmail,
  customRequestDeclinedEmail,
  customRequestStatusEmail,
} from "@/server/email/templates";
import { getSiteSettings } from "@/server/db/settings";
import { uploadReferenceImage as uploadRefImage } from "@/server/storage/supabase";
import { startGatewayPayment } from "@/server/payments/gateway";
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

/* ------------------------------------------------------------------ */
/*  Payments (public — capability is the status token)                 */
/* ------------------------------------------------------------------ */
export interface StartPaymentActionResult {
  ok: boolean;
  error?: string;
  redirectUrl?: string;
}

/** Start the deposit or balance payment from the customer's status page. */
export async function startCustomPayment(
  token: string,
  kind: "deposit" | "balance"
): Promise<StartPaymentActionResult> {
  const [row] = await db
    .select()
    .from(customRequests)
    .where(eq(customRequests.statusToken, token))
    .limit(1);
  if (!row) return { ok: false, error: "Request not found." };
  if (row.quotedPriceZAR == null) return { ok: false, error: "No quote yet." };

  let amount: number;
  let reference: string;
  if (kind === "deposit") {
    if (!row.depositRequired || !row.depositZAR) {
      return { ok: false, error: "No deposit is required." };
    }
    if (row.depositPaidAt) return { ok: false, error: "Your deposit is already paid." };
    amount = row.depositZAR;
    reference = `${row.requestNumber}-DEP-${row.depositZAR}`;
  } else {
    if (row.balancePaidAt) return { ok: false, error: "Your balance is already paid." };
    if (row.status !== "ready" && row.status !== "completed") {
      return { ok: false, error: "Your balance isn’t due yet." };
    }
    const balance =
      row.depositRequired && row.depositZAR
        ? Math.max(0, row.quotedPriceZAR - row.depositZAR)
        : row.quotedPriceZAR;
    if (balance < 1) return { ok: false, error: "Nothing left to pay." };
    amount = balance;
    reference = `${row.requestNumber}-BAL-${balance}`;
  }

  const statusUrl = `${appUrl()}/custom/request/${row.statusToken}`;
  const res = await startGatewayPayment({
    amountZAR: amount,
    reference,
    description: `Umthombo custom ${kind} · ${row.requestNumber}`,
    customerName: row.name,
    customerEmail: row.email,
    successUrl: `${statusUrl}?paid=${kind}`,
    failureUrl: `${statusUrl}?failed=1`,
    metadata: {
      customRequestId: row.id,
      kind,
      requestNumber: row.requestNumber,
    },
  });
  if (!res.ok || !res.redirectUrl) {
    return { ok: false, error: res.error ?? "Couldn’t start payment." };
  }
  return { ok: true, redirectUrl: res.redirectUrl };
}

/* ------------------------------------------------------------------ */
/*  Admin actions                                                      */
/* ------------------------------------------------------------------ */
export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidateRequest(id: string) {
  revalidatePath("/admin/custom-requests");
  revalidatePath(`/admin/custom-requests/${id}`);
  revalidatePath("/account/requests");
}

export async function declineCustomRequest(
  id: string,
  reason: string
): Promise<ActionResult> {
  await requireAdmin();
  const r = reason.trim();
  if (r.length < 3) return { ok: false, error: "Add a short reason." };
  const [row] = await db
    .select()
    .from(customRequests)
    .where(eq(customRequests.id, id))
    .limit(1);
  if (!row) return { ok: false, error: "Request not found." };

  await db
    .update(customRequests)
    .set({ status: "declined", declineReason: r, respondedAt: new Date() })
    .where(eq(customRequests.id, id));

  const settings = await getSiteSettings();
  const mail = customRequestDeclinedEmail({
    requestNumber: row.requestNumber,
    customerName: row.name,
    title: row.title,
    reason: r,
    whatsappHref: settings.whatsapp.href,
  });
  await sendEmail({ to: row.email, subject: mail.subject, html: mail.html });

  revalidateRequest(id);
  return { ok: true };
}

export interface QuoteInput {
  priceZAR: number;
  etaText?: string;
  etaDate?: string;
  depositRequired: boolean;
  depositZAR?: number;
  adminNote?: string;
}

export async function quoteCustomRequest(
  id: string,
  input: QuoteInput
): Promise<ActionResult> {
  await requireAdmin();
  const price = Math.round(Number(input.priceZAR));
  if (!Number.isFinite(price) || price < 1) {
    return { ok: false, error: "Enter a valid total price." };
  }
  const depositRequired = !!input.depositRequired;
  let depositZAR: number | null = null;
  if (depositRequired) {
    const dep = Math.round(Number(input.depositZAR ?? 0));
    if (!Number.isFinite(dep) || dep < 1 || dep >= price) {
      return { ok: false, error: "Deposit must be at least R1 and below the total." };
    }
    depositZAR = dep;
  }
  const [row] = await db
    .select()
    .from(customRequests)
    .where(eq(customRequests.id, id))
    .limit(1);
  if (!row) return { ok: false, error: "Request not found." };

  await db
    .update(customRequests)
    .set({
      status: "quoted",
      quotedPriceZAR: price,
      etaText: input.etaText?.trim() || null,
      etaDate: input.etaDate ? new Date(input.etaDate) : null,
      depositRequired,
      depositZAR,
      adminNote: input.adminNote?.trim() || null,
      respondedAt: new Date(),
    })
    .where(eq(customRequests.id, id));

  const settings = await getSiteSettings();
  const statusUrl = `${appUrl()}/custom/request/${row.statusToken}`;
  const mail = customRequestQuotedEmail({
    requestNumber: row.requestNumber,
    customerName: row.name,
    title: row.title,
    quotedPriceZAR: price,
    etaText: input.etaText?.trim() || null,
    depositRequired,
    depositZAR,
    statusUrl,
    whatsappHref: settings.whatsapp.href,
    adminNote: input.adminNote?.trim() || null,
  });
  await sendEmail({ to: row.email, subject: mail.subject, html: mail.html });

  revalidateRequest(id);
  return { ok: true };
}

const STATUS_EMAIL: Record<string, { heading: string; message: string }> = {
  in_progress: {
    heading: "We’ve started your piece",
    message:
      "Your custom piece is now being made. We’ll let you know the moment it’s ready.",
  },
  ready: {
    heading: "Your piece is ready",
    message:
      "Your custom piece is ready! You can settle the balance from your request page below, and we’ll arrange delivery or collection.",
  },
  completed: {
    heading: "All done — thank you",
    message:
      "Your custom order is complete. Thank you for letting us make something special for you.",
  },
  cancelled: {
    heading: "Your request was cancelled",
    message:
      "Your custom request has been cancelled. If that’s unexpected, please reach out.",
  },
};

export async function setCustomRequestStatus(
  id: string,
  status:
    | "pending"
    | "quoted"
    | "in_progress"
    | "ready"
    | "completed"
    | "cancelled"
): Promise<ActionResult> {
  await requireAdmin();
  const [row] = await db
    .select()
    .from(customRequests)
    .where(eq(customRequests.id, id))
    .limit(1);
  if (!row) return { ok: false, error: "Request not found." };

  await db
    .update(customRequests)
    .set({ status })
    .where(eq(customRequests.id, id));

  const tpl = STATUS_EMAIL[status];
  if (tpl) {
    const settings = await getSiteSettings();
    const mail = customRequestStatusEmail({
      requestNumber: row.requestNumber,
      customerName: row.name,
      title: row.title,
      heading: tpl.heading,
      message: tpl.message,
      statusUrl: `${appUrl()}/custom/request/${row.statusToken}`,
      whatsappHref: settings.whatsapp.href,
    });
    await sendEmail({ to: row.email, subject: mail.subject, html: mail.html });
  }

  revalidateRequest(id);
  return { ok: true };
}
