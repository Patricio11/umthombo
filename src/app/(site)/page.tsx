import { Hero } from "@/components/home/Hero";
import { StoryStrip } from "@/components/home/StoryStrip";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { Featured } from "@/components/home/Featured";
import { HampersFeature } from "@/components/home/HampersFeature";
import { Testimonials } from "@/components/home/Testimonials";
import { Philosophy } from "@/components/home/Philosophy";
import { ContactBlock } from "@/components/home/ContactBlock";
import {
  getFeaturedProducts,
  getTestimonials,
  getProducts,
  getCategories,
} from "@/server/db/queries";

export const revalidate = 60;

export default async function Home() {
  const [featured, testimonials, hampers, categories] = await Promise.all([
    getFeaturedProducts(4),
    getTestimonials(),
    getProducts({ category: "hampers" }),
    getCategories(),
  ]);

  return (
    <>
      <Hero />
      <StoryStrip />
      <CategoryTiles categories={categories} />
      <Featured items={featured} />
      <HampersFeature hampers={hampers} />
      <Testimonials items={testimonials} />
      <Philosophy />
      <ContactBlock />
    </>
  );
}
