import "server-only";
import { getResendConfig } from "@/server/db/integrations";
import type { ResendConfig } from "@/lib/integrations";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/** Send via an explicit Resend config (used by the connection test too). */
export async function sendEmailWith(
  config: ResendConfig,
  input: SendEmailInput
): Promise<{ ok: boolean; error?: string }> {
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
      return { ok: false, error: text.slice(0, 200) || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[resend] send error:", err);
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Send an email through Resend if the integration is enabled & configured.
 * No-ops gracefully (returns false) when email is off.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const config = await getResendConfig();
  if (!config) return false;
  const res = await sendEmailWith(config, input);
  return res.ok;
}
