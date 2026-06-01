"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { RisingBubbles } from "@/components/motion/RisingBubbles";

export function OrderSuccess({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-col items-center px-8 py-14 text-center"
    >
      <RisingBubbles count={9} color="var(--color-olive)" />

      {/* a fountain that "fills" with a soft wax glow */}
      <div className="relative mb-6">
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-olive/30 blur-2xl"
          animate={reduce ? undefined : { opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <svg width="84" height="84" viewBox="0 0 72 72" fill="none" aria-hidden>
          <circle cx="36" cy="36" r="34" className="stroke-olive/30" strokeWidth="1.5" />
          <motion.path
            d="M22 38l9 9 19-21"
            className="stroke-olive"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
      </div>

      <h3 className="font-display text-3xl">We&rsquo;ve opened WhatsApp</h3>
      <p className="mt-3 max-w-sm text-ink-soft">
        Your order is ready in a message — just hit send and we&rsquo;ll be in
        touch to confirm the details. Thank you for choosing something
        handmade. 🌱
      </p>

      <Button size="lg" className="mt-8" onClick={onDone}>
        Lovely — done
      </Button>
      <p className="mt-4 text-xs text-ink-soft">
        Didn&rsquo;t open? Check that pop-ups are allowed, or message us on{" "}
        <span className="text-clay">+27 63 705 3286</span>.
      </p>
    </motion.div>
  );
}
