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
} from "@/server/db/queries";

export const revalidate = 60;

export default async function Home() {
  const [featured, testimonials, hampers] = await Promise.all([
    getFeaturedProducts(4),
    getTestimonials(),
    getProducts({ category: "hampers" }),
  ]);

  return (
    <>
      <Hero />
      <StoryStrip />
      <CategoryTiles />
      <Featured items={featured} />
      <HampersFeature hampers={hampers} />
      <Testimonials items={testimonials} />
      <Philosophy />
      <ContactBlock />
    </>
  );
}
