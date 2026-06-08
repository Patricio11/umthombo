"use client";

import { Sparkles } from "lucide-react";
import { CustomRequestModal } from "@/components/custom/CustomRequestModal";
import { RisingBubbles } from "@/components/motion/RisingBubbles";

export function CustomRequestCta() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-olive px-8 py-14 text-center text-cream sm:px-12 lg:py-16">
        <RisingBubbles count={6} color="var(--color-cream)" />
        <div className="relative">
          <p className="eyebrow text-cream/70">Made for you</p>
          <h2 className="mt-3 font-display text-3xl font-light sm:text-4xl lg:text-5xl">
            Dreaming up something bespoke?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-cream/80">
            Your scent, your colour, your vessel — tell us your idea and we’ll come
            back with a quote and a timeline. No payment now.
          </p>
          <CustomRequestModal
            trigger={
              <button
                type="button"
                className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-cream px-8 py-4 text-base font-medium text-olive transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
              >
                <Sparkles size={18} /> Request a custom piece
              </button>
            }
          />
        </div>
      </div>
    </section>
  );
}
