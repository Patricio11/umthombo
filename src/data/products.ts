export type Category = "candles" | "skin" | "home" | "hampers";

export interface Product {
  slug: string;
  name: string;
  category: Category;
  tagline: string; // short editorial line
  description: string;
  notes?: string; // scent / ingredient notes
  size?: string;
  weight?: string;
  priceZAR: number; // base price
  priceMaxZAR?: number; // for ranges
  packPriceZAR?: number; // "pack of two" pricing
  variants?: string[]; // scents/colours
  customisable?: boolean;
  image: string; // primary photograph
  gallery?: string[]; // additional photographs
  featured?: boolean; // surfaced on the home page
}

export const categoryMeta: Record<
  Category,
  { label: string; eyebrow: string; accent: string; blurb: string }
> = {
  candles: {
    label: "Home",
    eyebrow: "For the room",
    accent: "olive",
    blurb: "Hand-poured candles  sculptural, scented, and slow to burn.",
  },
  home: {
    label: "Air",
    eyebrow: "For the air",
    accent: "olive",
    blurb: "Reed diffusers and linen mists that let a scent settle in softly.",
  },
  skin: {
    label: "Body",
    eyebrow: "For the skin",
    accent: "clay",
    blurb: "Balms, soaps and scrubs made with oils your skin already knows.",
  },
  hampers: {
    label: "Hampers",
    eyebrow: "For giving",
    accent: "mist",
    blurb: "Curated gift boxes  soft, beautiful things, assembled with love.",
  },
};

const P = "/products";

export const products: Product[] = [
  //  CANDLES 
  {
    slug: "spiced-fruit",
    name: "Spiced Fruit",
    category: "candles",
    tagline: "A freshly-baked kind of warmth.",
    description:
      "Full-bodied spicy cinnamon meets the sweet, fruity aroma of pears  an ideal mood enhancer that evokes freshly baked goods.",
    notes: "Cinnamon · Pear",
    size: "6cm x 6cm",
    weight: "165g",
    priceZAR: 75,
    image: `${P}/spiced-fruit.jpg`,
  },
  {
    slug: "cinnamon-whisper",
    name: "Cinnamon Whisper",
    category: "candles",
    tagline: "A comforting embrace.",
    description:
      "Spicy richness of cinnamon with soft, sweet vanilla  a soothing ambiance for relaxing evenings or cosy gatherings.",
    notes: "Cinnamon · Vanilla",
    priceZAR: 150,
    image: `${P}/cinnamon-whisper.jpg`,
    featured: true,
  },
  {
    slug: "cleary",
    name: "Cleary",
    category: "candles",
    tagline: "An intention, set in wax.",
    description:
      "Infused with carefully selected gemstones and herbs known for their energy and healing properties. Each comes with a description of its benefits.",
    notes: "Impepho · Ashwagandha · Cinnamon bark · Bay leaves",
    priceZAR: 150,
    priceMaxZAR: 180,
    customisable: true,
    image: `${P}/cleary.jpg`,
    featured: true,
  },
  {
    slug: "pyramine",
    name: "Pyramine",
    category: "candles",
    tagline: "Sculptural little peaks.",
    description:
      "Pyramid-shaped scented candles, available in a range of scents and colours.",
    size: "5.5cm x 11cm",
    weight: "78g",
    priceZAR: 65,
    packPriceZAR: 120,
    variants: ["Various scents", "Various colours"],
    customisable: true,
    image: `${P}/pyramine.jpg`,
  },
  {
    slug: "luxewax",
    name: "Luxewax",
    category: "candles",
    tagline: "Pure, unscented simplicity.",
    description:
      "Crafted from 100% natural soy wax  a clean-burning, soot-free, long-lasting glow that is gentle on the environment and the senses.",
    notes: "Unscented soy wax",
    priceZAR: 120,
    image: `${P}/luxewax.jpg`,
  },
  {
    slug: "crimson-petal",
    name: "Crimson Petal",
    category: "candles",
    tagline: "Warmth and romance.",
    description:
      "A lightly scented heart-shaped candle  a touch of warmth and romance for any space.",
    notes: "Fig · Jasmine · Crushed rose petals · Honeysuckle",
    size: "10cm x 7cm",
    weight: "310g",
    priceZAR: 170,
    image: `${P}/crimson-petal.jpg`,
    featured: true,
  },
  {
    slug: "pillar-beaut",
    name: "Pillar Beaut",
    category: "candles",
    tagline: "Frosted, from recycled moulds.",
    description:
      "Frosted pillar candles cast in recycled material. Available in various scents and colours  made in any colour you choose, subject to dye stock.",
    size: "11.5cm x 3.7cm",
    weight: "123g",
    priceZAR: 70,
    packPriceZAR: 130,
    variants: ["Various scents", "Various colours"],
    customisable: true,
    image: `${P}/pillar-beaut.jpg`,
    gallery: [`${P}/pillar-beaut-2.jpg`],
  },
  {
    slug: "ironry",
    name: "Ironry",
    category: "candles",
    tagline: "A tribute to the potjie pot.",
    description:
      "Potjie-shaped sculptural candle honouring the strength and nostalgia of cast-iron cookware. Ylang-ylang has a soft, relaxing aroma known to relieve stress.",
    notes: "Ylang-ylang",
    size: "6cm x 5cm",
    weight: "110g",
    priceZAR: 90,
    image: `${P}/ironry.jpg`,
  },
  {
    slug: "herbal-union",
    name: "Herbal Union",
    category: "candles",
    tagline: "Purify and unwind.",
    description:
      "Earthy, cleansing impepho meets calming clary sage to purify your space and promote relaxation  perfect for meditation or spiritual practice.",
    notes: "Impepho · Clary sage",
    size: "14.5cm x 4.5cm",
    weight: "230g",
    priceZAR: 120,
    packPriceZAR: 215,
    image: `${P}/herbal-union.jpg`,
  },
  {
    slug: "gelzen",
    name: "Gelzen",
    category: "candles",
    tagline: "Clear gel, real leaves.",
    description:
      "A gel candle holding real leaves from our garden. Gel wax burns clear and lasts up to twice as long as paraffin. Customisable  add sea shells and more.",
    notes: "Gel wax · Botanicals",
    priceZAR: 140,
    customisable: true,
    image: `${P}/gelzen.jpg`,
    gallery: [`${P}/gelzen-2.jpg`],
  },

  //  SKIN / BODY 
  {
    slug: "buttertastic-reloaded",
    name: "Buttertastic  Reloaded",
    category: "skin",
    tagline: "Head-to-toe hydration.",
    description:
      "A hydrating body balm to soothe dry skin, made with the best natural ingredients from local suppliers.",
    notes: "Shea butter · Beeswax · Jojoba · Sweet almond · Virgin coconut",
    size: "125ml",
    priceZAR: 160,
    image: `${P}/buttertastic-reloaded.jpg`,
  },
  {
    slug: "buttertastic-mega",
    name: "Buttertastic  Mega",
    category: "skin",
    tagline: "The family size.",
    description: "Our favourite skin-loving body balm in a larger, shareable size.",
    notes: "Shea butter · Beeswax · Jojoba · Sweet almond · Virgin coconut",
    size: "200ml",
    priceZAR: 250,
    image: `${P}/buttertastic-mega.jpg`,
    featured: true,
  },
  {
    slug: "luxurana",
    name: "Luxurana",
    category: "skin",
    tagline: "Handmade, gently exfoliating.",
    description:
      "A handmade soap rich in skin-loving oils, with finely ground macadamia nuts for gentle exfoliation.",
    notes: "Castor · Coconut · Olive · Macadamia · Shea · Vitamin E",
    weight: "110g",
    priceZAR: 60,
    image: `${P}/luxurana.jpg`,
  },
  {
    slug: "mocoffee",
    name: "Mocoffee",
    category: "skin",
    tagline: "A gentle coffee scrub.",
    description:
      "A gentle, non-drying body scrub that leaves skin soft and moisturised.",
    notes: "Brown sugar · Coffee · Coconut oil",
    priceZAR: 45,
    image: `${P}/mocoffee.jpg`,
  },
  {
    slug: "cocoacake",
    name: "Cocoacake",
    category: "skin",
    tagline: "Cocoa-butter clean.",
    description:
      "Natural soap with cocoa butter, kaolin clay and olive oil, lightly scented and with coffee grounds for gentle exfoliation.",
    notes: "Cocoa butter · Kaolin clay · Cinnamon leaf · Bergamot · Lemongrass",
    weight: "70g",
    priceZAR: 45,
    image: `${P}/cocoacake.jpg`,
  },
  {
    slug: "cleansium",
    name: "Cleansium",
    category: "skin",
    tagline: "A mild trio for hands & body.",
    description:
      "A gentle, non-drying soap pack that leaves skin clean and nourished. Three 50g soaps: cocoa-butter & kaolin clay, rooibos glycerine, and tea tree glycerine. Also available in lavender.",
    priceZAR: 85,
    variants: ["Standard", "Lavender"],
    image: `${P}/cleansium.jpg`,
  },
  {
    slug: "hydrench",
    name: "Hydrench",
    category: "skin",
    tagline: "Soak and restore.",
    description:
      "Bath salts to soothe tired muscles and stimulate circulation, infused with essential oils and botanicals.",
    notes: "Essential oils · Rose petals · Lavender · Chamomile",
    size: "60g",
    priceZAR: 35,
    variants: ["Rose", "Lavender", "Chamomile"],
    image: `${P}/hydrench.jpg`,
  },

  //  HOME (diffusers / mists) 
  {
    slug: "calmsie",
    name: "Calmsie",
    category: "home",
    tagline: "Relax and calm.",
    description:
      "A reed diffuser of chamomile and lavender, best for small rooms. Turn the reeds for a stronger scent. Available in other scents.",
    notes: "Chamomile · Lavender",
    size: "150ml",
    priceZAR: 120,
    customisable: true,
    image: `${P}/calmsie.jpg`,
  },
  {
    slug: "citrus-burst",
    name: "Citrus Burst",
    category: "home",
    tagline: "Bright and invigorating.",
    description:
      "A reed diffuser blending fresh lime, citrusy lemongrass and warming ginger to uplift the senses.",
    notes: "Lemongrass · Lime · Ginger",
    size: "200ml",
    priceZAR: 175,
    image: `${P}/citrus-burst.jpg`,
  },
  {
    slug: "room-diffusers",
    name: "Room Diffusers",
    category: "home",
    tagline: "Choose your scent.",
    description: "Reed diffusers for small rooms, in a range of signature scents.",
    notes:
      "Citronella & vanilla · Chamomile & lavender · Pear & cinnamon · Sandalwood & bergamot · Vanilla",
    size: "120ml",
    priceZAR: 90,
    variants: [
      "Citronella & vanilla",
      "Chamomile & lavender",
      "Pear & cinnamon",
      "Sandalwood & bergamot",
      "Vanilla",
    ],
    image: `${P}/room-diffusers.jpg`,
  },
  {
    slug: "bloom-rising",
    name: "Bloom Rising",
    category: "home",
    tagline: "A mood-lifting mist.",
    description:
      "A room & linen mist of rose geranium and jasmine that uplifts your mood and freshens your space.",
    notes: "Rose geranium · Jasmine",
    size: "100ml",
    priceZAR: 85,
    variants: [
      "Rose geranium & jasmine",
      "Lemongrass",
      "Green fig",
      "Cinnamon",
      "Pear",
    ],
    image: `${P}/bloom-rising.jpg`,
  },

  //  HAMPERS 
  {
    slug: "collective-box",
    name: "Collective Box",
    category: "hampers",
    tagline: "Because soft, beautiful things belong in your life.",
    description:
      "A generous gift box: Buttertastic (28ml), Calmsie Impolo massage oil (10ml), glycerine soap pack, Crimson Petal candle, lavender or tea-tree hydrosol, massage candle, a pair of earrings, a 120ml reed diffuser, and a room/linen mist.",
    priceZAR: 690,
    image: `${P}/collective-box.jpg`,
    featured: true,
  },
  {
    slug: "loved-up-box",
    name: "Loved Up Box",
    category: "hampers",
    tagline: "A tender invitation to pour back into yourself.",
    description:
      "Buttertastic Mini (15g), Calmsie Impolo roll-on (10ml), a Cleary intention candle, a lavender Herbal Spritzer (15ml), Hydrench bath salts (60g), and Potteri bentonite healing clay (30g).",
    priceZAR: 365,
    image: `${P}/loved-up-box.jpg`,
  },
];

export const getProduct = (slug: string) =>
  products.find((p) => p.slug === slug);

export const byCategory = (category: Category) =>
  products.filter((p) => p.category === category);

export const featured = products.filter((p) => p.featured);

/** All distinct scent/ingredient note tokens, for the shop scent filter. */
export const allScents = Array.from(
  new Set(
    products
      .flatMap((p) => p.notes?.split("·") ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
  )
).sort();
