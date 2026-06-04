"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion/Reveal";
import { featured } from "@/data/products";
import { formatZAR } from "@/lib/format";
import { accentFor, accentClasses } from "@/lib/accents";
import { QuickAddButton } from "@/components/shop/QuickAddButton";

export function Featured() {
  const reduce = useReducedMotion();
  const items = featured.slice(0, 4);

  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-14 max-w-2xl">
          <p className="eyebrow text-olive">Hand-picked</p>
          <h2 className="mt-4 font-display text-4xl font-light tracking-tight lg:text-5xl">
            A few we&rsquo;d reach for first
          </h2>
        </Reveal>

        <div className="space-y-20 lg:space-y-28">
          {items.map((p, i) => {
            const flip = i % 2 === 1;
            const accent = accentClasses[accentFor[p.category]];
            return (
              <div
                key={p.slug}
                className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
              >
                {/* Image */}
                <motion.div
                  initial={reduce ? false : { opacity: 0, x: flip ? 40 : -40 }}
                  whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-15% 0px" }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className={flip ? "lg:order-2" : ""}
                >
                  <Link
                    href={`/product/${p.slug}`}
                    className="group relative block aspect-[5/6] overflow-hidden blob-1"
                  >
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-transform duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                    />
                  </Link>
                </motion.div>

                {/* Copy */}
                <Reveal
                  delay={0.05}
                  className={flip ? "lg:order-1 lg:pr-8" : "lg:pl-8"}
                >
                  <p className={`eyebrow ${accent.text}`}>
                    {p.notes?.split("·")[0]?.trim() || "Handmade"}
                  </p>
                  <h3 className="mt-3 font-display text-5xl font-light leading-[0.95] tracking-tight lg:text-6xl">
                    {p.name}
                  </h3>
                  <p className="editorial-italic mt-4 text-xl text-ink-soft">
                    {p.tagline}
                  </p>
                  <p className="mt-5 max-w-md leading-relaxed text-ink-soft">
                    {p.description}
                  </p>

                  <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                    {p.notes && (
                      <div>
                        <dt className="text-ink-soft/70">Notes</dt>
                        <dd className="mt-0.5">{p.notes}</dd>
                      </div>
                    )}
                    {p.size && (
                      <div>
                        <dt className="text-ink-soft/70">Size</dt>
                        <dd className="mt-0.5">{p.size}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-5 font-display text-2xl">
                    {formatZAR(p.priceZAR)}
                    {p.priceMaxZAR && (
                      <span className="text-ink-soft">
                        {" "}
                        – {formatZAR(p.priceMaxZAR)}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-5">
                    <QuickAddButton product={p} />
                    <Link
                      href={`/product/${p.slug}`}
                      className="link-underline text-base text-olive"
                    >
                      View &amp; order
                    </Link>
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
