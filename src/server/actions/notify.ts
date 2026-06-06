"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { user, orders, orderItems, products } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import { getResendConfig } from "@/server/db/integrations";
import { sendEmailWith } from "@/server/email/resend";
import { newProductEmail } from "@/server/email/templates";
import { site } from "@/data/site";
import { formatZAR } from "@/lib/format";

export interface NotifyResult {
  ok: boolean;
  sent?: number;
  error?: string;
}

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || site.url).replace(/\/+$/, "");

/**
 * Email opted-in, verified customers about a product.
 *  - "category": only customers who've bought something in the same category.
 *  - "all": every opted-in customer.
 * Marketing emails are consent-gated (marketingOptIn) per POPIA.
 */
export async function notifyAboutProduct(
  productId: string,
  audience: "category" | "all"
): Promise<NotifyResult> {
  await requireAdmin();

  const config = await getResendConfig();
  if (!config) {
    return { ok: false, error: "Enable Resend (email) before sending notifications." };
  }

  const [p] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!p) return { ok: false, error: "Product not found." };

  let recipients: { email: string; name: string }[];
  if (audience === "all") {
    recipients = await db
      .selectDistinct({ email: user.email, name: user.name })
      .from(user)
      .where(and(eq(user.marketingOptIn, true), eq(user.emailVerified, true)));
  } else {
    recipients = await db
      .selectDistinct({ email: user.email, name: user.name })
      .from(user)
      .innerJoin(orders, eq(orders.userId, user.id))
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(
        and(
          eq(user.marketingOptIn, true),
          eq(user.emailVerified, true),
          eq(products.categoryId, p.categoryId)
        )
      );
  }

  if (recipients.length === 0) return { ok: true, sent: 0 };

  const imageUrl = p.image
    ? p.image.startsWith("http")
      ? p.image
      : `${appUrl()}${p.image}`
    : "";
  const productUrl = `${appUrl()}/product/${p.slug}`;
  const priceText = p.priceMaxZAR
    ? `${formatZAR(p.priceZAR)} – ${formatZAR(p.priceMaxZAR)}`
    : formatZAR(p.priceZAR);

  let sent = 0;
  for (const r of recipients) {
    const mail = newProductEmail(r.name, {
      name: p.name,
      tagline: p.tagline,
      priceText,
      imageUrl,
      productUrl,
    });
    const res = await sendEmailWith(config, {
      to: r.email,
      subject: mail.subject,
      html: mail.html,
    });
    if (res.ok) sent++;
  }

  await db
    .update(products)
    .set({ notifiedAt: new Date() })
    .where(eq(products.id, productId));
  revalidatePath("/admin/products");
  return { ok: true, sent };
}
