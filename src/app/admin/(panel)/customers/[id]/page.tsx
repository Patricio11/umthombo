import { notFound } from "next/navigation";
import { getAdminUser } from "@/server/db/admin-users";
import { getCurrentUser } from "@/server/auth/guard";
import { CustomerDetail } from "@/components/admin/customers/CustomerDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const u = await getAdminUser(id);
  return { title: u ? `${u.name} · Customers` : "Customers" };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, me] = await Promise.all([getAdminUser(id), getCurrentUser()]);
  if (!detail) notFound();
  return <CustomerDetail detail={detail} isSelf={me?.id === detail.id} />;
}
