import type { Metadata } from "next";
import "./globals.css";
import { bricolage, hanken } from "@/lib/fonts";
import { site } from "@/data/site";
import { GrainOverlay } from "@/components/layout/GrainOverlay";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}  ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description:
    "Handcrafted candles, soaps, body care and diffusers from Cape Town. Eco-conscious, fully customisable, made with love and inspired by nature.",
  keywords: [
    "handcrafted candles",
    "Cape Town candles",
    "soy candles",
    "natural soap",
    "reed diffuser",
    "body balm",
    "eco-conscious",
    "Observatory",
  ],
  openGraph: {
    type: "website",
    locale: "en_ZA",
    title: `${site.name}  ${site.tagline}`,
    description:
      "Handcrafted candles, soaps, body care and diffusers from Cape Town. Made with love and inspired by nature.",
    siteName: site.name,
  },
};

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

export const viewport = {
  themeColor: "#faf6ed",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable}`}>
      <body className="min-h-dvh antialiased">
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
      </body>
    </html>
  );
}
