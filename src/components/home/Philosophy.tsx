"use client";

import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion/Reveal";
import { commitments } from "@/data/site";

/** A small line-drawn leaf that draws on as the item reveals. */
function Leaf() {
  const reduce = useReducedMotion();
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <motion.path
        d="M5 21C5 12 12 5 21 5c0 9-7 16-16 16Z"
        className="stroke-olive"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
      <motion.path
        d="M6 20C9 16 14 11 19 8"
        className="stroke-olive"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: "easeInOut", delay: 0.2 }}
      />
    </svg>
  );
}

export function Philosophy() {
  return (
    <section className="bg-cream-2 px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-14 max-w-2xl">
          <p className="eyebrow text-olive">Our commitment to you</p>
          <h2 className="mt-4 font-display text-4xl font-light tracking-tight lg:text-5xl">
            The things we won&rsquo;t compromise
          </h2>
        </Reveal>

        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {commitments.map((c, i) => (
            <Reveal key={c.title} delay={(i % 3) * 0.06}>
              <div className="flex flex-col">
                <Leaf />
                <h3 className="mt-4 font-display text-2xl">{c.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{c.body}</p>
              </div>
            </Reveal>
          ))}

          {/* the 10% pledge as a quiet final card */}
          <Reveal delay={0.12}>
            <div className="flex h-full flex-col justify-center rounded-3xl bg-olive/10 p-7">
              <p className="font-display text-3xl text-olive">10% off</p>
              <p className="mt-2 leading-relaxed text-ink-soft">
                Bring or reuse your own container and we&rsquo;ll take 10% off —
                a small thank-you for a smaller footprint.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
