/** SEO helpers - canonical URLs and JSON-LD builders.
 *  Client-safe (no server imports); pages pass in the data they have. */
import type { Metadata } from "next";
import { site } from "@/data/site";
import type { SiteSettings } from "@/lib/settings-types";

/** Absolute URL for a site-relative path. */
export const absUrl = (path = ""): string =>
  `${site.url}${path.startsWith("/") || path === "" ? path : `/${path}`}`;

/** `alternates.canonical` block for a page (relative path is fine - resolved
 *  against metadataBase). */
export const canonical = (path: string): Metadata => ({
  alternates: { canonical: path },
});

/** Stable @id anchors so the schema nodes reference one another. */
const ORG_ID = `${site.url}/#organization`;
const SITE_ID = `${site.url}/#website`;

/**
 * The site-wide knowledge graph: Organization + WebSite + LocalBusiness,
 * linked by @id. Rendered once in the site layout.
 */
export function siteGraphLd(s: SiteSettings) {
  const sameAs = [
    s.instagram.enabled ? s.instagram.href : null,
    s.facebook.enabled ? s.facebook.href : null,
  ].filter(Boolean) as string[];

  const organization = {
    "@type": "Organization",
    "@id": ORG_ID,
    name: s.name,
    url: s.url,
    logo: {
      "@type": "ImageObject",
      url: absUrl("/icon-512.png"),
      width: 512,
      height: 512,
    },
    image: absUrl("/opengraph-image.png"),
    description: s.tagline,
    email: s.email,
    foundingDate: String(s.since),
    sameAs,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: `+${s.whatsapp.number}`,
      email: s.email,
      areaServed: "ZA",
      availableLanguage: ["en"],
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: s.url,
    name: s.name,
    inLanguage: "en-ZA",
    publisher: { "@id": ORG_ID },
  };

  // Derive the suburb from the collection line ("Collection in Woodstock, Cape
  // Town") so this address (what Google actually reads) stays in lock-step with
  // the admin's setting and the footer - one source, no NAP drift.
  const addressLocality = s.collection.match(/in\s+([^,]+)/i)?.[1]?.trim() || "Woodstock";

  const localBusiness = {
    "@type": "Store",
    "@id": `${site.url}/#localbusiness`,
    name: s.name,
    description: s.tagline,
    image: absUrl("/opengraph-image.png"),
    url: s.url,
    telephone: `+${s.whatsapp.number}`,
    email: s.email,
    priceRange: "RR",
    currenciesAccepted: "ZAR",
    parentOrganization: { "@id": ORG_ID },
    address: {
      "@type": "PostalAddress",
      addressLocality,
      addressRegion: "Western Cape",
      addressCountry: "ZA",
    },
    areaServed: { "@type": "Country", name: "South Africa" },
    sameAs,
    foundingDate: String(s.since),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, website, localBusiness],
  };
}

/** FAQPage schema from question/answer pairs → FAQ rich results. */
export function faqLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

/** BreadcrumbList from an ordered list of {name, path}. */
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
}

interface ReviewLd {
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: Date | string;
}

/** Product schema with Offer / AggregateOffer + AggregateRating/Review. */
export function productLd(
  p: {
    slug: string;
    name: string;
    description: string;
    tagline: string;
    image: string;
    gallery: string[];
    categoryLabel: string;
    priceZAR: number;
    priceMaxZAR: number | null;
    status: "draft" | "active";
  },
  opts?: { ratingValue?: number; reviewCount?: number; reviews?: ReviewLd[] }
) {
  const img = (u: string) => (u.startsWith("http") ? u : absUrl(u));
  const images = [p.image, ...p.gallery].filter(Boolean).map(img);
  const url = absUrl(`/product/${p.slug}`);
  // Made-to-order: prices are valid for a year out.
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  const priceValidUntil = validUntil.toISOString().slice(0, 10);
  const availability =
    p.status === "active"
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  // Ships anywhere in South Africa (couriered nationwide; collection in
  // Cape Town). Documents national availability for product rich results.
  const shippingDetails = {
    "@type": "OfferShippingDetails",
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "ZA",
    },
  };

  const offers =
    p.priceMaxZAR && p.priceMaxZAR > p.priceZAR
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "ZAR",
          lowPrice: p.priceZAR,
          highPrice: p.priceMaxZAR,
          offerCount: 2,
          availability,
          url,
          priceValidUntil,
          seller: { "@id": ORG_ID },
          shippingDetails,
        }
      : {
          "@type": "Offer",
          priceCurrency: "ZAR",
          price: p.priceZAR,
          availability,
          itemCondition: "https://schema.org/NewCondition",
          url,
          priceValidUntil,
          seller: { "@id": ORG_ID },
          shippingDetails,
        };

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || p.tagline,
    image: images.length ? images : [absUrl("/opengraph-image.png")],
    sku: p.slug,
    category: p.categoryLabel,
    brand: { "@type": "Brand", name: site.name },
    url,
    offers,
  };

  if (opts?.reviewCount && opts.reviewCount > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: opts.ratingValue ?? 0,
      reviewCount: opts.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
    if (opts.reviews?.length) {
      ld.review = opts.reviews.slice(0, 20).map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.authorName },
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        },
        ...(r.title ? { name: r.title } : {}),
        reviewBody: r.body,
        datePublished: new Date(r.createdAt).toISOString().slice(0, 10),
      }));
    }
  }

  return ld;
}
