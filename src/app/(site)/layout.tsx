import { site } from "@/data/site";
import { GrainOverlay } from "@/components/layout/GrainOverlay";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";

const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: site.name,
  description: site.tagline,
  image: `${site.url}/products/gelzen.jpg`,
  url: site.url,
  telephone: `+${site.whatsapp.number}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Observatory",
    addressRegion: "Western Cape",
    addressCountry: "ZA",
  },
  areaServed: "South Africa",
  sameAs: [site.instagram.href, site.facebook.href],
  foundingDate: String(site.since),
};

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
      />
      <SmoothScroll />
      <GrainOverlay />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  );
}
