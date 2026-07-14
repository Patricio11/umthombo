/** Starter journal posts — seeded once (only if the journal is empty). The owner
 *  can edit or delete these in /admin/journal. Real, evergreen SEO content. */
export interface SeedPost {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
  tags: string[];
  featured: boolean;
  body: string;
}

export const journalSeed: SeedPost[] = [
  {
    slug: "how-to-care-for-your-candle",
    title: "How to care for your candle",
    excerpt:
      "A few small habits make a handmade candle burn cleaner, last longer and stay beautiful to the very end. Here’s how we look after ours.",
    coverImage: "/products/ambiance-warm.jpg",
    coverAlt: "A lit handmade candle casting a warm glow",
    tags: ["Candle care"],
    featured: true,
    body: `A handmade candle is a small, slow luxury — and with a little care it rewards you with a cleaner burn, a stronger scent and a longer life. None of this is fussy. It’s just a handful of habits worth knowing.

## The first burn sets the memory

Wax has a memory. The very first time you light your candle, let it burn until the **melt pool reaches the edge of the vessel** — usually two to three hours for our larger pours. If you blow it out early, the candle “remembers” that smaller pool and will tunnel down the middle on every burn after, wasting the wax around the sides.

So: light it when you have a few unhurried hours, and let that first pool go all the way out.

## Trim the wick, every time

Before each burn, trim the wick to about **5 mm** (roughly the height of a grain of rice on its end). A long or mushroomed wick is the main cause of:

- soot on the glass
- a tall, flickering, smoky flame
- the scent burning off too fast

Once it’s cool, snap off the blackened tip with your fingers or a trimmer. It’s the single most useful thing you can do for a clean burn.

## Mind the clock — and the draught

- Burn for a **maximum of four hours** at a time. Beyond that the vessel overheats and the wick drifts.
- Keep candles **out of draughts** — an open window or a fan makes the flame dance, which means uneven burning and soot.
- Always rest the candle on a heat-safe surface, away from anything that can catch.

## Know when to stop

When about **1 cm of wax** remains, retire the candle. Burning to the very bottom can crack the glass and scorch your surface. Which brings us to the best part…

## Give the vessel a second life

Our vessels are made to be kept. Once the candle is finished, pop it in the freezer for an hour and the last of the wax will lift out cleanly. Wash with warm soapy water and you have a little pot for plants, brushes, trinkets or a small bunch of stems.

> Bring a clean vessel back to us for a refill and we’ll take **{discount} off** — kinder on the planet, and on your pocket.

Small rituals, a longer life. That’s rather the whole idea.`,
  },
  {
    slug: "soy-vs-paraffin-which-candle-is-kinder",
    title: "Soy vs paraffin: which candle is kinder?",
    excerpt:
      "Not all wax is equal. A plain-language look at how soy and paraffin differ — for your home, your health and the planet — and why we pour the way we do.",
    coverImage: "/products/luxewax.jpg",
    coverAlt: "Natural wax candles on a warm neutral surface",
    tags: ["Candle care", "Sustainability"],
    featured: false,
    body: `“Natural wax”, “clean burning”, “eco soy” — candle labels are full of lovely words. But what actually sits behind them? Here’s an honest, plain-language comparison.

## What they’re made of

**Paraffin** is a by-product of refining crude oil. It’s cheap, holds colour and scent well, and is what most mass-market candles are made from.

**Soy wax** is made from the oil of soybeans — a renewable crop. It’s a newer, plant-based alternative that burns a little differently.

## How they burn

- **Burn time:** soy burns cooler and slower, so a soy candle generally **lasts longer** than a paraffin one of the same size.
- **Scent:** paraffin throws scent hard and fast; soy releases it **gently and evenly**, which many people find more pleasant in a room over a whole evening.
- **Soot:** any candle will soot if you don’t trim the wick — but a well-made soy candle, properly tended, tends to burn **cleaner**.

## The greener choice

Soy is **renewable and biodegradable**, where paraffin is a fossil-fuel product. For us that settles it, with one caveat worth being honest about: soy farming has its own footprint, so *where* and *how* the wax is sourced matters too. “Plant-based” isn’t a free pass — it’s a better starting point.

## What we pour

We choose **natural, plant-based wax**, cotton wicks and considered fragrance — and we design our vessels to be refilled and reused rather than thrown away. It costs a little more and burns a little slower, and we think that’s exactly right for something meant to bring calm into your home.

If you take one thing from this: a *well-made* candle, **burned with care**, is always the kinder candle. The [way you look after it](/journal/how-to-care-for-your-candle) matters as much as the wax.`,
  },
];
