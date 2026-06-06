/** Client-safe password strength scoring for the strength meter. */

export const MIN_PASSWORD = 8;

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** Tailwind text/bg colour token suffix. */
  tone: "clay" | "taupe" | "olive";
}

export function passwordStrength(pw: string): PasswordStrength {
  let score = 0;
  if (pw.length >= MIN_PASSWORD) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const label = ["Too weak", "Weak", "Okay", "Good", "Strong"][s];
  const tone = s <= 1 ? "clay" : s === 2 ? "taupe" : "olive";
  return { score: s, label, tone };
}

/** Minimum we accept for submit. */
export const passwordOk = (pw: string) => pw.length >= MIN_PASSWORD;
