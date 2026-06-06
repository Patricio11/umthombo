import type { Accent } from "@/lib/accents";

/** Shared view models for products/categories/testimonials — safe to import
 *  from both server queries and client components (types only). */

export interface ProductView {
  id: string;
  slug: string;
  name: string;
  category: string; // category slug
  categoryLabel: string;
  categoryEyebrow: string;
  accent: Accent;
  tagline: string;
  description: string;
  notes: string | null;
  size: string | null;
  weight: string | null;
  priceZAR: number;
  priceMaxZAR: number | null;
  packPriceZAR: number | null;
  customisable: boolean;
  featured: boolean;
  status: "draft" | "active";
  image: string;
  gallery: string[];
  variants: string[];
}

export interface CategoryView {
  id: string;
  slug: string;
  label: string;
  eyebrow: string;
  accent: Accent;
  blurb: string;
  image: string;
}

export interface TestimonialView {
  id: string;
  name: string;
  quote: string;
  location: string | null;
}
