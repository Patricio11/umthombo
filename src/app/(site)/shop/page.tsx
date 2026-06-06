import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShopExplorer } from "@/components/shop/ShopExplorer";
import { getProducts, getCategories } from "@/server/db/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse all Umthombo Creations handcrafted candles, soaps, body care, diffusers and hampers. Filter by category and find something made with care.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop · Umthombo Creations",
    description:
      "Handcrafted candles, soaps, body care, diffusers and hampers - made with care in Cape Town.",
    url: "/shop",
  },
};

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="The whole collection"
        title="Everything we make, in one place."
        blurb="Small batches, real ingredients, and a quiet kind of beauty. Filter by what you're after  or wander."
      />
      <ShopExplorer products={products} categories={categories} />
    </>
  );
}
