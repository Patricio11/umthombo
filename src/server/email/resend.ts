import "server-only";
import { getResendConfig } from "@/server/db/integrations";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send an email through Resend if the integration is enabled & configured.
 * No-ops gracefully (returns false) when email is off — callers shouldn't
 * fail because notifications are unavailable.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const config = await getResendConfig();
  if (!config) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[resend] send failed:", res.status, text.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[resend] send error:", err);
    return false;
  }
}
