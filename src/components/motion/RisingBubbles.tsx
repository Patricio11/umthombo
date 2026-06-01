"use client";

import { useReducedMotion } from "motion/react";

/** Soft rising-bubble particles — the fountain motif. Used sparingly. */
export function RisingBubbles({
  count = 7,
  color = "var(--color-clay)",
  className = "",
}: {
  count?: number;
  color?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  // Deterministic pseudo-positions so SSR and client agree (no Math.random).
  const bubbles = Array.from({ length: count }, (_, i) => {
    const left = (i * 47 + 11) % 100;
    const size = 5 + ((i * 13) % 9);
    const delay = (i * 0.7) % 4;
    const duration = 5 + ((i * 3) % 4);
    return { left, size, delay, duration };
  });

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            background: color,
            opacity: 0.25,
            animation: `rise ${b.duration}s var(--ease-spring) ${b.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
