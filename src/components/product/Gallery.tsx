"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function Gallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  return (
    <div className="lg:sticky lg:top-28">
      <motion.div
        key={active}
        initial={reduce ? false : { opacity: 0.4, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="group relative aspect-[4/5] overflow-hidden blob-1 bg-cream-2 shadow-[0_30px_70px_-35px_rgba(42,36,32,0.45)]"
      >
        <Image
          src={images[active]}
          alt={`${name}  view ${active + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
        />
      </motion.div>

      {images.length > 1 && (
        <div className="mt-4 flex gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-cream-2 ring-2 ring-offset-2 ring-offset-cream transition-all",
                active === i ? "ring-olive" : "ring-transparent hover:ring-cream-3"
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
