import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import type { ProductView } from "@/lib/view-types";
import { formatZAR } from "@/lib/format";

export function HampersFeature({ hampers }: { hampers: ProductView[] }) {
  const collective =
    hampers.find((h) => h.slug === "collective-box") ?? hampers[0];
  const loved = hampers.find((h) => h.slug === "loved-up-box") ?? hampers[1];

  return (
    <section className="relative overflow-hidden bg-mist/15 px-5 py-20 sm:px-8 lg:py-28">
      {/* soft blob backdrop */}
      <div
        aria-hidden
        className="absolute -left-24 top-1/2 h-96 w-96 -translate-y-1/2 blob-3 bg-mist/20 blur-2xl"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="eyebrow text-mist">For giving</p>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight tracking-tight lg:text-6xl">
            Gifts that feel
            <br />
            <span className="editorial-italic">poured into.</span>
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-ink-soft">
            Our hampers gather soft, beautiful things into one generous box 
            candles, balms, soaps and small treasures, wrapped the way you&rsquo;d
            send something to someone you love.
          </p>

          <div className="mt-8 space-y-3">
            {[collective, loved].map(
              (h) =>
                h && (
                  <Link
                    key={h.slug}
                    href={`/product/${h.slug}`}
                    className="group flex items-center justify-between rounded-2xl bg-cream/70 px-5 py-4 transition-colors hover:bg-cream"
                  >
                    <div>
                      <p className="font-display text-xl">{h.name}</p>
                      <p className="text-sm text-ink-soft">{h.tagline}</p>
                    </div>
                    <span className="shrink-0 pl-4 font-display text-lg">
                      {formatZAR(h.priceZAR)}
                    </span>
                  </Link>
                )
            )}
          </div>

          <Link
            href="/hampers"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-ink/25 px-7 py-3.5 text-base font-medium transition-colors hover:border-mist hover:text-mist"
          >
            Explore hampers
          </Link>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <div className="relative aspect-[4/5] overflow-hidden blob-2 shadow-[0_30px_70px_-30px_rgba(42,36,32,0.45)]">
            <Image
              src="/products/loved-up-box.jpg"
              alt="A curated Umthombo gift hamper"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
