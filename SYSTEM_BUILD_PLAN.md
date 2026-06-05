# Umthombo Creations — Full System Build Plan

Turning the (already-built) editorial marketing site into a **fully functional, admin-managed application**: a real database, authenticated admin, and persisted orders. The public site keeps its exact look & feel — it just reads live data instead of static files.

> Track progress here. Tick tasks as they land. Each phase ends with a green build (`npm run build`).

---

## Locked decisions

| Area | Choice |
|---|---|
| Database | **PostgreSQL on Neon** (serverless) |
| ORM | **Drizzle ORM** + drizzle-kit migrations |
| Auth | **Better Auth** — email/password, admin-only, sessions in Postgres |
| Image storage | **Supabase Storage** — existing `/public/products/*` stay as **seed**; new/edited images upload to Supabase and store the public URL |
| Orders | **Persist to DB + keep the WhatsApp hand-off** (admin manages status) |
| Mutations | Next.js **Server Actions** (auth-guarded) + a public order endpoint |
| Existing `src/data/*.ts` | Repurposed as the **seed source** (then the app reads from the DB) |

---

## Environment variables (`.env.local`)

```bash
# Neon Postgres
DATABASE_URL=postgresql://...               # provided by you

# Better Auth
BETTER_AUTH_SECRET=                          # `openssl rand -base64 32`
BETTER_AUTH_URL=http://localhost:3000

# Supabase Storage (product images)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=                   # server-side uploads
SUPABASE_STORAGE_BUCKET=product-images

# Seed admin (used once by the seed script)
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

---

## Architecture at a glance

```
src/
  server/
    db/
      index.ts            # drizzle client (Neon)
      schema.ts           # all tables
      queries.ts          # read helpers used by public pages
    auth/
      auth.ts             # Better Auth server instance
      guard.ts            # requireAdmin() for actions/pages
    storage/
      supabase.ts         # server client + upload/delete helpers
    actions/              # server actions (categories, products, orders, testimonials)
  app/
    (public)/             # existing site, now DB-backed
    admin/
      login/              # Better Auth sign-in
      (dashboard)/        # protected: dashboard, categories, products, orders, testimonials
    api/
      auth/[...all]/      # Better Auth handler
      orders/             # public POST to create an order
  data/                   # now SEED source only
scripts/
  seed.ts                 # seeds categories, products, testimonials, admin user
drizzle/                  # generated migrations
drizzle.config.ts
```

---

## Data model

- **categories** — `id, slug (unique), label, eyebrow, accent, blurb, sortOrder, timestamps`
- **products** — `id, slug (unique), name, categoryId→categories, tagline, description, notes, size, weight, priceZAR, priceMaxZAR, packPriceZAR, customisable, featured, status (draft|active), image, gallery (jsonb text[]), variants (jsonb text[]), sortOrder, timestamps`
- **orders** — `id, orderNumber, customerName, customerEmail, customerPhone, method (delivery|collection), note, ownContainer, subtotalZAR, totalZAR, status (new|confirmed|preparing|completed|cancelled), timestamps`
- **order_items** — `id, orderId→orders, productId→products (nullable), name (snapshot), variant, qty, unitPriceZAR, lineTotalZAR`
- **testimonials** — `id, name, quote, location, sortOrder, published, timestamps`
- **Better Auth tables** — `user, session, account, verification` (generated)

---

## Admin UX/UI principles (non-negotiable)

The admin must feel as crafted as the storefront — **smooth, consistent, fully responsive**.

- **Unique & brand-consistent**: same olive/cream/ink palette, Bricolage + Hanken type, organic/editorial details and soft easing — a distinctive, authored admin, **never** a generic Material/Bootstrap dashboard.
- **Responsive**: works beautifully phone → tablet → desktop. Sidebar collapses to a drawer/bottom-nav on mobile; tables become cards on small screens.
- **Smooth**: subtle motion (page/section reveals, optimistic updates, animated toasts), all gated behind `prefers-reduced-motion`.
- **Consistent system**: shared primitives — `AdminShell`, `DataTable`, `Field`, `Toast`, `ConfirmDialog`, `StatusBadge`, `EmptyState` — reused across every screen so nothing feels bolted-on.
- **Forgiving**: inline validation, clear empty/loading/error states, confirm before destructive actions, undoable where sensible.
- **Fast**: optimistic UI + `revalidatePath` so changes show instantly.

## Phases & tasks

### Phase 0 — Foundation & schema ✅
- [x] Install deps: `drizzle-orm`, `@neondatabase/serverless`, `better-auth`, `@supabase/supabase-js`, `dotenv`, `ws`; dev: `drizzle-kit`, `tsx`
- [x] `drizzle.config.ts` + `src/server/db/index.ts` (Neon **serverless/pool** client — transaction-capable, lazy-init)
- [x] Define `schema.ts`: categories, products, orders, order_items, testimonials (+ relations + inferred types)
- [x] Add `.env.example` documenting every variable
- [x] `npm run db:generate` → migration `0000_init.sql`
- [x] Wire `db:*` scripts (generate / migrate / push / seed / studio)
- [x] Pin `kysely@0.28.17` + `serverExternalPackages` in next.config (Better Auth bundling fix)

### Phase 1 — Auth (Better Auth) — code ✅ (migrate+seed in Phase 2)
- [x] Better Auth server instance with Drizzle adapter (email/password, sign-ups disabled)
- [x] Better Auth tables (`user/session/account/verification`) in schema + migration
- [x] `api/auth/[...all]` route handler + `auth-client.ts` helpers
- [x] `/admin/login` page (branded, Suspense-wrapped)
- [x] `requireAdmin()` guard + `middleware.ts` protecting `/admin/*`
- [x] Split public site into `(site)` route group so admin has a clean shell
- [ ] Run the migration against Neon + verify login end-to-end (needs env → Phase 2)

> Legend: each phase lists **Goal → Tasks → Acceptance**. Tick tasks as they land; tick **Acceptance** only when the whole phase is verifiably done. Keep the Progress log current.

### Phase 2 — Seed & first migration ✅
**Goal:** the Neon DB has all schema + all existing content as real rows, and an admin can log in.
- [x] Add `DATABASE_URL` etc. to `.env.local`; `npm run db:migrate` (applied `0000_init`) — 9 tables live
- [x] `scripts/seed.ts`: idempotent (categories/products upsert by slug; testimonials/admin only if absent)
- [x] Seed **categories** (4) from `categoryMeta`
- [x] Seed **products** (23) from `data/products.ts` → `categoryId` join; images = current `/public` paths; variants/gallery/featured/prices carried
- [x] Seed **testimonials** (4) from `data/testimonials.ts`
- [x] Seed the **admin user** — hashed via Better Auth's own hasher (`ctx.password.hash`), user + `credential` account rows, role=`admin`, skip-if-exists
- [x] `npm run db:seed` → 4 / 23 / 4 / 1 confirmed
- [x] Verified sign-in end-to-end: `POST /api/auth/sign-in/email` → 200 + session cookie
- **Acceptance:** ✅ fresh `db:migrate && db:seed` populates everything; admin signs in.

### Phase 3 — Point the public site at the DB ✅
**Goal:** every public page renders identically, now from Postgres (no visual change).
- [x] `server/db/queries.ts`: `getCategories/getCategoryBySlug/getProducts/getFeaturedProducts/getCustomisableProducts/getProductBySlug/getRelatedProducts/getActiveProductSlugs/getTestimonials` — typed, `server-only`, active-only for public
- [x] Client-safe view types in `lib/view-types.ts`; components consume `product.accent` (from category) instead of the static `accentFor` map
- [x] Home: `Featured`, `Testimonials`, `HampersFeature` fed from DB via the server page
- [x] `/shop` + `ShopExplorer`: products + categories from DB (dynamic tabs); `/shop/[category]` via `getCategoryBySlug` + DB `generateStaticParams`
- [x] `/product/[slug]`: DB fetch, `generateStaticParams` from DB slugs, `generateMetadata`, JSON-LD from row, drafts 404
- [x] `/hampers`, `/custom` on DB; `sitemap.ts` async from DB; `next.config` allows Supabase image hosts
- [x] `data/*.ts` now seed-only (no longer imported by pages); removed unused `accentFor`
- **Acceptance:** ✅ build generates 23 product + 4 category pages **from Neon**; smoke test confirms parity (featured, testimonials, prices, 404s).

### Phase 4 — Admin design system + shell + dashboard ⭐ (UX-critical) ✅
**Goal:** a beautiful, consistent, fully responsive admin foundation every later screen reuses.
- [x] **Skin**: olive/cream/ink + Bricolage/Hanken; calm editorial admin on `cream-2`, olive active states — not a default dashboard
- [x] **`AdminShell`**: fixed sidebar (≥lg) ↔ slide-in drawer + top bar (mobile); active-route highlight; brand mark; user block + sign-out; reduced-motion-safe
- [x] **Primitive: `AdminPageHeader`** (title, subtitle, action slot)
- [x] **Primitive: `Card`** container
- [x] **Primitive: `Field`** set (Field wrapper, Input, Textarea, Select, Switch, error/hint)
- [x] **Primitive: `Button`** + `danger` variant
- [x] **Primitive: `StatusBadge`** (order + product statuses, consistent colours)
- [x] **Primitive: `Toast`** provider + `useToast` (animated); **`ConfirmDialog`** (Radix, promise-based `useConfirm`); **`EmptyState`**
- [x] **`/admin` dashboard**: stat cards + orders-by-status + recent orders (empty state); responsive grid
- [x] Protected `(panel)` route group: `requireAdmin()` in layout, providers mounted; login stays outside the shell
- [x] Verified: unauthed `/admin` → 307 login; signed-in dashboard 200 + renders
- [ ] `DataTable` primitive — built in Phase 5 (first list); `loading.tsx`/`error.tsx` in Phase 9
- **Acceptance:** ✅ shell + dashboard polished and responsive (sidebar↔drawer), auth-gated, keyboard-navigable.

### Phase 5 — Categories admin (CRUD) ✅
**Goal:** manage the category taxonomy with the shared primitives.
- [x] `server/actions/categories.ts`: `createCategory`, `updateCategory`, `deleteCategory`, `moveCategory` — `requireAdmin()` + Zod + `revalidatePath('/', 'layout')`; slug-uniqueness checks
- [x] Built the reusable responsive **`DataTable`** (table ≥sm, stacked cards on mobile) here
- [x] **List** (`/admin/categories`): order controls, accent swatch + label/eyebrow, slug, product count, edit/delete actions; empty state
- [x] **Create/Edit** (`/new` + `/[id]`): slug auto-from-label (editable), accent swatch picker, eyebrow, blurb; inline errors + toast + redirect
- [x] **Reorder** via up/down (sortOrder swap in a transaction)
- [x] **Delete** with promise-based `ConfirmDialog`; blocked + explained when products reference it (FK `restrict` + pre-check)
- [x] Verified authed: list / new / edit all render 200 with data
- **Acceptance:** ✅ full CRUD + reorder, validated, revalidates the public site, responsive.

### Phase 6 — Products admin (CRUD + Supabase uploads) ⭐ (UX-critical) ✅
**Goal:** the flagship admin screen — create/edit any product, upload images, manage variants/gallery.
- [x] `server/storage/supabase.ts`: service-role client, `uploadProductImage(file)→publicUrl`, `deleteProductImage(url)` (no-ops for seed paths), type/size validation; bucket `product-images` confirmed public (upload/url/delete tested)
- [x] Upload UI (`ImageUploader`): drag-and-drop + click, preview, busy state, remove; `ImageField` (primary) + `GalleryField` (multi, reorder) → Supabase via `uploadImage` action
- [x] `server/actions/products.ts`: `createProduct`, `updateProduct`, `deleteProduct` (also deletes its images), `toggleFeatured`, `setProductStatus` — `requireAdmin()` + Zod + slug-uniqueness + revalidate
- [x] **List** (`/admin/products`): live search + status filter, count; columns thumb/name/category/price/status + feature-star, edit, delete; responsive cards; empty states
- [x] **Create/Edit** form — responsive two-column: Basics, Details, Options (variants repeatable + customisable), Media (primary + gallery), Visibility (status/featured), Pricing; sticky save bar; slug auto-from-name
- [x] Delete with `ConfirmDialog` + image cleanup; optimistic feature toggle + toast
- [x] Verified authed: list / new / edit render 200; build green; Supabase pipeline tested
- **Acceptance:** ✅ full product CRUD with real Supabase uploads; drafts hidden, active shown; revalidates; responsive & validated.

### Phase 7 — Orders (public persistence + admin management) ✅
**Goal:** every order is captured and manageable; customer still gets the WhatsApp hand-off.
- [x] `createOrder`: Zod-validate, **re-price every line from the DB** (accept only base/pack/range — no client trust), generate `orderNumber`, insert order + items in **one transaction**
- [x] `OrderModal`: submit → `createOrder` → on success open WhatsApp → success; inline error + "Placing your order…" state on failure
- [x] `updateOrderStatus` — `requireAdmin()` + enum guard + revalidate
- [x] **List** (`/admin/orders`): status filter, columns number/customer/method/items/total/status/date, newest first, row → detail, responsive
- [x] **Detail** (`/admin/orders/[id]`): customer block, snapshot line items, subtotal/10%/total, method, note; **status switcher** (toast + refresh); "reply on WhatsApp" (ZA number normalised)
- [x] Dashboard recent-orders + new-count wired
- [x] Verified with a real inserted order: list/detail/dashboard correct (then cleaned up)
- **Acceptance:** ✅ orders persist server-priced in a transaction + WhatsApp opens; admin reads and advances them.

### Phase 8 — Testimonials admin (+ optional site settings) ✅
**Goal:** manage social proof (and basic site content) without code.
- [x] `server/actions/testimonials.ts`: create/update/delete + publish toggle + reorder — `requireAdmin()` + Zod + revalidate
- [x] **List** (`/admin/testimonials`): order controls, name + quote preview, inline publish `Switch`, edit/delete; empty state
- [x] **Create/Edit** (`/new` + `/[id]`): name, location, quote, published toggle
- [x] Public `Testimonials` reads `published` only (DB-backed since Phase 3)
- [x] Verified authed: list shows all 4 + publish toggles; forms 200
- [ ] *(Deferred, optional)* `settings` singleton + `/admin/settings` (WhatsApp/tagline/collection)
- **Acceptance:** ✅ add/edit/hide/reorder a testimonial; carousel reflects it after revalidation.

### Phase 9 — Hardening, polish & deploy ✅
**Goal:** production-ready, secure, documented.
- [x] Every admin mutation guarded by `requireAdmin()` + Zod; `createOrder` re-prices server-side (no client-trusted prices)
- [x] Auth hardening: Better Auth **rate limiting** (5/min on sign-in), secure cookies in production, public sign-up disabled
- [x] Admin `loading.tsx` (skeleton) + `error.tsx` (boundary with retry); toasts/empty states throughout; Radix focus-trap in dialogs/drawers
- [x] `revalidatePath('/', 'layout')` after every write; ISR on public pages
- [x] Responsive admin (sidebar↔drawer, DataTable→cards) + reduced-motion gating built in
- [x] Migrated `middleware.ts` → `proxy.ts` (Next 16); deprecation warning gone
- [x] Rewrote `README.md` (Neon + Supabase + Better Auth setup, scripts, architecture); `.env.example` accurate
- [x] **Final `npm run build` green; full smoke test** — all public + all admin routes 200, gate 307s unauthed
- **Acceptance:** ✅ clean build, secured + validated mutations, documented setup, admin as crafted as the storefront.

---

## Engineering standards (applied throughout)

- **Type-safe end to end** — Drizzle inferred types, Zod on every input/mutation, no `any` at boundaries.
- **Server-only secrets** — DB/auth/storage live under `src/server/*`; only `NEXT_PUBLIC_*` reach the client. `.env.local` is git-ignored; `.env.example` documents shape only.
- **Least privilege** — public sign-up disabled; admin guarded by middleware *and* server-side `requireAdmin()`; service-role keys never exposed to the browser.
- **Atomic writes** — transaction-capable Neon driver; multi-row writes (orders) in a transaction.
- **Migrations are source-controlled** — every schema change via `drizzle-kit generate`; never edit the DB by hand.
- **Separation of concerns** — `(site)` (public) vs `admin` route groups; `server/{db,auth,storage,actions}` layers; shared UI primitives.
- **Accessibility & responsiveness** — same standards as the storefront, on every admin screen.
- **Validation snapshots** — order line items snapshot name/price so historical orders stay correct if products change.

## Progress log

- _2026-06-04_ — Plan created; decisions locked (Neon + Drizzle, Better Auth, Supabase Storage, orders persisted + WhatsApp).
- _2026-06-04_ — **Phase 0 done.** Schema (9 tables) + migration `0000_init`; lazy transaction-capable Neon client; `db:*` scripts; fixed Better Auth/kysely bundling. **Phase 1 code done.** Better Auth (Drizzle adapter, no sign-up), `/admin/login`, middleware + `requireAdmin()`, `(site)` route group. Build green.
- _2026-06-04_ — **Phase 2 done.** Migration applied to Neon; seed populated 4 categories / 23 products / 4 testimonials / 1 admin; sign-in verified (200 + cookie). **Phase 3 done.** Query layer + view types; all public pages read from Postgres; build SSGs everything from the DB; parity smoke-tested.
- _2026-06-04_ — **Phase 4 done.** Admin design system (primitives, Toast, ConfirmDialog), responsive `AdminShell`, protected `(panel)` group + dashboard; auth-gate verified. **Phase 5 done.** Reusable responsive `DataTable`; Categories CRUD (create/edit/delete/reorder) via server actions with Zod + revalidate; verified.
- _2026-06-04_ — **Phase 6 done.** Supabase Storage wired (bucket public, upload/url/delete tested); `ImageUploader` (drag-drop primary + gallery); Products CRUD with sectioned responsive form, variants, feature/status toggles, search/filter list; delete cleans up images; verified authed + build green.
- _2026-06-05_ — **Phase 7 done.** `createOrder` re-prices from the DB and writes order + items in a transaction; `OrderModal` persists then opens WhatsApp; admin orders list + detail + status switcher + WhatsApp reply; verified with a real order then cleaned up.
- _2026-06-05_ — **Phase 8 done.** Testimonials CRUD (create/edit/delete/reorder + inline publish toggle) via server actions; verified authed. Site-settings panel deferred (optional).
- _2026-06-05_ — **Phase 9 done — system complete.** Rate-limited sign-in + secure cookies; admin loading/error boundaries; `middleware`→`proxy` (Next 16); README rewritten. Final build green; full smoke test passes (all public + admin routes). **All 9 phases ✅** (optional site-settings panel is the only deferred item).
