import { getAdminFaqs } from "@/server/db/faqs";
import { AdminPageHeader } from "@/components/admin/primitives";
import { FaqManager } from "@/components/admin/faqs/FaqManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "FAQ" };

export default async function AdminFaqsPage() {
  const faqs = await getAdminFaqs();
  return (
    <>
      <AdminPageHeader
        title="FAQ"
        subtitle="Answer common questions - these appear on the public FAQ page."
      />
      <FaqManager faqs={faqs} />
    </>
  );
}
