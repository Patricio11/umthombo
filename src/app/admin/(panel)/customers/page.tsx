import { getAdminUsers } from "@/server/db/admin-users";
import { AdminPageHeader } from "@/components/admin/primitives";
import { CustomersTable } from "@/components/admin/customers/CustomersTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const rows = await getAdminUsers();
  return (
    <>
      <AdminPageHeader
        title="Customers"
        subtitle="Everyone with an account — view their history, send a password link, or disable an account."
      />
      <CustomersTable rows={rows} />
    </>
  );
}
