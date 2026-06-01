"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion/Reveal";
import { accentClasses } from "@/lib/accents";

const tiles = [
  {
    href: "/shop/candles",
    eyebrow: "For the room",
    title: "Candles",
    blurb: "Sculptural, scented, slow to burn.",
    image: "/products/crimson-petal.jpg",
    accent: "olive" as const,
    span: "lg:col-span-7",
  },
  {
    href: "/shop/skin",
    eyebrow: "For the body",
    title: "Body & Skin",
    blurb: "Balms, soaps, scrubs your skin knows.",
    image: "/products/buttertastic-mega.jpg",
    accent: "olive" as const,
    span: "lg:col-span-5",
  },
  {
    href: "/shop/home",
    eyebrow: "For the air",
    title: "Diffusers & Mists",
    blurb: "A scent that settles in softly.",
    image: "/products/citrus-burst.jpg",
    accent: "olive" as const,
    span: "lg:col-span-5",
  },
  {
    href: "/hampers",
    eyebrow: "For giving",
    title: "Hampers",
    blurb: "Soft, beautiful things, assembled with love.",
    image: "/products/collective-box.jpg",
    accent: "mist" as const,
    span: "lg:col-span-7",
  },
];

export function CategoryTiles() {
  const reduce = useReducedMotion();

  return (
    <section className="px-5 py-12 sm:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-4xl font-light tracking-tight lg:text-5xl">
            Three ways to begin
          </h2>
          <Link href="/shop" className="link-underline text-olive">
            See everything
          </Link>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-12">
          {tiles.map((tile, i) => {
            const accent = accentClasses[tile.accent];
            return (
              <motion.div
                key={tile.href}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
                className={tile.span}
              >
                <Link
                  href={tile.href}
                  className="group relative block aspect-[16/11] overflow-hidden rounded-[2rem]"
                >
                  <Image
                    src={tile.image}
                    alt={tile.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  />
                  {/* warm wash, deepens to the accent on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />
                  <div
                    className={`absolute inset-0 ${accent.bg} opacity-0 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-25`}
                  />

                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
                    <p className="eyebrow text-cream/80">{tile.eyebrow}</p>
                    <h3 className="mt-2 font-display text-3xl text-cream sm:text-4xl">
                      {tile.title}
                    </h3>
                    <p className="mt-1.5 max-w-xs text-sm text-cream/75 opacity-0 transition-all duration-500 group-hover:opacity-100">
                      {tile.blurb}
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
