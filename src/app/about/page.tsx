import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactBlock } from "@/components/home/ContactBlock";
import { commitments, site } from "@/data/site";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Umthombo means a spring — a source of renewal and flow. The story behind our Cape Town handcrafted candles and skincare, and our commitment to eco-conscious craft.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title="From a small spring, a steady flow."
        blurb={site.meaning}
      />

      {/* Story + image */}
      <section className="px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="relative">
            <div className="relative aspect-[4/5] overflow-hidden blob-2 shadow-[0_30px_70px_-35px_rgba(42,36,32,0.45)]">
              <Image
                src="/products/ambiance-warm.jpg"
                alt="A candle glowing warmly, held in hand"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={0.05} className="lg:pl-6">
            <p className="font-display text-3xl font-light leading-snug tracking-tight lg:text-4xl">
              {site.story}
            </p>
            <div className="mt-6 space-y-4 leading-relaxed text-ink-soft">
              <p>
                We began in {site.since} in Cape Town, pouring candles by hand
                and following the scent wherever it led — into soaps, balms,
                scrubs, diffusers and mists. Everything is made in small
                batches, with ingredients we&rsquo;d happily use ourselves.
              </p>
              <p>
                The name <span className="editorial-italic text-ink">Umthombo</span>{" "}
                means a spring or fountain: a source of renewal and flow. It&rsquo;s
                the idea behind everything we make — small rituals that bring
                warmth and intention into your space.
              </p>
              <p>
                Made with love and inspired by nature. We&rsquo;d love for you to
                make it your own.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Commitments */}
      <section className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-12 max-w-2xl">
            <p className="eyebrow text-olive">Our commitment to you</p>
            <h2 className="mt-4 font-display text-4xl font-light tracking-tight lg:text-5xl">
              How we like to work
            </h2>
          </Reveal>
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {commitments.map((c, i) => (
              <Reveal key={c.title} delay={(i % 3) * 0.06}>
                <span className="font-display text-2xl text-olive/40">
                  0{i + 1}
                </span>
                <h3 className="mt-2 font-display text-2xl">{c.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{c.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Sustainability pledge */}
      <section className="px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-olive/12 px-6 py-14 sm:px-12 lg:py-20">
              <div className="mx-auto max-w-3xl text-center">
                <p className="eyebrow text-olive">The reusable-container pledge</p>
                <p className="mt-5 font-display text-3xl font-light leading-snug tracking-tight lg:text-5xl">
                  Bring your own jar, and we&rsquo;ll take{" "}
                  <span className="text-olive">10% off</span>.
                </p>
                <p className="mx-auto mt-6 max-w-xl leading-relaxed text-ink-soft">
                  Eco-conscious isn&rsquo;t a slogan for us — it&rsquo;s recycled
                  packaging, refillable vessels, and a small thank-you for every
                  container you reuse. Less waste, the same care.
                </p>
                <Link
                  href="/shop"
                  className="mt-8 inline-flex items-center justify-center rounded-full bg-olive px-7 py-3.5 text-base font-medium text-cream transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
                >
                  Shop the range
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <ContactBlock />
    </>
  );
}
