import { isIntegrationEnabled } from "@/server/db/integrations";
import { getSiteSettings } from "@/server/db/settings";
import { getCurrentUser } from "@/server/auth/guard";
import { getUserAddresses } from "@/server/db/addresses";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Checkout",
  description: "Complete your Umthombo Creations order.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [deliveryEnabled, settings, user] = await Promise.all([
    isIntegrationEnabled("bobgo"),
    getSiteSettings(),
    getCurrentUser(),
  ]);

  const account = user
    ? {
        name: user.name ?? "",
        email: user.email ?? "",
        phone: (user as { phone?: string | null }).phone ?? "",
      }
    : null;
  const savedAddresses = user ? await getUserAddresses(user.id) : [];

  return (
    <CheckoutClient
      deliveryEnabled={deliveryEnabled}
      collectionInfo={settings.collection}
      account={account}
      savedAddresses={savedAddresses}
    />
  );
}
