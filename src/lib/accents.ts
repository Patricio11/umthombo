export type Accent = "clay" | "olive" | "mist" | "taupe";

export const accentClasses: Record<
  Accent,
  { text: string; bg: string; bgSoft: string; border: string; ring: string; hex: string }
> = {
  clay: {
    text: "text-clay",
    bg: "bg-clay",
    bgSoft: "bg-clay/8",
    border: "border-clay",
    ring: "ring-clay",
    hex: "#a6402c",
  },
  olive: {
    text: "text-olive",
    bg: "bg-olive",
    bgSoft: "bg-olive/10",
    border: "border-olive",
    ring: "ring-olive",
    hex: "#6e8c3c",
  },
  mist: {
    text: "text-mist",
    bg: "bg-mist",
    bgSoft: "bg-mist/15",
    border: "border-mist",
    ring: "ring-mist",
    hex: "#91aeca",
  },
  taupe: {
    text: "text-taupe",
    bg: "bg-taupe",
    bgSoft: "bg-taupe/12",
    border: "border-taupe",
    ring: "ring-taupe",
    hex: "#97897a",
  },
};
