import { Hero } from "@/components/home/Hero";
import { StoryStrip } from "@/components/home/StoryStrip";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { Featured } from "@/components/home/Featured";
import { HampersFeature } from "@/components/home/HampersFeature";
import { Testimonials } from "@/components/home/Testimonials";
import { Philosophy } from "@/components/home/Philosophy";
import { ContactBlock } from "@/components/home/ContactBlock";

export default function Home() {
  return (
    <>
      <Hero />
      <StoryStrip />
      <CategoryTiles />
      <Featured />
      <HampersFeature />
      <Testimonials />
      <Philosophy />
      <ContactBlock />
    </>
  );
}
