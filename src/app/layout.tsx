import type { Metadata } from "next";
import "./globals.css";
import { bricolage, hanken } from "@/lib/fonts";
import { site } from "@/data/site";

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

export const viewport = {
  themeColor: "#faf6ed",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
