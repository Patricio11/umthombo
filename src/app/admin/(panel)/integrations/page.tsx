import { getAdminIntegrations } from "@/server/db/integrations";
import { getSiteSettings } from "@/server/db/settings";
import { AdminPageHeader } from "@/components/admin/primitives";
import { IntegrationsList } from "@/components/admin/integrations/IntegrationsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const [integrations, settings] = await Promise.all([
    getAdminIntegrations(),
    getSiteSettings(),
  ]);
  return (
    <>
      <AdminPageHeader
        title="Integrations"
        subtitle="Connect shipping, payments and email  switch each on when you're ready."
      />
      <IntegrationsList
        integrations={integrations}
        activeProvider={settings.paymentProvider}
        offerBoth={settings.offerBothGateways}
      />
    </>
  );
}
