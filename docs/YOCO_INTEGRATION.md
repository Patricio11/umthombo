# Yoco Payment Integration

A second online payment gateway alongside YetoPay, so you can **switch instantly**
if one ever has issues. Both can be configured and enabled at once; a single
**Active payment gateway** picker decides which one is live, with automatic
fallback to the other.

## How switching works

`/admin/integrations` → **Active payment gateway** card → pick YetoEFT or Yoco.

`placeOrder` resolves the live gateway like this:
1. If your picked provider is enabled + configured → use it.
2. Otherwise → fall back to whichever payment provider *is* enabled + configured
   (YetoEFT takes priority if both are).
3. Otherwise → WhatsApp / manual (unchanged).

So if Yoco (or YetoPay) ever goes down, flip the picker - or just disable the
broken one - and checkout keeps working.

## Letting customers choose (Pay by bank vs Card)

The same card has a **“Let customers choose at checkout”** toggle:

- **Off** → only the active gateway is used (above behaviour).
- **On** → when **both** gateways are enabled + configured, checkout shows a
  selector - 🏦 **Pay by bank** (YetoPay) / 💳 **Card** (Yoco) - pre-selected on
  the active gateway (the picker = the default). If only one gateway is ready,
  no selector appears and it just uses that one.

The customer's choice is sent to `placeOrder` and **re-validated server-side**:
it's honoured only when the toggle is on and the chosen gateway is ready,
otherwise the default is used. Stored in `settings.offer_both_gateways`
(migration `0018`); customer-facing labels live in `PAYMENT_PRESENTATION`
(`src/lib/integrations.ts`). For the “Pay by bank” label to be accurate, set
YetoPay's method to **Instant EFT**.

## One-time setup (Yoco)

1. **Get your secret key.** Yoco dashboard → *Sell online → Payment gateway →
   API keys*. Copy the **secret key** (`sk_test_…` for testing, `sk_live_…` for
   live). The secret key alone authenticates everything - no merchant ID.
2. **/admin/integrations → Yoco → Configure.** Paste the secret key, **Save**.
3. **Test connection** - creates (does not charge) a R1 checkout to confirm the
   key works.
4. **Register webhook** (on the same page). With the key saved, click it once.
   It calls Yoco's API to subscribe `…/api/webhooks/yoco` and stores the
   returned signing secret (`whsec_…`) automatically - Yoco only returns it once.
5. **Enable** Yoco (toggle on the integrations list).
6. **Set it live** if you want it active now: Active payment gateway → **Yoco**.

> Test mode: use `sk_test_…`. Yoco provides test cards in their docs. No real
> money moves until you switch to `sk_live_…`.

## Architecture (mirrors YetoPay)

| Concern | File |
|---|---|
| Config shape + secrets | `src/lib/integrations.ts` (`YocoConfig`, key `yoco`) |
| Typed config getter | `src/server/db/integrations.ts` (`getYocoConfig`) |
| API client | `src/server/payments/yoco.ts` |
| Checkout selection | `src/server/actions/checkout.ts` (`placeOrder`) |
| Webhook handler | `src/app/api/webhooks/yoco/route.ts` |
| Admin save/test/register | `src/server/actions/integrations.ts` |
| Admin UI | `IntegrationForm.tsx`, `IntegrationsList.tsx` |
| Active-gateway setting | `settings.payment_provider` (migration `0017`) |

### Checkout API
- `POST https://payments.yoco.com/api/checkouts`
- `Authorization: Bearer <secretKey>`, `Idempotency-Key: <orderNumber>`
- Body: `amount` (**cents** - we send `rand × 100`), `currency:"ZAR"`,
  `successUrl`, `cancelUrl`, `failureUrl`, `metadata:{orderId, orderNumber}`.
- Response: `redirectUrl` (we send the customer there - **redirect only**, no
  iframe), `id` (stored as the payment reference).

### Webhook (Standard Webhooks)
- Headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`.
- Verify: `signedContent = "{id}.{timestamp}.{rawBody}"`; secret is the
  `whsec_…` value with the prefix stripped and **base64-decoded**;
  `expected = base64(HMAC_SHA256(secret, signedContent))`; the header is a
  space-separated list of `v1,<sig>` - any match passes. Timestamp must be
  within ±5 minutes (replay protection).
- On `payment.succeeded` → mark the order **paid**, then `handleOrderPaid`
  (customer/admin emails + BobGo shipment), idempotent via
  `payment_events.eventId` (= `webhook-id`).

## Deploy notes
- This adds the `settings.payment_provider` column → run **`npm run db:migrate`**
  before/at deploy (your build command already does migrate-before-build).
- The Yoco integration row is **self-healing**: it shows in admin and is created
  on first save - no re-seed needed.
- Nothing changes for existing YetoPay setups; with no active provider chosen,
  YetoPay stays the default.
