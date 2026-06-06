import { getAdminIntegrations } from "@/server/db/integrations";
import { AdminPageHeader } from "@/components/admin/primitives";
import { IntegrationsList } from "@/components/admin/integrations/IntegrationsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const integrations = await getAdminIntegrations();
  return (
    <>
      <AdminPageHeader
        title="Integrations"
        subtitle="Connect shipping, payments and email  switch each on when you're ready."
      />
      <IntegrationsList integrations={integrations} />
    </>
  );
}
