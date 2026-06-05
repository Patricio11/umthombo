"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion/Reveal";
import type { CategoryView } from "@/lib/view-types";

// Asymmetric 12-col layout, cycled so any number of categories still flows.
const SPANS = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-5", "lg:col-span-7"];

export function CategoryTiles({ categories }: { categories: CategoryView[] }) {
  const reduce = useReducedMotion();
  if (categories.length === 0) return null;

  return (
    <section className="px-5 py-12 sm:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-4xl font-light tracking-tight lg:text-5xl">
            Ways to begin
          </h2>
          <Link href="/shop" className="link-underline text-olive">
            See everything
          </Link>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-12">
          {categories.map((cat, i) => {
            const href = cat.slug === "hampers" ? "/hampers" : `/shop/${cat.slug}`;
            return (
              <motion.div
                key={cat.id}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
                className={SPANS[i % SPANS.length]}
              >
                <Link
                  href={href}
                  className="group relative block aspect-[16/11] overflow-hidden rounded-[2rem] bg-taupe/20"
                >
                  {cat.image && (
                    <Image
                      src={cat.image}
                      alt={cat.label}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    />
                  )}
                  {/* System-green wash — clearly tinted, lightens on hover to
                      reveal the photo */}
                  <div className="absolute inset-0 bg-olive/55 transition-colors duration-500 group-hover:bg-olive/25" />
                  {/* Darken the foot for legible text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />

                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
                    <p className="eyebrow text-cream/85">{cat.eyebrow}</p>
                    <h3 className="mt-2 font-display text-3xl text-cream sm:text-4xl">
                      {cat.label}
                    </h3>
                    <p className="mt-1.5 max-w-xs text-sm text-cream/80 opacity-0 transition-all duration-500 group-hover:opacity-100">
                      {cat.blurb}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
