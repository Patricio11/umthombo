# Bring-back (container) discount — rebuild as an admin-managed, per-line rule

## The bug (confirmed)

`orders.own_container` is a single **order-level boolean**. In five places the math is:

```ts
goodsTotal = ownContainer ? Math.round(subtotal * 0.9) : subtotal
```

`server/actions/checkout.ts:142` · `server/actions/orders.ts:100,191,235` · `store/cart.ts:100` · `components/admin/orders/OrderForm.tsx:81`

So one tick takes **10% off the entire order**. A customer who bought 4 items and returned **1 jar for 1 of 2 eligible products** got 10% off all four. On a large order that's real money.

**Root cause is deeper than the math:** there is **no eligibility data at all** — no `container`/`jar`/`reusable` field on `products`. The system can't tell a jar candle from a pillar candle, and `order_items` has no discount column, so the discount can only ever be all-or-nothing.

**Category is not a usable proxy.** The live catalogue mixes returnable and non-returnable in the same category: *Home* has jar candles (Cinnamon Whisper, Cleary, Luxewax) **and** sculptural pieces sized by dimensions (Crimson Petal 10×7cm, Herbal Union 14.5×4.5cm, Pyramine 5.5×11cm) with no jar. Same in *Body* (a 60g bar vs a 125ml tub). Eligibility must be **per product**.

---

## Locked decisions

| Area | Choice |
|---|---|
| **Granularity** | **Per jar returned** — 10% off *one unit's* price per jar, capped at that line's qty. 3 candles + 1 jar = one candle discounted. |
| **Scope** | **Per line, never order-wide.** The old global checkbox is removed. |
| **Eligibility** | A per-product **Reusable container** flag. Admin-managed. |
| **Configurable** | Admin sets **on/off**, the **percent** (default 10), and the **scope** (all products / only ticked products). Nothing hardcoded. |
| **Authority** | Server recomputes every line from the DB — the client can never set a price or a discount. |
| **Back-compat** | Existing orders keep `own_container` + their stored totals so their history still reads correctly. |

---

## Data model

**Settings** (singleton — the rule):
- `container_discount_enabled` boolean, default `true`
- `container_discount_percent` integer, default `10`
- `container_discount_scope` text — `"selected"` (default) | `"all"`

**products**
- `container_eligible` boolean, default `false` — "comes in a returnable jar/bottle/tub"

**order_items** (snapshot what actually happened)
- `containers_returned` integer, default `0`
- `discount_zar` integer, default `0` — the line's discount

**orders**
- `discount_zar` integer, default `0` — order total discount (stored, not derived)
- `own_container` — **kept** for legacy orders; no longer written by new checkouts

---

## The math (one shared helper, server-authoritative)

```
eligible(line)  = scope === "all" || product.container_eligible
jars(line)      = eligible ? clamp(requested, 0, line.qty) : 0
lineDiscount    = round(unitPrice * percent / 100) * jars
orderDiscount   = Σ lineDiscount
goods           = subtotal − orderDiscount
```
Disabled rule ⇒ `percent` ignored, all discounts `0`.

---

## Admin UX — "fully managed"

**New `/admin/discounts`** (one screen to run the whole rule):
- Toggle **on/off**; **percent** input; **scope**: *All products* / *Only selected products*.
- When *selected*: a **searchable product checklist** (image, name, category) to tick eligible products in bulk — writes `products.container_eligible`.
- A live line: "Applies to **7 of 19** products at **10%**."

**Product editor** — a *Reusable container* toggle in the Options card (same flag; the Discounts page is just the bulk editor, so one source of truth).

**Order form / order detail** — per eligible line, a jars-returned stepper; shows the per-line discount. Admin can correct any order.

## Customer UX

- Cart drawer + checkout: **only eligible lines** show a small stepper — *"Bringing back a jar? 0/1/2…"* capped at that line's qty. No global checkbox.
- The discount block only appears when the rule is on **and** the cart has an eligible product.
- Order summary / detail / emails show the discount (and per-line where shown).

---

## Status

**Built ✓** — migration `0024`, green build, math verified against the real order
(`UMT-260708-B06F`: now **−R13** instead of **−R46**).

**Ships safe:** `container_eligible` defaults to **false** for every product and
scope defaults to **selected**, so **no discount applies until the owner ticks
products** at `/admin/discounts`. Nothing can be over-discounted in the meantime.

## Phases

### Phase 1 — Data + math
- [x] Migration: the settings/products/order_items/orders columns above.
- [x] `lib/discount.ts`: one shared `computeDiscount(lines, rule)` used by cart, checkout, and admin — kills the 5 duplicated `* 0.9`s.
- [x] `getDiscountRule()` reader; extend `SiteSettings`.

### Phase 2 — Admin
- [x] `/admin/discounts` page + actions (toggle, percent, scope, bulk-set eligible products), sidebar entry.
- [x] Product editor *Reusable container* toggle.

### Phase 3 — Customer flow
- [x] Cart store: per-item `containersReturned` (+ `containerEligible`); drop the global `ownContainer`.
- [x] Cart drawer + checkout steppers + summary.
- [x] `placeOrder`: validate/clamp per line from the DB, persist line + order discounts.

### Phase 4 — Admin orders + display
- [x] Admin order create/edit: per-line stepper; recompute server-side.
- [x] Order detail (admin + account) + emails: show discount; legacy orders still render.

### Phase 5 — Rollout
- [ ] **Owner action:** tick the genuinely jarred products at `/admin/discounts`. Nothing is eligible until then, so the discount is effectively off — by design.
- [x] Green build + math verified (eligible / non-eligible / qty > jars / over-claim clamp / rule off / scope=all).

---

## Note on trust
The customer self-declares jars at checkout and pays immediately, so a no-show jar still gets the discount. Per-line caps that exposure to **one unit** instead of a whole order, and the admin can correct any order before fulfilling. (A "verify before discount" flow would mean not charging at checkout — out of scope.)
