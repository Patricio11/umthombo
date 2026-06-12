# Adding a payment gateway — the complete checklist

The single source of truth for wiring a **new online payment gateway** (we have
YetoEFT, Yoco and Bob Pay). Miss a step and you get a silent gap — twice now a
gateway's admin page **404'd** because it wasn't added to one array (see
[⚠️ The two arrays that bite](#-the-two-arrays-that-bite)). Work top-to-bottom;
each row is `file → what to add`. Replace `xpay` with your gateway's key.

> Most of the UI is **data-driven** off `INTEGRATION_META` + `PAYMENT_PRESENTATION`
> — the integrations list, the active-gateway picker and the checkout chooser all
> pick a new gateway up automatically **once the types + those two maps include
> it**. The manual gaps are the per-gateway client, the branches, the webhook,
> and the two allowlists below.

---

## ⚠️ The two arrays that bite

These aren't type-checked against the union, so TypeScript won't catch a miss —
the symptom is a **404** or an **"Unknown provider"** error, not a build failure:

1. **`CONFIGURABLE`** in `src/app/admin/(panel)/integrations/[key]/page.tsx` —
   the detail route `notFound()`s any key not listed. **Missing → `/admin/integrations/xpay` 404s.** (Bit Yoco, then Bob Pay.)
2. **`VALID`** in `setPaymentProvider` (`src/server/actions/integrations.ts`) —
   guards the active-gateway pick. **Missing → "Unknown provider." when you click it Live.**

---

## 1. Types + metadata — `src/lib/integrations.ts`
- [ ] `IntegrationKey` union — add `"xpay"`.
- [ ] `PaymentProvider` union — add `"xpay"`.
- [ ] `PAYMENT_PRESENTATION.xpay` — `{ label, sublabel }` shown at checkout.
- [ ] `XpayConfig` interface — the config shape (e.g. `apiKey`, `sandbox`, …).
- [ ] `SECRET_FIELDS.xpay` — which config keys are secrets (masked, blank-keeps).
- [ ] `INTEGRATION_META.xpay` — `{ name, category: "payment", blurb }`.

## 2. Config reader — `src/server/db/integrations.ts`
- [ ] `isConfigured` — a `case "xpay"` (what makes it "ready").
- [ ] `getXpayConfig()` — typed getter (null when disabled/unconfigured).
- [ ] `getCheckoutPayment()` — add to the `Promise.all`, the `ready` pushes, **and** the `order` array (controls option order).

## 3. Gateway client — `src/server/payments/xpay.ts` *(new)*
- [ ] `createXpayCheckout/Intent(config, input)` → returns the redirect URL.
- [ ] `verifyXpayWebhook(...)` → however that gateway authenticates callbacks.
- [ ] Amount formatting (cents vs rand!) + sandbox/prod base-URL switch.

## 4. Payment routing — two places, same branch
- [ ] `src/server/payments/gateway.ts` — add to the `available` map, the active-resolution fallback chain, and an `xpay` branch. (Covers **custom-request deposits/balances**.)
- [ ] `src/server/actions/checkout.ts` — same: `available` map, active resolution, and an `xpay` branch. (Covers **orders**; has the customer's phone.)

## 5. Webhook — `src/app/api/webhooks/xpay/route.ts` *(new)*
- [ ] Verify → resolve the record (by metadata or by our reference / `orderNumber` + `requestNumber`) → idempotent insert into `payment_events` (`provider: "xpay"`) → on paid, `handleOrderPaid(orderId)` **or** `handleCustomPaymentPaid(id, kind)`.

## 6. Schemas + allowlists
- [ ] `src/lib/checkout-schema.ts` — add `"xpay"` to the `paymentProvider` enum.
- [ ] **`CONFIGURABLE`** array — `src/app/admin/(panel)/integrations/[key]/page.tsx`. ⚠️ *(the 404 gap)*
- [ ] **`VALID`** array — `setPaymentProvider` in `src/server/actions/integrations.ts`. ⚠️

## 7. Admin config form — `src/components/admin/integrations/IntegrationForm.tsx`
- [ ] A `detail.key === "xpay"` render block (its fields).
- [ ] A `detail.key === "xpay"` branch in `onSubmit`'s `buildConfig`.

## 8. Docs
- [ ] README — Integrations table row + the webhook-URL bullet (`…/api/webhooks/xpay`).
- [ ] `.env.example` — add the gateway to the integrations comment + webhook list.
- [ ] A short `docs/XPAY_INTEGRATION.md` (auth, create-payment, webhook specifics).

---

## What you do NOT need
- **No migration.** `orders.payment_provider`, `settings.payment_provider` and
  `payment_events.provider` are all free-text `text` columns; credentials live
  in the `integrations` table's JSON `config`. Adding a provider string needs no
  schema change.
- **No checkout-UI changes** for the option itself — `CheckoutClient` maps over
  `payment.options`, so a new ready gateway appears in "How would you like to
  pay?" automatically.

## Quick verification
- `npx tsc --noEmit` (catches the union/`Record<PaymentProvider>` misses — but
  **not** the two arrays above).
- Open `/admin/integrations` → the card shows; click it → **no 404**; configure
  + enable → it appears in the **Active gateway** picker; set Live → **no
  "Unknown provider."**
- Sandbox: one end-to-end payment → webhook flips the order to **paid**.
