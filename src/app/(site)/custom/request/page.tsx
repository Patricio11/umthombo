import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { CustomRequestForm } from "@/components/custom/CustomRequestForm";
import { getCategories } from "@/server/db/queries";
import { getCurrentUser } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request a custom piece",
  description:
    "Commission a bespoke candle, soap or gift from Umthombo Creations — your scent, colour and vessel, made to order in Cape Town and delivered across South Africa.",
  alternates: { canonical: "/custom/request" },
  openGraph: {
    title: "Request a custom piece · Umthombo Creations",
    description:
      "Tell us your idea and we’ll come back with a quote — made to order in Cape Town, delivered across South Africa.",
    url: "/custom/request",
  },
};

export default async function CustomRequestPage() {
  const [categories, user] = await Promise.all([
    getCategories(),
    getCurrentUser(),
  ]);

  const account = user
    ? {
        name: user.name ?? "",
        email: user.email ?? "",
        phone: (user as { phone?: string | null }).phone ?? "",
      }
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Made for you"
        title="Request a custom piece."
        blurb="Tell us what you have in mind — scent, colour, vessel, the occasion — and we’ll come back with a quote and timeline. No payment now."
      />
      <section className="px-5 pb-24 sm:px-8">
        <CustomRequestForm categories={categories} account={account} />
      </section>
    </>
  );
}
