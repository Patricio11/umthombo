# Promotions & coupons — build plan

Add an admin-managed promotions engine on top of the bring-back discount: **coupon codes** *and* **automatic rules** (e.g. free delivery over R350), because they're the same rule with one flag — `code = null` means it applies itself.

---

## Grounding: what the data says

Every delivery order to date:

| Courier cost | Cart |
|---|---|
| R71 | R150 |
| R65 | R185 |
| R65 | R140 |
| R59 | R70 |
| R59 | R45 |

**Avg cart R118, biggest ever R185. Courier R59–R71 (avg R64).**

Two consequences worth remembering while setting numbers:
1. **A R2000 threshold would never fire.** Realistic is ~R300–R400. The threshold is fully admin-configurable — no number is baked in — but the admin should set it against this reality.
2. **Free shipping is the most expensive lever.** It's a *live BobGo rate we still pay in full*, not a fixed discount. At a R350 threshold, ~R65 is **~19% of the order** — roughly double what the 10% bring-back discount gives away. Uncapped by choice (below), so distant/heavy parcels cost more.

---

## Locked decisions

| Area | Choice |
|---|---|
| **Threshold** | **Fully configurable per promotion.** No default baked into code. **[confirmed]** |
| **Stacking** | **Per-coupon switch** ("can combine with the bring-back discount"). When **off → best-one-wins**: apply whichever saves the customer more, never both. **[confirmed]** |
| **Free shipping** | **Fully free — no cap.** We absorb the whole courier cost. **[confirmed]** |
| **Authority** | Server re-validates and re-computes every promo from the DB at `placeOrder`. The client can never apply a discount. |
| **Margin visibility** | Record the **real courier cost** separately from what we charged (non-negotiable — see below). |

### The margin trap (why a new column)
Today `orders.delivery_fee_zar` is *both* the real BobGo cost and what the customer paid. Free shipping sets what the customer pays to **0** — if we just zero that column, the real cost vanishes and **analytics silently under-reports cost**. Same class of bug as the order-wide discount.

So: `shipping_cost_zar` = what BobGo charges us (always), `delivery_fee_zar` = what we charged (0 when free). Existing rows backfill `shipping_cost_zar = delivery_fee_zar`.

---

## Data model

**`promotions`**
- `id` · `name` (admin label, e.g. "Free delivery over R350")
- `code` text **unique, nullable** — `null` = **automatic** (no code needed)
- `type` enum: `percent` | `fixed` | `free_shipping`
- `value` int — percent (10 = 10%) or rand (50 = R50); ignored for `free_shipping`
- `min_subtotal_zar` int nullable — the threshold (admin sets; no default)
- `starts_at` / `ends_at` timestamptz nullable
- `usage_limit` int nullable — total redemptions allowed
- `stackable` bool default **false** — may combine with the bring-back discount
- `enabled` bool default true · timestamps

**`promotion_redemptions`** — `promotionId`, `orderId`, `email`, `createdAt`. Usage is **counted from here** (single source of truth) and gives an audit trail + reporting.

**`orders`** — `promotion_id` nullable · `coupon_code` (snapshot) · `promo_discount_zar` default 0 · `shipping_cost_zar` default 0 (the real cost).

---

## The math (extends `lib/discount.ts`, one shared helper)

```
subtotal        = Σ lineTotal
containerDisc   = Σ per-line jar discount            (existing)
eligible(promo) = enabled && in date window && under usage limit
                  && subtotal >= min_subtotal_zar     (threshold on the pre-discount subtotal)

promoValue = percent        -> round(goodsAfterContainer * value/100)
           | fixed          -> min(value, goodsAfterContainer)
           | free_shipping  -> deliveryFee            (its rand value = the courier cost)

stackable  -> containerDisc AND promoValue both apply
!stackable -> apply max(containerDisc, promoValue) only   ← best-one-wins

total = subtotal − goodsDiscount + chargedDelivery
```
Every promo type has a **rand value**, so "best-one-wins" compares like with like — including free shipping (worth exactly the courier fee).

> **Threshold basis:** the **pre-discount subtotal**, so "cart over R350" means what the customer sees in the cart. Predictable and easy to explain.

---

## Admin UX

**`/admin/discounts` gains tabs:** *Bring-back* (existing) · *Coupons*.

Coupons tab — a table (code/automatic, type, value, used/limit, window, status) + an editor:
- Name · **Code** (or *"Applies automatically — no code"*)
- Type: % off / R off / Free delivery
- Value · **Minimum spend** (the configurable threshold)
- Date window · Usage limit
- **"Can combine with the bring-back discount"** switch
- Enabled toggle
- A live plain-English preview: *"Free delivery on orders over R350. No code needed. 12 of 100 used."*

## Customer UX

- Checkout: a quiet **"Have a code?"** field → validated server-side, shows applied/why-not.
- **Automatic** promos apply silently and appear in the summary (*"Free delivery — orders over R350"*).
- Free delivery shows the fee struck through as **R0** on the delivery step.
- Summary/emails/order detail show the promo line (derived, so old orders still read right).

---

## Status

**Built ✓** — migration `0025` (with the shipping-cost backfill), green build, and
verified end-to-end against the live DB: automatic free delivery, case-insensitive
codes, threshold + collection guards, and best-one-wins stacking.

**Nothing is hardcoded.** Beyond the plan, two more knobs became admin-controlled:
the **free-shipping cap** (blank = fully free, as chosen — but capping later needs
no code) and the **bring-back discount label** itself.

**Ships safe:** no promotions exist yet, so nothing applies until one is created
at `/admin/discounts → Coupons & offers`.

## Phases

### Phase 1 — Data + math
- [x] Migration: `promotions`, `promotion_redemptions`, the `orders` columns, **backfill `shipping_cost_zar = delivery_fee_zar`**.
- [x] Extend `lib/discount.ts`: `evaluatePromotion(promo, ctx)` + stacking/best-of resolution. One helper, shared by checkout + admin.

### Phase 2 — Admin
- [x] Promotions CRUD actions (+ Zod), Coupons tab + editor, usage counts.

### Phase 3 — Checkout
- [x] `validateCoupon(code, cart)` action (preview only — never authoritative).
- [x] Code field + automatic-promo display + free-delivery presentation.
- [x] `placeOrder`: re-validate from the DB, apply, persist `promo_discount_zar`/`shipping_cost_zar`, write a redemption.

### Phase 4 — Display + reporting
- [x] Order detail (admin + account) + emails show the promo line. The admin order shows the courier cost you absorbed on a free-delivery order.
- [ ] **Follow-up:** surface `shipping_cost_zar` in Analytics. Nothing is *wrong* today — its delivery figure is what you **charged** (correctly R0 when free) — but the courier **cost** isn't shown anywhere aggregate, so "what did free delivery cost me this month?" can't be answered yet. Worth doing once a free-delivery promo is actually live.

### Phase 5 — Rollout
- [x] Green build + tests: threshold boundary, expiry, usage limit, stack on/off (best-of), free delivery on collection orders (must be a no-op).

---

## Out of scope for v1
Per-product/category restrictions · per-customer limits · BOGO/tiered · auto-picking the best of several promos (v1 = one promo per order) · referral codes.

## Risks
- **Codes leak.** They end up in WhatsApp groups — hence the usage limit + date window. Set both on anything generous.
- **Free delivery is uncapped by choice.** A heavy parcel to a far province costs well above the R59–R71 seen so far, and we absorb all of it. `shipping_cost_zar` at least makes that visible.
- **Collection orders** must never get "free delivery" (no fee to waive) — explicitly tested.
