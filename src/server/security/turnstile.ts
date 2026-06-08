import "server-only";

/**
 * Verify a Cloudflare Turnstile token from our own server actions (Better
 * Auth's captcha plugin only covers its endpoints). Returns true when no secret
 * is configured (disabled), so forms keep working before keys are set.
 */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // disabled
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
        cache: "no-store",
      }
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
