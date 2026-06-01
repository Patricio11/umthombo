import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { products, getProduct, byCategory, categoryMeta } from "@/data/products";
import { formatZAR } from "@/lib/format";
import { site } from "@/data/site";
import { accentFor, accentClasses } from "@/lib/accents";
import { Gallery } from "@/components/product/Gallery";
import { AddToOrder } from "@/components/product/AddToOrder";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/motion/Reveal";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.tagline} ${product.description}`,
    openGraph: {
      title: `${product.name} · ${site.name}`,
      description: product.tagline,
      images: [{ url: product.image }],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const accent = accentClasses[accentFor[product.category]];
  const images = [product.image, ...(product.gallery ?? [])];
  const related = byCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 3);

  const priceRange = product.priceMaxZAR
    ? `${formatZAR(product.priceZAR)} – ${formatZAR(product.priceMaxZAR)}`
    : formatZAR(product.priceZAR);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: `${site.url}${product.image}`,
    category: categoryMeta[product.category].label,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      priceCurrency: "ZAR",
      price: product.priceZAR,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: site.name },
    },
  };

  return (
    <article className="px-5 pb-8 pt-28 sm:px-8 sm:pt-36">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl">
        <Link
          href={`/shop/${product.category}`}
          className="link-underline inline-flex items-center gap-2 text-sm text-ink-soft"
        >
          <ArrowLeft size={16} />
          {categoryMeta[product.category].label}
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <Gallery images={images} name={product.name} />

          {/* Details */}
          <div className="lg:py-4">
            <Reveal>
              <p className={`eyebrow ${accent.text}`}>
                {categoryMeta[product.category].eyebrow}
                {product.customisable && " · Customisable"}
              </p>
              <h1 className="mt-4 font-display text-5xl font-light leading-[0.95] tracking-tight lg:text-7xl">
                {product.name}
              </h1>
              <p className="editorial-italic mt-4 text-2xl text-ink-soft">
                {product.tagline}
              </p>
              <p className="mt-3 font-display text-3xl">{priceRange}</p>
            </Reveal>

            <Reveal delay={0.05}>
              <p className="mt-7 max-w-md leading-relaxed text-ink-soft">
                {product.description}
              </p>
            </Reveal>

            {/* Scent notes */}
            {product.notes && (
              <Reveal delay={0.08}>
                <div className="mt-7">
                  <p className="eyebrow mb-3 text-ink-soft">Notes</p>
                  <div className="flex flex-wrap gap-2">
                    {product.notes.split("·").map((n) => (
                      <span
                        key={n}
                        className={`rounded-full ${accent.bgSoft} px-3.5 py-1.5 text-sm ${accent.text}`}
                      >
                        {n.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* Spec block */}
            {(product.size || product.weight || product.packPriceZAR) && (
              <Reveal delay={0.1}>
                <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-cream-3 py-6 text-sm sm:grid-cols-3">
                  {product.size && (
                    <Spec label="Size" value={product.size} />
                  )}
                  {product.weight && (
                    <Spec label="Weight" value={product.weight} />
                  )}
                  {product.packPriceZAR && (
                    <Spec
                      label="Pack of two"
                      value={formatZAR(product.packPriceZAR)}
                    />
                  )}
                </dl>
              </Reveal>
            )}

            {/* Add to order */}
            <div className="mt-9">
              <AddToOrder product={product} />
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-24 border-t border-cream-2 pt-16">
            <Reveal className="mb-10">
              <h2 className="font-display text-3xl font-light tracking-tight lg:text-4xl">
                You might also love
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-soft/70">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
