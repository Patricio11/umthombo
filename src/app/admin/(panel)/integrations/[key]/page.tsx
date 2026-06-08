import { notFound } from "next/navigation";
import { getAdminIntegration } from "@/server/db/integrations";
import { AdminPageHeader } from "@/components/admin/primitives";
import { IntegrationForm } from "@/components/admin/integrations/IntegrationForm";
import { INTEGRATION_META, type IntegrationKey } from "@/lib/integrations";
import { site } from "@/data/site";

export const dynamic = "force-dynamic";

const CONFIGURABLE: IntegrationKey[] = ["bobgo", "yetopay", "yoco", "resend"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const meta = INTEGRATION_META[key as IntegrationKey];
  return { title: meta ? `${meta.name} · Integrations` : "Integrations" };
}

export default async function IntegrationConfigPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!CONFIGURABLE.includes(key as IntegrationKey)) notFound();

  const detail = await getAdminIntegration(key as IntegrationKey);
  if (!detail) notFound();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || site.url).replace(
    /\/+$/,
    ""
  );

  return (
    <>
      <AdminPageHeader
        title={detail.name}
        subtitle={INTEGRATION_META[detail.key].blurb}
      />
      <IntegrationForm detail={detail} appUrl={appUrl} />
    </>
  );
}
