"use client";

import { motion, useScroll, useSpring } from "motion/react";

/**
 * A whisper-thin progress bar that fills as you read. Scroll-linked (not a timed
 * animation), so it reads as orientation rather than decoration — but we still
 * soften it with a gentle spring for a premium feel.
 */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-olive via-olive-soft to-clay"
    />
  );
}
