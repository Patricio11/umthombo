"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Plus, Check } from "lucide-react";
import type { Product } from "@/data/products";
import { formatZAR } from "@/lib/format";
import { accentFor, accentClasses } from "@/lib/accents";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

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

  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);
  const [added, setAdded] = useState(false);

  const quickAdd = () => {
    addItem(
      {
        slug: product.slug,
        name: product.name,
        variant: product.variants?.[0],
        unitPriceZAR: product.priceZAR,
        image: product.image,
      },
      1,
      { open: false } // don't yank the drawer open while browsing
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (index % 3) * 0.08 }}
      className="group relative"
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

      {/* Quick add  sibling of the Link (valid HTML), overlaid on the image.
          Visible on touch; fades up on hover on desktop. */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-end opacity-100 transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
        <button
          type="button"
          onClick={quickAdd}
          aria-label={
            added
              ? `${product.name} added to your selection`
              : `Add ${product.name} to your selection`
          }
          className={cn(
            "pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium shadow-[0_8px_24px_-8px_rgba(42,36,32,0.45)] backdrop-blur-sm transition-colors duration-300",
            added
              ? "bg-olive text-cream"
              : "bg-cream/95 text-ink hover:bg-olive hover:text-cream"
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {added ? (
              <motion.span
                key="added"
                initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.25 }}
                className="inline-flex items-center gap-1.5"
              >
                <Check size={16} /> Added
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.25 }}
                className="inline-flex items-center gap-1.5"
              >
                <Plus size={16} /> Add to order
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.article>
  );
}
