# Umthombo Creations — Brand & SEO Guide

Everything about the brand identity, the logo asset suite, and how this site is
optimised for Google — plus the owner-side checklist to actually rank.

---

## 1. The brand

**Umthombo Creations** — a Cape Town (Observatory) handcrafted-candle, soap,
body-care and home-fragrance studio, est. **2020**. *Umthombo* is isiXhosa/isiZulu
for **a spring / a fountain** — a source of renewal and flow. That idea drives the
identity: water, calm, renewal, slow craft.

- **Tagline:** *Eco-conscious essentials, handcrafted with care.*
- **Promise:** small-batch, real ingredients, fully customisable, made with intention.
- **Range:** Candles · Body & Skin · Home (diffusers) · Gift Hampers · Custom/bespoke.
- **Sells via:** this site (live BobGo shipping + YetoEFT online payment), collection
  in Observatory, and WhatsApp.
- **Voice:** warm, editorial, unhurried. Sensory and personal, never salesy. Lowercase
  ease, the occasional italic aside, generous white space.

---

## 2. Visual identity

### Colour tokens (defined in `src/app/globals.css` `@theme`)
| Token | Hex | Use |
|---|---|---|
| `--color-olive` | `#4b5a30` | Primary brand, the mark, buttons |
| `--color-olive-soft` | `#5e7140` | Hover |
| `--color-clay` | `#a6402c` | Secondary accent (Body/Skin) |
| `--color-clay-soft` | `#c1593f` | — |
| `--color-mist` | `#91aeca` | Calm blue accent (Hampers) |
| `--color-taupe` | `#97897a` | Warm neutral surfaces |
| `--color-cream` | `#faf6ed` | Default background / paper |
| `--color-cream-2` | `#f0e9da` | Cards / sections |
| `--color-cream-3` | `#e7ddc9` | Deeper paper / borders |
| `--color-ink` | `#2a2420` | Body text |
| `--color-ink-soft` | `#5a5048` | Secondary text |

### Type
- **Display:** Bricolage Grotesque (`--font-display`) — headings, the wordmark.
- **Body/UI:** Hanken Grotesk (`--font-body`) — copy, incl. an editorial italic.
- Both via `next/font` with `display: swap` (`src/lib/fonts.ts`).

### The mark
A serif **"U"** drawn as a **chalice / fountain** (the spring), with a **rising
droplet** and a **calligraphic water flourish** beneath. Vector paths live in
`src/components/brand/Logo.tsx` (animated, reduced-motion-safe) and in the generator
`scripts/gen-icons.js`.

---

## 3. Logo asset suite

All generated from one source (`scripts/gen-icons.js`) — **regenerate any time with
`npm run icons`** (needs the `sharp` + `png-to-ico` devDeps already installed).

### App / favicon / social (auto-detected by Next.js)
| File | Size | Purpose |
|---|---|---|
| `src/app/favicon.ico` | 16/32/48 | Browser tab |
| `src/app/icon.svg` | vector | Modern favicon (olive rounded square + cream mark) |
| `src/app/apple-icon.png` | 180² | iOS home screen |
| `src/app/opengraph-image.png` | 1200×630 | Link previews (Facebook, WhatsApp, LinkedIn) |
| `src/app/twitter-image.png` | 1200×630 | X/Twitter card |
| `public/icon-192.png`, `icon-512.png` | 192², 512² | PWA manifest (incl. maskable) |

### Brand suite → `public/brand/`
| File | When to use |
|---|---|
| `mark-olive.svg` | The mark alone, light backgrounds |
| `mark-cream.svg` | The mark on olive / dark backgrounds |
| `mark-ink.svg` / `mark-white.svg` | Mono black / white (print, single-colour) |
| `lockup-horizontal.svg` | **Primary logo** — mark + wordmark, light bg |
| `lockup-horizontal-cream.svg` (+`.png`) | Primary logo on olive / dark bg |
| `lockup-horizontal-mono-olive.svg` | All-olive horizontal (one-colour) |
| `lockup-stacked.svg` | Square-ish spaces (mark above wordmark) |
| `lockup-stacked-cream.svg` | Stacked, on dark |
| `wordmark-ink.svg` / `wordmark-olive.svg` | Type only, where the mark already shows |
| `badge-olive.svg` / `badge-cream.svg` | Circular stamp (wax-seal feel, stickers) |
| `avatar-1080.png` | **Social profile picture** (IG/FB/WhatsApp) — olive square, platforms crop to circle |
| `lockup-horizontal.png` / `-cream.png` | Raster lockup for email signatures, decks |

**Clear space:** keep at least the height of the mark's "U" bowl around the logo.
**Minimum size:** mark ≥ 24px; horizontal lockup ≥ 120px wide.
**Don't:** recolour outside the palette, stretch, add shadows, or place the olive
mark on a busy/low-contrast background (use the cream version instead).

---

## 4. SEO — what's implemented

### Metadata (Next.js Metadata API)
- **Root** (`src/app/layout.tsx`): `metadataBase`, title template `%s · Umthombo
  Creations`, description, keywords, `authors`/`creator`/`publisher`, **canonical**,
  **OpenGraph**, **Twitter `summary_large_image`**, explicit `robots` with
  `max-image-preview: large`.
- **Every public page** sets its own `title`, `description`, **`alternates.canonical`**
  and page-specific OpenGraph: home, `/shop`, `/shop/[category]`, `/product/[slug]`,
  `/hampers`, `/about`, `/contact`, `/custom`.
- **Checkout, success, cancelled**: `robots: { index:false }` (transactional).

### Structured data (JSON-LD) — `src/lib/seo.ts`
- **Site graph** on every page (`siteGraphLd`): `Organization` + `WebSite` + `Store`
  (LocalBusiness) linked by `@id`, with logo, contact point, address, `sameAs` socials,
  founding date, area served.
- **Product** pages: full `Product` schema — `Offer`/`AggregateOffer` (price ranges),
  `priceCurrency` ZAR, availability from product status, `priceValidUntil`,
  `itemCondition`, brand, sku, image gallery, seller `@id` → the Organization.
- **Breadcrumbs**: `BreadcrumbList` on product (`Home › Shop › Category › Product`)
  and category (`Home › Shop › Category`) pages.

### Crawl & indexing
- **`robots.ts`**: allow all, **disallow `/admin`, `/api/`, `/checkout`**, declares the
  sitemap + host.
- **`sitemap.ts`** (ISR, 1h): all static pages, every category and active product, each
  with **`lastModified`** (from the row's `updatedAt`) and **product image** entries
  (Google Images / merchant signals).
- **Performance**: ISR (`revalidate: 60`) + `generateStaticParams` pre-renders all
  products & categories; `next/font` swap; `next/image` everywhere with **meaningful
  alt text** (incl. gallery thumbnails).

---

## 5. Owner checklist — to actually rank on Google

Code gets you *indexable*; these get you *ranked*. Do them in order.

### A. Launch essentials (do once)
1. **Google Search Console** — verify the domain (DNS TXT), then **submit
   `https://umthombocreations.co.za/sitemap.xml`**. Watch Coverage + Enhancements.
2. **Bing Webmaster Tools** — same (powers Bing/DuckDuckGo); you can import from GSC.
3. **Google Business Profile** — create/claim "Umthombo Creations", Observatory,
   Cape Town. Category: *Candle store* / *Gift shop*. Add hours, photos, the website,
   WhatsApp. **This is the single biggest local-SEO lever** — it gets you on Maps and
   the local pack for "candles Cape Town / Observatory".
4. **Confirm `NEXT_PUBLIC_APP_URL`** = the real domain so canonical/OG/sitemap URLs are
   correct in production.
5. **Validate** rich results: run a product URL + the homepage through
   [Rich Results Test](https://search.google.com/test/rich-results) and
   [Schema validator](https://validator.schema.org).

### B. Content that wins queries
- **Product copy**: every product needs a *unique* 2–4 sentence description with the
  words people search (scent notes, "soy candle", "vegan soap", size, occasion).
  Duplicate/empty descriptions rank poorly. Fill the **Size/Weight** fields too.
- **Real photos**: bright, consistent, on-white or styled. Set good alt text (the admin
  uses the product name — make names descriptive).
- **A blog / journal** (highest-leverage growth): short posts targeting intent —
  "best candles for gifting in South Africa", "soy vs paraffin", "how to care for your
  candle", "Cape Town handmade gift guide". Each is a new ranking surface and earns
  links. (Not built yet — see §6.)
- **Reviews**: collect customer reviews; once you have them, add `AggregateRating` /
  `Review` to the Product schema for ★ rich snippets (big CTR boost). See §6.

### C. Off-page & local
- Get listed/linked: local Cape Town directories, markets, maker collectives, supplier
  pages, press. Consistent **NAP** (Name, Address, Phone) everywhere.
- Keep socials active and linked (they're in the `sameAs` graph already).
- Encourage Google reviews on the Business Profile.

### D. Ongoing
- Re-submit the sitemap isn't needed (GSC re-reads it), but check **Search Console**
  monthly for errors, queries you're ranking for, and pages to improve.
- Keep products in stock/active; mark sold-out as draft (schema reflects availability).
- Page speed: keep images reasonably sized (Supabase/`next/image` handles a lot).

---

## 6. Recommended next SEO features (not yet built)

Ordered by impact-to-effort:

1. **Customer reviews + `AggregateRating`/`Review` schema** → ★ stars in results.
   Needs a reviews table + admin moderation + schema wiring.
2. **Journal/blog** (`/journal`) with `Article` schema → new ranking surfaces + links.
3. **Dynamic per-product OG images** (`opengraph-image.tsx` with `ImageResponse`) →
   branded link previews showing the product.
4. **FAQ page + `FAQPage` schema** (shipping, custom orders, care) → FAQ rich results.
5. **`loading.tsx`** skeletons for snappier perceived performance.

> The build is structured so each of these slots in cleanly — ask and they can be added.

---

*Regenerate all icons & brand assets:* `npm run icons` · *SEO helpers:* `src/lib/seo.ts`
