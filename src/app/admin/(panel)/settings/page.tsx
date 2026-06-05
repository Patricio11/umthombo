import { getRawSettings } from "@/server/db/settings";
import { AdminPageHeader } from "@/components/admin/primitives";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getRawSettings();
  return (
    <>
      <AdminPageHeader
        title="Settings"
        subtitle="Your shop's contact details and brand voice."
      />
      <SettingsForm settings={settings} />
    </>
  );
}
