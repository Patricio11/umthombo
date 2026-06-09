import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { customRequests } from "@/server/db/schema";
import { sendEmail } from "@/server/email/resend";
import {
  customRequestStatusEmail,
  customRequestPaidAdminEmail,
} from "@/server/email/templates";
import { getSiteSettings } from "@/server/db/settings";
import { site } from "@/data/site";

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || site.url).replace(/\/+$/, "");

/**
 * Mark a custom-request deposit/balance paid and advance the lifecycle.
 * Called from the payment webhooks (matched by `metadata.customRequestId`).
 * Idempotent: guards on the *PaidAt timestamps, and the webhook layer already
 * de-dupes by event id.
 */
export async function handleCustomPaymentPaid(
  customRequestId: string,
  kind: "deposit" | "balance"
): Promise<void> {
  const [row] = await db
    .select()
    .from(customRequests)
    .where(eq(customRequests.id, customRequestId))
    .limit(1);
  if (!row) {
    console.warn("[custom payment] no request for", customRequestId);
    return;
  }

  const settings = await getSiteSettings();
  const statusUrl = `${appUrl()}/custom/request/${row.statusToken}`;
  const adminUrl = `${appUrl()}/admin/custom-requests`;

  if (kind === "deposit") {
    if (row.depositPaidAt) return;
    await db
      .update(customRequests)
      .set({
        depositPaidAt: new Date(),
        status: row.status === "quoted" ? "in_progress" : row.status,
      })
      .where(eq(customRequests.id, row.id));

    const c = customRequestStatusEmail({
      requestNumber: row.requestNumber,
      customerName: row.name,
      title: row.title,
      heading: "Deposit received - we’re on it",
      message:
        "Thank you! We’ve received your deposit and started work on your custom piece. We’ll let you know when it’s ready.",
      statusUrl,
      whatsappHref: settings.whatsapp.href,
    });
    await sendEmail({ to: row.email, subject: c.subject, html: c.html });

    const a = customRequestPaidAdminEmail({
      requestNumber: row.requestNumber,
      customerName: row.name,
      kind: "Deposit",
      amountZAR: row.depositZAR ?? 0,
      adminUrl,
    });
    await sendEmail({ to: settings.email, subject: a.subject, html: a.html });
    console.log("[custom payment] DEPOSIT paid", row.requestNumber);
    return;
  }

  // balance
  if (row.balancePaidAt) return;
  await db
    .update(customRequests)
    .set({ balancePaidAt: new Date(), status: "completed" })
    .where(eq(customRequests.id, row.id));

  const balance =
    row.quotedPriceZAR != null
      ? Math.max(0, row.quotedPriceZAR - (row.depositZAR ?? 0))
      : 0;

  const c = customRequestStatusEmail({
    requestNumber: row.requestNumber,
    customerName: row.name,
    title: row.title,
    heading: "Payment complete - thank you",
    message:
      "Your balance is settled and your custom order is complete. Thank you for letting us make something special for you.",
    statusUrl,
    whatsappHref: settings.whatsapp.href,
  });
  await sendEmail({ to: row.email, subject: c.subject, html: c.html });

  const a = customRequestPaidAdminEmail({
    requestNumber: row.requestNumber,
    customerName: row.name,
    kind: "Balance",
    amountZAR: balance,
    adminUrl,
  });
  await sendEmail({ to: settings.email, subject: a.subject, html: a.html });
  console.log("[custom payment] BALANCE paid", row.requestNumber);
}
