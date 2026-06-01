"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The Umthombo mark: a stylised serif "U" (chalice / fountain spout) above a
 * calligraphic flourish that draws on via pathLength. Recreated as clean SVG
 * so it scales and animates.
 */
export function Logo({
  className,
  showWord = false,
  animate = true,
}: {
  className?: string;
  showWord?: boolean;
  animate?: boolean;
}) {
  const reduce = useReducedMotion();
  const draw = animate && !reduce;

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 64 72"
        className="h-9 w-auto"
        fill="none"
        aria-hidden
        role="img"
      >
        {/* The serif U — chalice form */}
        <path
          d="M14 10 v22 a18 18 0 0 0 36 0 V10 h-7 v22 a11 11 0 0 1 -22 0 V10 Z"
          fill="currentColor"
        />
        {/* Serif feet */}
        <rect x="9" y="8" width="17" height="4.5" rx="2" fill="currentColor" />
        <rect x="38" y="8" width="17" height="4.5" rx="2" fill="currentColor" />

        {/* The flourish / fountain spout that draws on */}
        <motion.path
          d="M10 56 C 20 48, 26 64, 32 56 C 38 48, 44 64, 54 56"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
          initial={draw ? { pathLength: 0, opacity: 0 } : false}
          animate={draw ? { pathLength: 1, opacity: 1 } : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
        {/* A single rising droplet above the spout */}
        <motion.circle
          cx="32"
          cy="48"
          r="2.4"
          fill="currentColor"
          initial={draw ? { y: 6, opacity: 0 } : false}
          animate={draw ? { y: 0, opacity: 1 } : { opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 1.4 }}
        />
      </svg>

      {showWord && (
        <span className="font-display text-xl leading-none tracking-tight">
          Umthombo
        </span>
      )}
    </span>
  );
}
