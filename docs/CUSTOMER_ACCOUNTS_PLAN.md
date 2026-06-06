# Customer Accounts, Reviews & FAQ — Build Plan

> **✅ DELIVERED (2026-06-06).** All three phases built and committed:
> Phase 1 (accounts 1A–1G), Phase 2 (reviews), Phase 3 (FAQ). Migrations
> 0011–0016 applied. Needs **Resend enabled** for verification/notification
> emails; test the auth + checkout + review flows end-to-end on the deployment.


Adding a **customer** to the system: sign in / sign up, a responsive account
dashboard (orders, saved addresses, reorder), **product reviews** by real
buyers, **new-product notifications**, and a proper **FAQ**.

> **Phases:** 1) Customer accounts → 2) Reviews → 3) FAQ.
> Each phase ships independently and ends green (build + migration + verify).

---

## 0. Honest assessment & key decisions

This is the largest initiative so far. It's very doable on the current stack
(Better Auth already runs the admin; Resend, Drizzle, the checkout and order
model are all in place), but customer auth is a **security + privacy surface**,
not just UI. A few things I want to be straight about, and a few choices that
are genuinely yours to make before I code:

**My honest recommendations**
- **Keep guest checkout.** Forcing sign-up to buy *reduces* sales. Accounts
  should be an optional convenience (save addresses, track orders, reorder,
  review), never a wall in front of the cart.
- **Require email verification for customers.** Otherwise anyone could sign up
  with *your* email and "claim" your past orders. Verification (via Resend) is
  the gate that makes linking past orders by email safe. Small friction, big
  safety win.
- **Marketing/new-product emails must be opt-in (POPIA).** South Africa's POPIA
  treats unsolicited marketing as a no-go. We add a clear opt-in at signup and a
  toggle in account settings. Transactional emails (order/payment/tracking)
  don't need consent; product-announcement emails do.
- **Reviews should be purchase-gated.** Only a customer with a paid order
  containing the product can review it. This is what makes the ★ ratings
  trustworthy to customers *and* to Google (real, abuse-resistant). Admin still
  moderates.

**Decisions — CONFIRMED ✅ (locked 2026-06-06):**
| # | Question | Decision |
|---|---|---|
| D1 | Email verification for customers? | **Required.** Plus a deferred-password "create account at checkout" flow — see below. |
| D2 | New-product marketing emails | **Opt-in** (checkbox; POPIA-compliant). |
| D3 | Review eligibility | **Paid order**, and **admin audits/approves each review before it shows** (moderation). |
| D4 | FAQ source | **Admin-managed table** with a clean management page. |
| D5 | Claim past guest orders by verified email | **Yes** (after verification). |
| D6 | One editable review per product per customer | **Yes.** |

### Account creation flows (D1)
Two ways to get an account, both ending **email-verified with a password set**:

1. **Standard signup** (`/signup`): email + password (with a **strength meter**)
   + name → verification email → verify → signed in.

2. **Create account at checkout (deferred password)** — the smooth path:
   - At checkout, a **"Create an account" checkbox** (uses the email they're
     already entering — no password asked here).
   - On placing the order, we create the account (unverified, no password) and
     send a **verification email**.
   - Clicking the link **verifies the email** and **redirects to a Set-Password
     page** (with the **strength check**); on submit the password is set, the
     account is active and signed in, and the just-placed order is linked.
   - If they don't finish, the order is still saved as a normal (guest) order
     and can be claimed later by verifying that email (D5).

Password rules everywhere: min length + strength meter (length, mixed case,
number/symbol), with a clear, friendly indicator.

---

## 1. Data model (new + changed)

**Better Auth `user`** (extend via additionalFields):
- `role` (exists) — customers default `"customer"`, admin stays `"admin"`.
- `phone` (text, null)
- `marketingOptIn` (bool, default false) — POPIA consent for product emails.

**`orders`** — add:
- `userId` (uuid, null, FK `user` → set null) — set when a logged-in customer
  checks out, or backfilled by **verified** email.

**`addresses`** (new):
- `id, userId (FK user, cascade), label, recipientName, phone, company?,
  streetAddress, localArea, city, zone (province), code (postal), country (ZA),
  isPrimary (bool), createdAt, updatedAt`.
- Exactly one `isPrimary` per user (enforced in the action).

**`reviews`** (new):
- `id, productId (FK product, cascade), userId (FK user, set null),
  orderId (FK order, set null), authorName (snapshot), rating (1–5),
  title?, body, status ('pending'|'published'|'rejected', default 'pending'),
  createdAt, updatedAt`.
- Unique `(userId, productId)` → one editable review per product per customer.

**`faqs`** (new, if D4 = admin-managed):
- `id, question, answer, category?, sortOrder, published, timestamps`.

**`notifications`** (optional, Phase 1G / nice-to-have):
- `id, userId, type, title, body, href?, readAt?, createdAt` — powers an
  in-dashboard bell + an audit trail for product-announcement emails. Can be
  deferred; emails work without it.

Testimonials stay **exactly as they are** (general brand social proof on the
home page) — separate concept from reviews.

---

## PHASE 1 — Customer accounts & dashboard

**Goal:** a customer can sign up, sign in, and manage their profile, addresses,
orders, reorders and notification prefs — without disturbing admin or guest
checkout.

### 1A — Auth foundation ✅ (commit `cc2f1e9`)
- [x] Better Auth email/password **sign-up enabled** with role `customer`
      (additionalFields: `role` server-only, `phone`, `marketingOptIn`); admin stays separate. Migration `0011` (role default → customer).
- [x] **Email verification required** (D1) + **password reset** — both wired to **Resend** via Better Auth `sendVerificationEmail` / `sendResetPassword` + branded templates.
- [x] **Set-password page at `/set-password`** (public, token-based — *not* under `/account`, so the gate can't block reset/deferred users). Handles **both** the forgot-password reset (`?token` → `resetPassword`) and the deferred flow (signed-in, no token → `setMyPassword` via Better Auth `setPassword`). Strength meter.
- [x] `createDeferredAccount` helper (credential-less, unverified account + verification email landing on `/set-password`); `nextCookies()` plugin added.
- [x] Rate-limited sign-up/sign-in/reset/send-verification; secrets server-only.
- [x] Guards: `requireUser()` + `getCurrentUser()`; **`requireAdmin()` hardened to `role === "admin"`**; edge `proxy.ts` gates `/account` → `/login?next=…` and `/admin` → `/admin/login`.
- [x] Pages: `/login` (resend-verify), `/signup` (strength + opt-in), `/forgot-password`, `/set-password` — on-brand, responsive (AuthShell + PasswordInput).
- **Accept:** ✅ standard + deferred-checkout account flows both work; reset works; rate-limited; admin unaffected; storefront stays static (header fetches session client-side).

### 1B — Header auth state + dashboard shell ✅ (commit `e93a35d`)
- [x] Header **AccountMenu** (client-fetched session so the storefront stays static): signed-out → **"Sign in"**; customer → menu (Dashboard, My orders, Sign out); admin → **Admin** link too.
- [x] `/account` layout + **AccountShell** (own shell, not the admin one): sidebar on desktop, scrollable nav on mobile, responsive.
- [x] Dashboard overview: greeting + quick-action cards.
- [x] `/account/settings`: name, phone, **marketing opt-in** (`updateUser`), **change password** (`changePassword`) with strength meter + inline feedback. *(Change-email deferred — email shown read-only; it needs its own re-verify flow.)*
- **Accept:** ✅ header reflects auth everywhere; account area responsive; settings persist.

### 1C — Saved addresses ✅ (commit `4a37330`)
- [x] `addresses` table (migration `0012`) + `address-schema` (zod, ZA provinces, recipient/phone) + `AddressView`.
- [x] `/account/addresses`: **AddressManager** — cards with Primary badge, inline add/edit form, **set primary**, inline delete confirm.
- [x] Owner-scoped actions: create / update / setPrimary / delete with single-primary enforcement (first auto-primary; deleting primary promotes the next).
- **Accept:** ✅ multiple addresses, exactly one primary.

### 1D — Order history ✅ (commit `e5de007`)
- [x] `orders.userId` (migration `0013`); set at checkout when logged in. **Backfill** `linkGuestOrdersByEmail` claims guest orders by the account's verified email (idempotent, case-insensitive) on orders-page load.
- [x] `/account/orders`: list with payment/status/tracking badges.
- [x] `/account/orders/[id]`: items, totals, delivery address, shipment status + tracking link.
- [x] Owner-scoped (404 for other customers' orders).
- **Accept:** ✅ customer sees only their orders + live tracking.

### 1E — Checkout integration ✅ (commit `a7cdfe8`)
- [x] Logged-in: prefill name/email/phone; **saved-address picker** (primary pre-selected, "Use a new address") + optional **"Save this address"**.
- [x] Guest: **"Create an account" checkbox** → deferred-password flow (`placeOrder` → `createDeferredAccount` → verify→set-password email).
- [x] Order links to `userId` (logged-in); new address saved if asked (best-effort side-effects).
- [x] Guest checkout (no account / no checkbox) unchanged.
- **Accept:** ✅ logged-in checkout is 2 taps; guest can opt in via one checkbox; plain guests unaffected.

### 1F — Reorder + product history line ✅ (commit `e69387a`)
- [x] **Buy again** on `/account/orders/[id]` → `reorder` action re-prices the order's items from current active products (skips unavailable) → cart → `/checkout`.
- [x] **Product history line** (`ProductHistoryLine` client island): "You ordered this on {date}" + one-tap re-add for past buyers. Product page stays static.
- **Accept:** ✅ reorder uses current prices; history line only for genuine buyers.

### 1G — New-product notifications ✅ (commit `e9a9184`)
- [x] `marketingOptIn` opt-in (signup checkbox + settings toggle).
- [x] Admin **"Notify customers"** card on the product editor (migration `0014` adds `products.notifiedAt`): audience **"past buyers in this category"** or **"all opted-in"**; `notifyAboutProduct` action emails only opted-in, **email-verified** customers via Resend + branded `newProductEmail`; records last-sent.
- [x] *(Deviation, intentional/safer):* an **explicit button**, not auto-on-save — avoids accidental email blasts.
- **Accept:** ✅ emails opted-in similar-buyers; opt-outs never emailed; requires Resend.
- *Honest caveats:* sends sequentially (fine for small lists; a queue/batch is a future improvement); opt-out is the settings toggle rather than a one-click unsubscribe link.

> **Phase 1 acceptance:** ✅ full account lifecycle end-to-end, guest checkout intact, admin untouched (now role-gated), responsive, build green.

---

## PHASE 2 — Product reviews

**Goal:** verified buyers leave star reviews; admin moderates; product pages
show ratings and earn ★ rich snippets on Google. (Depends on Phase 1.)

> **✅ DELIVERED — commit `5936d93`.** Migration `0015`.

### 2A — Model & gating ✅
- [x] `reviews` table (unique `(userId, productId)`); queries `getProductReviews`, `getReviewStats` (avg+count), `canReview` (returns the qualifying **paid** order id — D3), `getMyReview`, `getAdminReviews`.

### 2B — Customer write/edit review ✅
- [x] `ReviewForm` client island on product pages (eligibility-gated): star input + title + body; one editable review per product (D6); edits re-enter `pending`. *(Entry from the product page; per-order-item entry left as a future nicety — products link from the order already.)*
- **Accept:** ✅ only eligible buyers submit; resubmission upserts (no dupes).

### 2C — Admin moderation ✅
- [x] `/admin/reviews` — filter (pending/published/rejected/all), **publish / reject / delete**, author + product link; nav entry added.
- **Accept:** ✅ admin controls what's public; pending never shows.

### 2D — Product page + SEO ✅
- [x] Product page **Reviews** section (avg ★, count, published list) + `ReviewForm`; `productLd` gains **`aggregateRating` + `review[]`** when published reviews exist → ★ rich-results eligible. Revalidates the product page on moderation; page stays static (form is a client island).
- **Accept:** ✅ ratings render; structured data present; no markup at 0 reviews.

### 2E — Review emails (light)
- [ ] **Deferred (optional):** invite-to-review after delivery + notify admin of a new pending review — admin already sees pending reviews in the dashboard, so this is a nice-to-have.

> **Phase 2 acceptance:** ✅ submit → moderate → publish → shows on product + in structured data; build green.

---

## PHASE 3 — FAQ

**Goal:** an on-brand FAQ that ranks (FAQPage schema) and answers real buyer
questions (shipping, collection, payment, custom orders, candle/soap care, eco
packaging, returns, gifting). Independent of Phases 1–2 — **could be pulled
forward as a quick SEO win.**

> **✅ DELIVERED — commit `20d1393`.** Migration `0016`.

- [x] (D4) `faqs` table + admin CRUD — `/admin/faqs` **FaqManager** (add/edit, publish toggle, reorder, delete) + nav entry.
- [x] `/faq` page: grouped accordion (native `<details>`, static-friendly), on-brand, metadata + canonical + OG.
- [x] **`FAQPage` JSON-LD** (`faqLd` in `lib/seo.ts`) → FAQ rich results.
- [x] **Footer** link + `/faq` in the **sitemap**. Starter FAQ content (`data/faq.ts`) seeded on a fresh DB (idempotent). *(Link from footer; Contact link not added — footer + nav are enough.)*
- **Accept:** ✅ FAQ renders + is admin-editable; FAQPage structured data; in the sitemap.

---

## Risks / things to keep honest about
- **Privacy (POPIA):** product-announcement emails are opt-in; transactional
  emails are fine. Store only what's needed; let customers delete addresses.
- **Order-claiming abuse:** linking guest orders by email is gated behind email
  verification (D1/D5) — without that it's unsafe.
- **Conversion:** never block the cart behind sign-up; accounts are additive.
- **Email deliverability:** depends on the Resend domain being verified
  (already required for order emails).
- **Scope:** Phase 1 is genuinely large (≈ the size of the whole shipping+
  payment initiative). We ship it sub-phase by sub-phase, each green.

## Suggested order of execution
Phases as you asked (Customer → Reviews → FAQ). If you'd like an early SEO win,
**FAQ (Phase 3) is independent and small** — I can slot it in first without
blocking anything. Your call.
