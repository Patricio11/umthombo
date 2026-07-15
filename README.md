# Umthombo Creations

A bespoke, editorial **storefront + customer accounts + admin system** for **Umthombo Creations** — a Cape Town handcrafted-candle & skincare business (est. 2020). Built around the idea of *Umthombo* — a spring, a source of renewal and flow.

Everything is database-backed: the public catalogue, customer accounts and orders, bespoke commission requests, reviews, FAQs and an editorial journal are all managed through a polished, fully-responsive admin.

## Stack

- **Next.js 16** (App Router, RSC, ISR) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens) · **Motion** (reduced-motion-gated) · **Lenis** smooth scroll
- **PostgreSQL on Neon** + **Drizzle ORM** (migrations via drizzle-kit)
- **Better Auth** — email/password for **customers and admins**, email verification, sessions in Postgres
- **Supabase Storage** for product + reference images
- **Payments:** YetoPay (instant EFT), Yoco (card) **and** Bob Pay (card/EFT/wallets) — switchable, with optional customer choice
- **Shipping:** BobGo (live rates, order creation, tracking)
- **Email:** Resend (branded transactional templates)
- **Cloudflare Turnstile** (optional, invisible bot protection) · **Vercel Analytics**
- **react-markdown** (sanitised — `remark-gfm` + `rehype-sanitize`) for the editorial journal
- **Zustand** (cart, persisted) · **Zod** · **Radix Dialog** · **Embla**
- **next/font** — Bricolage Grotesque (display) + Hanken Grotesk (body)

## Getting started

```bash
npm install
cp .env.example .env.local      # then fill it in (see below)
npm run db:migrate              # apply schema to your Neon DB
npm run db:seed                 # seed catalogue + integration rows + admin user
npm run dev                     # http://localhost:3000  (admin at /admin)
```

### Environment (`.env.local`)

```bash
DATABASE_URL=postgresql://…          # Neon (pooled, ?sslmode=require)
BETTER_AUTH_SECRET=                  # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000   # public origin; used for payment-return + webhook URLs
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=           # Supabase → Settings → API → service_role
SUPABASE_STORAGE_BUCKET=product-images
ADMIN_EMAIL=admin@umthombocreations.co.za
ADMIN_PASSWORD=change-me             # used once by the seed

# Optional — Cloudflare Turnstile (invisible CAPTCHA on login/register/reset).
# Leave both blank to disable; forms still run with the honeypot + rate limits.
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

> Shipping, payments and email **credentials are not env vars** — they're configured in the admin at **/admin/integrations** (stored in the DB, secrets masked). See [Integrations & webhooks](#integrations--webhooks).

**Supabase:** create a **public** bucket named `product-images` (Storage → New bucket → public). `next.config.ts` already allows `*.supabase.co` images.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run db:generate` | Generate a migration from `schema.ts` |
| `npm run db:migrate` | Apply migrations to the DB |
| `npm run db:push` | Push schema directly (dev) |
| `npm run db:studio` | Drizzle Studio (browse/edit data) |
| `npm run db:seed` | Seed categories/products/testimonials/FAQs/journal posts + integration rows + admin user |
| `npm run icons` | Regenerate favicon/app-icon/social images from the brand mark |

## How it fits together

```
src/
  app/
    (site)/            public storefront (home, shop, product, hampers, about, contact, custom, faq)
    (site)/journal/    editorial blog: index, article, /topic/[tag], rss.xml
    (site)/checkout/   checkout flow + success / cancelled pages
    (site)/custom/request/         bespoke request form + tokened status page
    login, signup, forgot-password, set-password        customer auth
    account/           customer dashboard: orders, requests, addresses, settings
    admin/
      login/           Better Auth sign-in (outside the shell)
      (panel)/         protected admin (see Admin section)
    api/auth/[...all]/ Better Auth handler
    api/webhooks/      yetopay + yoco (payment) + bobgo (fulfilment) handlers
  proxy.ts             optimistic /admin + /account gate (cookie check)
  server/
    db/                drizzle client, schema, public + admin queries, integrations, settings
    auth/              Better Auth instance + guards (requireAdmin / requireUser) + account helpers
    storage/           Supabase upload/delete
    shipping/          BobGo client (rates + order create)
    payments/          YetoPay + Yoco clients + shared gateway resolver + webhook verify
    email/             Resend sender + branded templates
    orders/            post-payment fulfilment (link account, emails, BobGo order, tracking)
    custom-requests/   deposit/balance fulfilment
    security/          Turnstile verification
    actions/           server actions (checkout, orders, products, integrations, reviews,
                       faqs, journal, custom-requests, users, account, …)
  components/          AdminShell/DataTable/primitives, storefront, checkout, custom, account, journal, ui
  data/                seed source only
scripts/seed.ts        idempotent seed (catalogue, FAQs, journal posts, admin, integration rows)
drizzle/               generated migrations
docs/                  build plans + reference blueprints (.md)
```

## Storefront

Editorial, motion-restrained, fully responsive. Beyond browse/shop:

- **Customer accounts** — sign up / sign in from the header; or an account is created **at checkout** (deferred — verify email, then set a password). Dashboard: **orders** (with product thumbnails + reorder), **custom requests**, **saved addresses** (mark primary), **settings**.
- **Product reviews** — left by **verified buyers** only, **moderated** before they show, and fed into the product's `AggregateRating` for SEO. Signed-out visitors get a sign-in CTA.
- **FAQ** — an admin-managed `/faq` page that also emits `FAQPage` structured data.
- **Journal** — an editorial blog at `/journal` (article pages, `/topic/[tag]`, RSS). Admin-written in Markdown; emits `BlogPosting`/`Blog` structured data and feeds the sitemap. See [Journal](#journal).
- **Custom (bespoke) requests** — a smooth multi-step modal/page; see below.

## Checkout, payments & shipping

"Add to Order" fills the slide-over **selection**; **Checkout** opens `/checkout`:

1. **Contact (name + surname) → method → address.** Delivery is offered only when **BobGo** is enabled. The customer enters a structured address and taps **Continue** → live courier rates from BobGo (name, ETA, price) → selects one. **Place order** stays disabled until everything needed is in.
2. **Place order.** `placeOrder` **re-prices every line from the DB** and **re-verifies the chosen courier rate against BobGo** (the client can't set prices or fees), then writes the order + items in one transaction as `paymentStatus: pending`. If the customer opted in, an account is created and the order + address are linked to it.
3. **Pay.** Routing is graceful and **two gateways** are supported:
   - **Active gateway** (admin's pick) creates the payment — **YetoEFT** (instant EFT; full-page redirect or embedded iFrame) or **Yoco** (card; redirect). With **"let customers choose"** on, the customer picks *Pay by bank* / *Card* at checkout.
   - The **webhook** is authoritative: `/api/webhooks/yetopay` (HMAC) and `/api/webhooks/yoco` (Standard Webhooks) flip the order to **paid**. Idempotent via `payment_events`.
   - else **WhatsApp** on → a pre-filled message opens; else the order is recorded as **manual**.
4. **On first paid:** the order is linked to a matching account, the customer + admin are emailed (Resend), and for a delivery order the **BobGo order** is created (`channel_order_number = order number`).
5. **Fulfilment:** BobGo's **webhook** (`/api/webhooks/bobgo`) updates tracking/shipment status and emails the customer their tracking link once.

The checkout form is **saved to `localStorage`**, so a failed payment → **Try again** restores all details. The 10% reusable-container discount is applied server-side. Every integration degrades gracefully when off.

## Custom order requests (commissions)

A full request → quote → deposit → build pipeline. Reachable from the **hero**, the **/custom** page and a **"didn't find it?"** CTA on the shop (which pre-fills the type).

- **Request** — a smooth 3-step modal/page: a friendly **type** (Candles / Diffusers & Mists / Body & Skin / Hampers / *Other*), details (scent, colour, size, occasion, quantity, notes), optional **reference images**, and contact. Every request is **attached to a user** (logged-in, existing-by-email, or an auto-created account). Honeypot + Turnstile protected.
- **Admin** (`/admin/custom-requests`) — review, **quote** (price, ETA, optional **deposit**), or **decline** (reason); drive the lifecycle (`pending → quoted → in_progress → ready → completed`); one-tap WhatsApp to the customer.
- **Payments** — the customer pays the **deposit**, then the **balance** when ready, through the active gateway (`startGatewayPayment`); webhooks branch on `metadata.customRequestId` to mark paid and advance status.
- **Visibility** — a **tokened status page** for guests + **"My requests"** in the account dashboard, both with pay buttons.
- Email is fully automated at each step; WhatsApp is one-tap `wa.me` links (true automated WhatsApp would need the Cloud API — out of scope).

## Journal

An admin-managed editorial blog at `/journal` — the informational-SEO counterpart to the transactional store pages (candle care, gift guides, the making of a piece).

- **Authoring** — `/admin/journal`: a Markdown editor with a formatting toolbar and **live preview**, cover-image upload (Supabase), free-text **tag chips**, SEO title/description overrides, a **publish/draft eye toggle** and a **feature** star. Drafts are hidden; publishing stamps the date.
- **Public** — `/journal` (featured hero + card grid + tag chips + pagination), `/journal/[slug]` (article with related posts + share), `/journal/topic/[tag]` (topic pages, built from the tags), and an **RSS feed** at `/journal/rss.xml`.
- **Rendering** — one sanitised `<Markdown>` component (`react-markdown` + `remark-gfm` + `rehype-sanitize` + `rehype-slug`) shared by the admin preview and the public article, so they can never drift.
- **SEO** — per-post `BlogPosting` + `BreadcrumbList`, a `Blog` graph on the index, posts + topic pages in the sitemap, and per-post canonical/OG. "Journal" sits in the main nav + footer.
- **Seed** — two evergreen starter posts ship via `npm run db:seed` (only when the journal is empty); edit or delete them in the admin.

## Integrations & webhooks

Configure everything in **/admin/integrations** — each provider is a card you toggle on/off with a masked-secrets config form. Nothing here is an env var.

| Integration | What it does | Key config |
|---|---|---|
| **BobGo** | Live courier rates, order creation, tracking | API key, sandbox toggle, collection address |
| **YetoEFT** (YetoPay) | Online payment (instant EFT) | Base URL, merchant ID, API key/secret, webhook secret, default method, **redirect or embedded iFrame** |
| **Yoco** | Online payment (card) | Secret key, webhook signing secret (**one-click Register webhook** stores it) |
| **Bob Pay** | Online payment (card, EFT & wallets — one hosted page) | API key, sandbox toggle (webhook is automatic) |
| **Resend** | Transactional email | API key, from-email, from-name |
| **WhatsApp** | Secondary "order over WhatsApp" fallback | on/off (number from Settings) |

The Integrations page also has an **Active payment gateway** picker and a **"let customers choose at checkout"** toggle. **Products** carry shipping dimensions (weight kg, L×W×H cm) under the editor's *Shipping* card — these feed BobGo's rates.

**Webhook URLs to register** (replace the host with your `NEXT_PUBLIC_APP_URL`):

- **YetoPay** → `…/api/webhooks/yetopay` — authenticated per-delivery by the `X-Webhook-Signature` HMAC; idempotent via `payment_events`.
- **Yoco** → `…/api/webhooks/yoco` — Standard Webhooks (`webhook-id/-timestamp/-signature`); use the in-admin **Register webhook** button to subscribe + store the secret.
- **Bob Pay** → `…/api/webhooks/bobpay` — **no dashboard step**: the URL is sent with every payment (`notify_url`), and each callback is verified by echoing it back to Bob Pay's validate endpoint. Resolved by reference (`orderNumber` / `requestNumber`), idempotent via `payment_events`.
- **BobGo** → `…/api/webhooks/bobgo` — a plain, trusted URL (no token/HMAC). Subscribe to the **fulfilment-update** event; it only updates an existing order matched by `channel_order_number`.

> **Adding another payment gateway?** Follow [`docs/ADDING_A_PAYMENT_GATEWAY.md`](docs/ADDING_A_PAYMENT_GATEWAY.md) — every touch point in order, including the two non-type-checked allowlists (`CONFIGURABLE`, `VALID`) that otherwise 404 the config page.

## Admin

`/admin` (sign in with the seeded credentials). Fully responsive, brand-consistent, with toasts, confirm dialogs and reduced-motion-safe motion.

- **Dashboard** — counts (orders, custom requests, products, categories, published journal posts) + recent orders
- **Analytics** — revenue (defaults to **paid**), best sellers, status/method split, custom range, CSV export
- **Orders** — list/filter with **product thumbnails**, detail with payment & shipping card, **Mark as paid** / **Create BobGo order** (surfaces the real BobGo error on failure), status switcher, reply-on-WhatsApp
- **Custom requests** — review/quote/decline + lifecycle (see above)
- **Journal** — Markdown editor with live preview, cover upload, tags, publish/draft + feature toggles (see [Journal](#journal))
- **Customers** — list + detail with the customer's orders / requests / addresses / reviews; **send a password link**, **mark verified**, **disable login** (a `banned` flag enforced at sign-in) or **delete** (keeps orders; guards self + last admin)
- **Products** — search/filter, full editor (variants, gallery, shipping dimensions, featured/draft) with **drag-and-drop Supabase uploads**, an **eye toggle** to show/hide, and a **notify past buyers** action for new products
- **Discounts** — two tabs, everything admin-configured (nothing hardcoded):
  - *Bring-back* — the reusable-container discount: on/off, the percent, its customer-facing label, and scope (all products / only ticked ones) with a searchable product picker. Applied **per line, per container returned** (capped at the line's qty), never order-wide
  - *Coupons & offers* — **coupon codes and automatic rules** (leave the code blank → it applies itself, e.g. free delivery over R350). Types: % off / R off / free delivery. Conditions: minimum spend, date window, usage limit, and a per-coupon **"can combine with the bring-back discount"** switch (off = whichever saves the customer more wins)
  - Both are always recomputed server-side from the DB — the client can never set a price. Free delivery records the **real courier cost** separately from what you charged, so it shows up as a cost rather than vanishing
- **Categories / Testimonials / Reviews / FAQ** — CRUD + moderation/reorder
- **Integrations / Settings** — providers, social toggles, active gateway, business details

Security: every admin mutation is guarded by `requireAdmin()` + Zod and customer routes by `requireUser()`; a disabled account is refused at sign-in; the `service_role` key never reaches the browser; integration secrets are DB-stored and masked; webhooks are verified (YetoPay/Yoco) or trusted-by-construction (BobGo).

## Bot protection, SEO & analytics

- **Bot protection** — a server-enforced **honeypot** + optional **Cloudflare Turnstile** on login / register / password-reset / custom-request (and the checkout honeypot), layered over Better Auth rate-limiting + email verification. Fully **env-gated** — works with no keys. See [`docs/BOT_PROTECTION_BLUEPRINT.md`](docs/BOT_PROTECTION_BLUEPRINT.md).
- **SEO** — per-page metadata + canonicals, OG/Twitter, sitemap (with images), robots, and JSON-LD (Organization + WebSite + Store with `areaServed: South Africa`, Product + AggregateRating/Review + `OfferShippingDetails`, BreadcrumbList, FAQPage, BlogPosting/Blog). The journal adds informational reach + an RSS feed. Copy is **Cape Town origin, nationwide delivery**.
- **Vercel Analytics** is mounted in the root layout.

## Deployment

- Host on Vercel. Set all env vars (incl. the correct `DATABASE_URL`).
- **Run migrations against the same DB the app uses.** The simplest durable setup is a **migrate-before-build** command: `npm run db:migrate && npm run build`. (Migrations are additive and tracked per-DB; a schema lag will surface as runtime errors.)
- Configure the integrations + register the webhooks in the admin after the first deploy.

## Docs

| Doc | What it is |
|---|---|
| [`SYSTEM_BUILD_PLAN.md`](docs/SYSTEM_BUILD_PLAN.md) | Master build plan (DB + auth + orders) |
| [`SHIPPING_PAYMENT_PLAN.md`](docs/SHIPPING_PAYMENT_PLAN.md) | BobGo + YetoPay + email + integrations |
| [`YOCO_INTEGRATION.md`](docs/YOCO_INTEGRATION.md) | Second payment gateway + switching + customer choice |
| [`BOBPAY_INTEGRATION.md`](docs/BOBPAY_INTEGRATION.md) | Third payment gateway (Bob Pay, redirect) |
| [`ADDING_A_PAYMENT_GATEWAY.md`](docs/ADDING_A_PAYMENT_GATEWAY.md) | **Reusable checklist** for wiring a new gateway (every touch point) |
| [`CONTAINER_DISCOUNT_PLAN.md`](docs/CONTAINER_DISCOUNT_PLAN.md) | The bring-back discount: per-line rule + admin config |
| [`PROMOTIONS_PLAN.md`](docs/PROMOTIONS_PLAN.md) | Coupons + automatic offers (free delivery, min spend) |
| [`CUSTOMER_ACCOUNTS_PLAN.md`](docs/CUSTOMER_ACCOUNTS_PLAN.md) | Accounts, reviews, FAQ |
| [`CUSTOM_REQUESTS_PLAN.md`](docs/CUSTOM_REQUESTS_PLAN.md) | Bespoke commission pipeline |
| [`USER_MANAGEMENT_PLAN.md`](docs/USER_MANAGEMENT_PLAN.md) | Admin customer management |
| [`JOURNAL_PLAN.md`](docs/JOURNAL_PLAN.md) | Editorial journal (blog) build plan |
| [`BOT_PROTECTION_BLUEPRINT.md`](docs/BOT_PROTECTION_BLUEPRINT.md) | Reusable honeypot + Turnstile recipe |
| [`BRAND_AND_SEO.md`](docs/BRAND_AND_SEO.md) | Brand identity + SEO plan |

## Notes

- Public pages use ISR (`revalidate`); admin writes call `revalidatePath` so the storefront reflects changes.
- Seed images live in `public/products/*`; new uploads go to Supabase.
- `getSession` degrades to "logged-out" on any auth/DB error so a hiccup can't crash the storefront.
