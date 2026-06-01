# Umthombo Creations

A bespoke, editorial website for **Umthombo Creations** — a Cape Town handcrafted-candle & skincare business (est. 2020). Built around the idea of *Umthombo* — a spring, a source of renewal and flow.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens in `src/app/globals.css`)
- **Motion** (animations, all gated behind `prefers-reduced-motion`)
- **Lenis** smooth scroll
- **Zustand** (+ `persist`) — the cart / "Your Selection"
- **React Hook Form + Zod** — the order form
- **Embla Carousel** — testimonials
- **Radix Dialog** — accessible cart drawer + order modal
- **next/font** — Fraunces (display) + Hanken Grotesk (body)

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (fully static / SSG)
npm run start      # serve the production build
```

## How orders work (no payments)

There is **no checkout**. Every "buy" is an **Order**:

1. Add items to **Your Selection** (the right-hand slide-over drawer).
2. **Place your order** opens a modal (name / email / phone / delivery-or-collection / note).
3. On submit we build a pre-filled **WhatsApp** message to **+27 63 705 3286** and open `wa.me` — matching how the business already operates. No backend keys required.

The 10% reusable-container discount is a toggle in the cart, recalculated client-side.

### Optional enhancement — email via Resend

To also email the owner on each order, add a `POST /api/order` route using the Resend SDK and set `RESEND_API_KEY` in `.env.local`, then call it from `OrderModal` before the WhatsApp redirect. (Not included in v1 — the WhatsApp flow works with zero secrets.)

## Project structure

```
src/
  app/                 routes (home, shop, shop/[category], product/[slug],
                       hampers, about, contact, custom, sitemap, robots, 404)
  components/
    brand/             animated SVG Logo + social icons
    layout/            Header, Footer, GrainOverlay, SmoothScroll, PageHeader
    home/              the 8 home-page sections
    shop/              ProductCard, ShopExplorer (filter)
    product/           Gallery, AddToOrder
    cart/              CartButton, CartDrawer, CartLine
    order/             OrderModal, OrderSuccess
    contact/           ContactForm
    motion/            Reveal, RisingBubbles
  data/                products.ts, testimonials.ts, site.ts  (real content)
  store/cart.ts        zustand + persist
  lib/                 format, whatsapp, zod-schemas, accents, fonts, utils
public/products/       product photography (extracted from the catalogue)
```

## Design notes

- Palette as CSS variables: clay `#A6402C` (hero accent), olive (Home), mist (Hampers), taupe, cream paper, warm-ink text.
- One dominant accent per section; categories are colour-coded.
- Motion is deliberately **restrained** — one orchestrated hero reveal, gentle scroll fade-ups, a single soft candle glow. Everything respects reduced-motion.
- Fully responsive (mobile-first) with a hamburger drawer nav on small screens.
- SEO: per-route metadata, OpenGraph, `Product` + `LocalBusiness` JSON-LD, sitemap & robots.

## Swapping in real photography

Replace the files in `public/products/<slug>.jpg` (same names, same ~4:5 aspect) — the data layer references them by slug in `src/data/products.ts`.
