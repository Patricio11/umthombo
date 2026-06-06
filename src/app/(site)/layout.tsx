import { getSiteSettings } from "@/server/db/settings";
import { GrainOverlay } from "@/components/layout/GrainOverlay";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { siteGraphLd } from "@/lib/seo";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const s = await getSiteSettings();

  return (
    <SiteSettingsProvider value={s}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteGraphLd(s)) }}
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
