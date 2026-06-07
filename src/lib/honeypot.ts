/**
 * Honeypot anti-bot field. A decoy input that's hidden from real users (and
 * assistive tech) but that naive bots happily fill in. If it comes back with
 * any value, the submitter is almost certainly a bot.
 */
export const HONEYPOT_NAME = "company_website";

/** True when the honeypot was filled — treat the submission as a bot. */
export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
