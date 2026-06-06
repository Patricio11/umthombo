import { getSiteSettings } from "@/server/db/settings";
import { GrainOverlay } from "@/components/layout/GrainOverlay";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const s = await getSiteSettings();

  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: s.name,
    description: s.tagline,
    image: `${s.url}/products/gelzen.jpg`,
    url: s.url,
    telephone: `+${s.whatsapp.number}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Observatory",
      addressRegion: "Western Cape",
      addressCountry: "ZA",
    },
    areaServed: "South Africa",
    sameAs: [
      s.instagram.enabled ? s.instagram.href : null,
      s.facebook.enabled ? s.facebook.href : null,
    ].filter(Boolean),
    foundingDate: String(s.since),
  };

  return (
    <SiteSettingsProvider value={s}>
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
    </SiteSettingsProvider>
  );
}
