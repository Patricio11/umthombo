"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import type { Product } from "@/data/products";
import { formatZAR } from "@/lib/format";
import { accentFor, accentClasses } from "@/lib/accents";

const blobs = ["blob-1", "blob-2", "blob-3"];

export function ProductCard({
  product,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  const reduce = useReducedMotion();
  const accent = accentClasses[accentFor[product.category]];
  const blob = blobs[index % blobs.length];

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (index % 3) * 0.08 }}
      className="group"
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className={`relative aspect-[4/5] overflow-hidden bg-cream-2 ${blob}`}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
          {product.customisable && (
            <span className={`absolute left-3 top-3 rounded-full ${accent.bg} px-3 py-1 text-[11px] font-medium text-cream`}>
              Customisable
            </span>
          )}
        </div>

        <div className="mt-4 px-0.5">
          <p className={`eyebrow ${accent.text}`}>
            {product.notes?.split("·")[0]?.trim() || "Handmade"}
          </p>
          <h3 className="mt-1.5 font-display text-2xl leading-tight">
            <span
              className="bg-[length:0%_1px] bg-bottom bg-no-repeat transition-[background-size] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[length:100%_1px]"
              style={{ backgroundImage: "linear-gradient(currentColor,currentColor)" }}
            >
              {product.name}
            </span>
          </h3>
          <p className="mt-1 text-sm text-ink-soft">{product.tagline}</p>
          <p className="mt-2.5 text-sm">
            <span className="font-medium">{formatZAR(product.priceZAR)}</span>
            {product.priceMaxZAR && (
              <span className="text-ink-soft"> – {formatZAR(product.priceMaxZAR)}</span>
            )}
          </p>
        </div>
      </Link>
    </motion.article>
  );
}
