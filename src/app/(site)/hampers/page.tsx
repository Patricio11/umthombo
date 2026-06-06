import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { ContactBlock } from "@/components/home/ContactBlock";
import { AddToOrder } from "@/components/product/AddToOrder";
import { getProducts } from "@/server/db/queries";
import { formatZAR } from "@/lib/format";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Hampers",
  description:
    "Curated Umthombo gift hampers — the Collective Box and the Loved Up Box. Soft, beautiful things, assembled with love and wrapped in eco-friendly packaging.",
  alternates: { canonical: "/hampers" },
  openGraph: {
    title: "Gift Hampers · Umthombo Creations",
    description:
      "Curated gift hampers of handcrafted candles and care — assembled with love in Cape Town.",
    url: "/hampers",
  },
};

export default async function HampersPage() {
  const hampers = await getProducts({ category: "hampers" });

  return (
    <>
      <PageHeader
        eyebrow="For giving"
        title="Gifts that feel poured into."
        blurb="Our hampers gather candles, balms, soaps and small treasures into one generous box  wrapped the way you'd send something to someone you love."
        accentClass="text-mist"
      />

      <section className="px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl space-y-24 lg:space-y-32">
          {hampers.map((h, i) => {
            const flip = i % 2 === 1;
            // Split the prose description into a tidy "what's inside" list.
            const intro = h.description.split(":")[0];
            const contents = (h.description.split(":")[1] ?? "")
              .split(/,| and /)
              .map((s) => s.replace(/\.$/, "").trim())
              .filter(Boolean);

            return (
              <div
                key={h.slug}
                className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
              >
                <Reveal className={flip ? "lg:order-2" : ""}>
                  <div className="relative aspect-[4/5] overflow-hidden blob-1 shadow-[0_30px_70px_-35px_rgba(42,36,32,0.45)]">
                    <Image
                      src={h.image}
                      alt={h.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </Reveal>

                <Reveal delay={0.05} className={flip ? "lg:order-1 lg:pr-6" : "lg:pl-6"}>
                  <p className="eyebrow text-mist">A gift box</p>
                  <h2 className="mt-3 font-display text-5xl font-light leading-[0.95] tracking-tight lg:text-6xl">
                    {h.name}
                  </h2>
                  <p className="editorial-italic mt-4 text-xl text-ink-soft">
                    {h.tagline}
                  </p>
                  <p className="mt-5 leading-relaxed text-ink-soft">{intro}.</p>

                  {contents.length > 0 && (
                    <div className="mt-6">
                      <p className="eyebrow mb-3 text-ink-soft">What&rsquo;s inside</p>
                      <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                        {contents.map((c) => (
                          <li
                            key={c}
                            className="flex items-start gap-2 text-sm text-ink-soft"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mist" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="mt-7 font-display text-3xl">
                    {formatZAR(h.priceZAR)}
                  </p>

                  <div className="mt-6 max-w-md">
                    <AddToOrder product={h} />
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
      </section>

      <ContactBlock />
    </>
  );
}
