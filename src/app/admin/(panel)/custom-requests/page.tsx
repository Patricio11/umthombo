import { getAdminCustomRequests } from "@/server/db/admin-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { CustomRequestsTable } from "@/components/admin/custom-requests/CustomRequestsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Custom requests" };

export default async function CustomRequestsPage() {
  const rows = await getAdminCustomRequests();
  return (
    <>
      <AdminPageHeader
        title="Custom requests"
        subtitle="Review bespoke enquiries, send a quote with an ETA, or decline with a reason."
      />
      <CustomRequestsTable rows={rows} />
    </>
  );
}
