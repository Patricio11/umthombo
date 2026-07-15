import { AdminPageHeader } from "@/components/admin/primitives";
import { DiscountsTabs } from "@/components/admin/discounts/DiscountsTabs";
import { getDiscountProducts } from "@/server/db/discounts";
import { getAdminPromotions } from "@/server/db/promotions";
import { getSiteSettings } from "@/server/db/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discounts" };

export default async function DiscountsPage() {
  const [settings, products, promotions] = await Promise.all([
    getSiteSettings(),
    getDiscountProducts(),
    getAdminPromotions(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Discounts"
        subtitle="The bring-back discount, plus coupon codes and automatic offers."
      />
      <DiscountsTabs
        rule={settings.containerDiscount}
        products={products}
        promotions={promotions}
      />
    </>
  );
}
