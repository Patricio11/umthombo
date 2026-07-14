import { AdminPageHeader } from "@/components/admin/primitives";
import { DiscountManager } from "@/components/admin/discounts/DiscountManager";
import { getDiscountProducts } from "@/server/db/discounts";
import { getSiteSettings } from "@/server/db/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discounts" };

export default async function DiscountsPage() {
  const [settings, products] = await Promise.all([
    getSiteSettings(),
    getDiscountProducts(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Discounts"
        subtitle="The bring-back discount — what it’s worth and which products earn it."
      />
      <DiscountManager rule={settings.containerDiscount} products={products} />
    </>
  );
}
