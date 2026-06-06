import { isIntegrationEnabled } from "@/server/db/integrations";
import { getSiteSettings } from "@/server/db/settings";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Checkout",
  description: "Complete your Umthombo Creations order.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [deliveryEnabled, settings] = await Promise.all([
    isIntegrationEnabled("bobgo"),
    getSiteSettings(),
  ]);

  return (
    <CheckoutClient
      deliveryEnabled={deliveryEnabled}
      collectionInfo={settings.collection}
    />
  );
}
