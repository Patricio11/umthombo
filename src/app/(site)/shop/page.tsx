import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShopExplorer } from "@/components/shop/ShopExplorer";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse all Umthombo Creations handcrafted candles, soaps, body care, diffusers and hampers. Filter by category and find something made with care.",
};

export default function ShopPage() {
  return (
    <>
      <PageHeader
        eyebrow="The whole collection"
        title="Everything we make, in one place."
        blurb="Small batches, real ingredients, and a quiet kind of beauty. Filter by what you're after  or wander."
      />
      <ShopExplorer />
    </>
  );
}
