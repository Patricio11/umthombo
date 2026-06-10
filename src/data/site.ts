export const site = {
  name: "Umthombo Creations",
  meaning: "Umthombo means a spring, a fountain  a source of renewal and flow.",
  tagline: "Eco-conscious essentials, handcrafted with care.",
  story:
    "What began as a creative outlet has grown into a soulful offering of handcrafted products that bring warmth and intention into your space.",
  location: "Cape Town, South Africa",
  collection: "Collection in Woodstock, Cape Town",
  since: 2020,
  url: "https://umthombocreations.co.za",

  // Real contact details
  whatsapp: {
    number: "27637053286",
    display: "+27 63 705 3286",
    href: "https://wa.me/27637053286",
  },
  instagram: {
    handle: "@umthombo_creations",
    href: "https://instagram.com/umthombo_creations",
  },
  facebook: {
    handle: "@umthombocreations",
    href: "https://facebook.com/umthombocreations",
  },
  linktree: "https://bit.ly/umthombo-creations",
  email: "hello@umthombocreations.co.za",
} as const;

export const nav = [
  { label: "Shop", href: "/shop" },
  { label: "Hampers", href: "/hampers" },
  { label: "Custom", href: "/custom" },
  { label: "Our Story", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

/** The brand promises  "Our commitment to you". */
export const commitments = [
  {
    title: "Diverse size range",
    body: "From a quiet single candle to a generous gift box  a size for every space and budget.",
  },
  {
    title: "Ethically made",
    body: "Eco-conscious ingredients, recycled packaging, and a gentle footprint at every step.",
  },
  {
    title: "Exceptional service",
    body: "Wrapped with care and a personal word  the way you'd send something to a friend.",
  },
  {
    title: "Fully customisable",
    body: "Choose your scent, colour and vessel. Bring your own jar and we'll take 10% off.",
  },
  {
    title: "A unique range",
    body: "Sculptural pyramids, potjie-pots, gemstone intentions  small batches, never mass-made.",
  },
] as const;
