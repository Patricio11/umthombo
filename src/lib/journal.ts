/** Journal helpers — client-safe (no server imports). */
import { slugify } from "@/lib/admin-schemas";

/** A tag's URL slug ("Candle Care" → "candle-care"). */
export const tagSlug = (tag: string): string => slugify(tag);

/** A tag's display label from its slug ("candle-care" → "Candle care"). */
export function tagLabel(slug: string): string {
  const s = slug.replace(/-/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Estimated reading time in minutes from Markdown source (~200 wpm, min 1). */
export function readingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Normalise a list of free-typed tags: trim, drop blanks, de-dupe (case-insensitive). */
export function normaliseTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().replace(/\s+/g, " ");
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
