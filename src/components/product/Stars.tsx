import { Star } from "lucide-react";

/** Read-only star display (rounded to the nearest whole star). */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= full ? "fill-clay text-clay" : "fill-none text-cream-3"}
        />
      ))}
    </span>
  );
}
