import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { ProductCard } from "@/components/shop/ProductCard";
import { getCustomisableProducts } from "@/server/db/queries";
import { getSiteSettings } from "@/server/db/settings";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Made for you",
  description:
    "Custom candles and care from Umthombo Creations - your scent, your colour, your vessel, your moment. Sculptural forms, intention candles and bespoke gifts, made to order in Cape Town and shipped across South Africa.",
  alternates: { canonical: "/custom" },
  openGraph: {
    title: "Custom & Bespoke · Umthombo Creations",
    description:
      "Your scent, your colour, your vessel - sculptural forms, intention candles and bespoke gifts, made to order in Cape Town and shipped across South Africa.",
    url: "/custom",
  },
};

const showcase = [
  {
    src: "/products/custom-torso-pair.jpg",
    label: "Sculptural forms",
    note: "Body & figure candles, cast in your colour.",
  },
  {
    src: "/products/cleary.jpg",
    label: "Intention candles",
    note: "Gemstones and herbs chosen for you.",
  },
  {
    src: "/products/custom-torso-red.jpg",
    label: "Bold statements",
    note: "A centrepiece for the mantel or the gift.",
  },
];

export default async function CustomPage() {
  const [customisable, site] = await Promise.all([
    getCustomisableProducts(),
    getSiteSettings(),
  ]);

  const whatsappCustom = `${site.whatsapp.href}?text=${encodeURIComponent(
    "Hi Umthombo 🌱 I'd love to talk about a custom piece. Here's what I have in mind:"
  )}`;

  return (
    <>
      <PageHeader
        eyebrow="Made for you"
        title="Your scent. Your colour. Your moment."
        blurb="Almost everything we make can be made yours. Tell us the occasion, the mood, the palette  and we'll pour something one-of-a-kind."
      />

      {/* Showcase */}
      <section className="px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3">
          {showcase.map((s, i) => (
            <Reveal key={s.src} delay={i * 0.08}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-[2rem]">
                <Image
                  src={s.src}
                  alt={s.label}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="font-display text-2xl text-cream">{s.label}</p>
                  <p className="mt-1 text-sm text-cream/80">{s.note}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-12 max-w-2xl">
            <p className="eyebrow text-olive">How it works</p>
            <h2 className="mt-4 font-display text-4xl font-light tracking-tight lg:text-5xl">
              Three gentle steps
            </h2>
          </Reveal>
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "Tell us the idea",
                d: "A scent you adore, a colour story, an occasion, a person. Send it over on WhatsApp.",
              },
              {
                n: "02",
                t: "We shape it together",
                d: "We'll suggest forms, scents and vessels, share options, and confirm the details with you.",
              },
              {
                n: "03",
                t: "Hand-poured for you",
                d: "We make it in a small batch, wrap it with care, and deliver or set it aside for collection.",
              },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 0.06}>
                <span className="font-display text-2xl text-olive/40">{step.n}</span>
                <h3 className="mt-2 font-display text-2xl">{step.t}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{step.d}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <a
              href={whatsappCustom}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-12 inline-flex items-center gap-2.5 rounded-full bg-olive px-8 py-4 text-base font-medium text-cream transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
            >
              <WhatsAppIcon size={20} />
              Request a custom piece
            </a>
          </Reveal>
        </div>
      </section>

      {/* Customisable products */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-10">
            <h2 className="font-display text-3xl font-light tracking-tight lg:text-4xl">
              Start from one of these
            </h2>
            <p className="mt-2 text-ink-soft">
              Every piece below can be tailored to you.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {customisable.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
