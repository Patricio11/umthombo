"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import type { TestimonialView } from "@/lib/view-types";

export function Testimonials({ items }: { items: TestimonialView[] }) {
  const testimonials = items;
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "center" });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla, onSelect]);

  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mb-12 text-center">
          <p className="eyebrow text-olive">In their words</p>
          <h2 className="mt-4 font-display text-4xl font-light tracking-tight lg:text-5xl">
            Kind words, kept close
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {testimonials.map((t) => (
                <figure
                  key={t.name}
                  className="min-w-0 flex-[0_0_100%] px-2 sm:px-8"
                >
                  <blockquote className="text-center">
                    <span
                      aria-hidden
                      className="font-display text-6xl leading-none text-olive/30"
                    >
                      &ldquo;
                    </span>
                    <p className="mx-auto mt-2 max-w-2xl font-display text-2xl font-light leading-snug tracking-tight sm:text-3xl">
                      {t.quote}
                    </p>
                    <figcaption className="eyebrow mt-7 text-ink-soft">
                      {t.name}
                    </figcaption>
                  </blockquote>
                </figure>
              ))}
            </div>
          </div>
        </Reveal>

        {/* controls */}
        <div className="mt-10 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => embla?.scrollPrev()}
            aria-label="Previous testimonial"
            className="rounded-full border border-cream-3 p-2.5 text-ink-soft transition-colors hover:border-olive hover:text-olive"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => embla?.scrollTo(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  selected === i ? "w-6 bg-olive" : "w-2 bg-cream-3"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => embla?.scrollNext()}
            aria-label="Next testimonial"
            className="rounded-full border border-cream-3 p-2.5 text-ink-soft transition-colors hover:border-olive hover:text-olive"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
