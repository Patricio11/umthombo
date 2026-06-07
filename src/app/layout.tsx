import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { bricolage, hanken } from "@/lib/fonts";
import { site } from "@/data/site";

const DESCRIPTION =
  "Handcrafted candles, soaps, body care and diffusers — made in Cape Town, delivered across South Africa. Eco-conscious, fully customisable, made with love and inspired by nature.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} - ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: DESCRIPTION,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  category: "shopping",
  keywords: [
    "handcrafted candles",
    "candles South Africa",
    "soy candles South Africa",
    "online candle shop South Africa",
    "handmade soap South Africa",
    "natural soap",
    "body care",
    "reed diffuser",
    "body balm",
    "gift hampers South Africa",
    "eco-conscious",
    "handmade gifts South Africa",
    "nationwide delivery South Africa",
    "Cape Town candles",
    "Observatory Cape Town",
    "Umthombo Creations",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: site.url,
    title: `${site.name} - ${site.tagline}`,
    description:
      "Handcrafted candles, soaps, body care and diffusers — made in Cape Town, delivered across South Africa. Made with love and inspired by nature.",
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} - ${site.tagline}`,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
