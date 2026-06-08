import { notFound } from "next/navigation";
import { getAdminCustomRequest } from "@/server/db/admin-queries";
import { CustomRequestDetail } from "@/components/admin/custom-requests/CustomRequestDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminCustomRequest(id);
  return { title: detail ? `${detail.requestNumber} · Custom requests` : "Custom requests" };
}

export default async function CustomRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminCustomRequest(id);
  if (!detail) notFound();
  return <CustomRequestDetail detail={detail} />;
}
