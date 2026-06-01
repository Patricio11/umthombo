"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { stagger, riseItem } from "@/components/motion/Reveal";
import { Logo } from "@/components/brand/Logo";
import { site } from "@/data/site";

export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // Gentle parallax — the blob drifts slower than the image.
  const blobY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const imgY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden px-5 pb-16 pt-32 sm:px-8 sm:pt-36 lg:pb-28 lg:pt-44"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-12 lg:gap-6">
        {/* Copy — off-center left, allowed to bleed */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="lg:col-span-7 lg:pr-6"
        >
          <motion.p
            variants={riseItem}
            className="eyebrow text-clay"
          >
            Cape Town · Handcrafted since {site.since}
          </motion.p>

          <motion.h1
            variants={riseItem}
            className="mt-5 font-display font-light leading-[0.92] tracking-tight"
            style={{ fontSize: "var(--text-display)" }}
          >
            Warmth,
            <br />
            <span className="text-clay">drawn from</span>
            <br />
            <span className="editorial-italic font-normal">the source.</span>
          </motion.h1>

          <motion.p
            variants={riseItem}
            className="mt-7 max-w-md text-lg leading-relaxed text-ink-soft"
          >
            {site.tagline} Candles, soaps and care, hand-poured in small
            batches and made with love &mdash; inspired by nature.
          </motion.p>

          <motion.div
            variants={riseItem}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-full bg-clay px-8 py-4 text-base font-medium text-cream transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-clay-soft hover:shadow-[0_12px_34px_-12px_rgba(166,64,44,0.7)] active:scale-[0.98]"
            >
              Explore the shop
            </Link>
            <Link
              href="/about"
              className="link-underline text-base text-ink"
            >
              Our story
            </Link>
          </motion.div>

          <motion.div
            variants={riseItem}
            className="mt-10 flex items-center gap-3 text-clay"
          >
            <Logo animate={!reduce} />
            <span className="editorial-italic text-ink-soft">
              {site.meaning}
            </span>
          </motion.div>
        </motion.div>

        {/* Image — organic blob mask, soft glow, parallax */}
        <div className="relative lg:col-span-5">
          <motion.div
            style={{ y: blobY }}
            aria-hidden
            className="absolute -right-10 -top-10 h-[88%] w-[88%] blob-1 bg-taupe/20"
          />
          <motion.div
            style={{ y: blobY }}
            aria-hidden
            className="animate-glow absolute right-6 top-10 h-2/3 w-2/3 rounded-full bg-clay/25 blur-3xl"
          />
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            style={{ y: imgY }}
            className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden blob-2 shadow-[0_30px_80px_-30px_rgba(42,36,32,0.4)]"
          >
            <Image
              src="/products/gelzen.jpg"
              alt="A hand-poured candle glowing softly on warm wood"
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 40vw"
              className="object-cover"
            />
          </motion.div>
        </div>
      </div>

      {/* quiet scroll cue */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="mx-auto mt-14 hidden max-w-7xl lg:block"
      >
        <span className="eyebrow text-ink-soft/60">Scroll to wander</span>
      </motion.div>
    </section>
  );
}
