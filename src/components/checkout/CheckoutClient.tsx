"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Truck, Store, Check, X, Plus } from "lucide-react";
import { useCart, selectSubtotal, selectTotal } from "@/store/cart";
import {
  ZA_PROVINCES,
  type CheckoutPaymentInfo,
  type PaymentProvider,
} from "@/lib/integrations";
import { rateEta, type DeliveryAddress, type RateOption } from "@/lib/shipping";
import type { AddressView } from "@/lib/address-schema";
import { getDeliveryRates } from "@/server/actions/shipping";
import { placeOrder } from "@/server/actions/checkout";
import {
  loadCheckoutDraft,
  saveCheckoutDraft,
  clearCheckoutDraft,
} from "@/lib/checkout-draft";
import { formatZAR } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Honeypot } from "@/components/ui/Honeypot";

type Method = "delivery" | "collection";

const EMPTY_ADDRESS: DeliveryAddress = {
  company: "",
  streetAddress: "",
  localArea: "",
  city: "",
  zone: "",
  code: "",
  country: "ZA",
};

const addressToDelivery = (a: AddressView): DeliveryAddress => ({
  company: a.company ?? "",
  streetAddress: a.streetAddress,
  localArea: a.localArea ?? "",
  city: a.city,
  zone: a.zone,
  code: a.code,
  country: a.country || "ZA",
});

const oneLine = (a: AddressView) =>
  [a.company, a.streetAddress, a.localArea, a.city, a.code]
    .filter(Boolean)
    .join(", ");

export function CheckoutClient({
  deliveryEnabled,
  collectionInfo,
  account,
  savedAddresses,
  payment,
}: {
  deliveryEnabled: boolean;
  collectionInfo: string;
  account: { name: string; email: string; phone: string } | null;
  savedAddresses: AddressView[];
  payment: CheckoutPaymentInfo;
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const ownContainer = useCart((s) => s.ownContainer);
  const clearCart = useCart((s) => s.clear);
  const subtotal = useCart(selectSubtotal);
  const goodsTotal = useCart(selectTotal); // after own-container discount

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [phone, setPhone] = useState(account?.phone ?? "");
  const [method, setMethod] = useState<Method>(
    deliveryEnabled ? "delivery" : "collection"
  );
  const [address, setAddress] = useState<DeliveryAddress>(EMPTY_ADDRESS);
  const [note, setNote] = useState("");

  // Saved-address picker (logged-in customers)
  const hasSaved = savedAddresses.length > 0;
  const [addrMode, setAddrMode] = useState<"saved" | "new">(
    hasSaved ? "saved" : "new"
  );
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(
    savedAddresses.find((a) => a.isPrimary)?.id ?? savedAddresses[0]?.id ?? null
  );
  const [saveAddress, setSaveAddress] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [hp, setHp] = useState(""); // honeypot
  const [provider, setProvider] = useState<PaymentProvider | null>(
    payment.defaultProvider
  );

  const [rates, setRates] = useState<RateOption[] | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [serviceCode, setServiceCode] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [payFrame, setPayFrame] = useState<{
    url: string;
    orderNumber: string;
  } | null>(null);
  // True once an order is handed off, so the "empty selection" screen doesn't
  // flash while the basket is cleared and we navigate to the receipt.
  const [placed, setPlaced] = useState(false);

  // Persist the form so details survive the payment redirect (a failed payment
  // → "Try again" restores everything). Cleared once an order is placed.
  const [draftReady, setDraftReady] = useState(false);
  const draftServiceCode = useRef<string | null>(null);

  useEffect(() => {
    const d = loadCheckoutDraft();
    if (d) {
      if (d.name) setName(d.name);
      if (d.email) setEmail(d.email);
      if (d.phone) setPhone(d.phone);
      if (d.method && (d.method === "collection" || deliveryEnabled)) {
        setMethod(d.method);
      }
      if (d.address) setAddress(d.address);
      if (typeof d.note === "string") setNote(d.note);
      if (d.addrMode) setAddrMode(d.addrMode === "saved" && hasSaved ? "saved" : "new");
      if (d.selectedAddrId !== undefined) setSelectedAddrId(d.selectedAddrId);
      if (d.serviceCode) {
        setServiceCode(d.serviceCode);
        draftServiceCode.current = d.serviceCode;
      }
    }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    saveCheckoutDraft({
      name,
      email,
      phone,
      method,
      address,
      note,
      addrMode,
      selectedAddrId,
      serviceCode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftReady, name, email, phone, method, address, note, addrMode, selectedAddrId, serviceCode]);

  // Any address change/selection invalidates previously fetched rates.
  const invalidateRates = () => {
    setRates(null);
    setServiceCode(null);
    setRatesError(null);
  };

  const setAddr = (k: keyof DeliveryAddress, v: string) => {
    setAddress((a) => ({ ...a, [k]: v }));
    invalidateRates();
  };

  const selectedSaved =
    addrMode === "saved"
      ? savedAddresses.find((a) => a.id === selectedAddrId) ?? null
      : null;

  // The address actually used for rating + the order.
  const effectiveAddress: DeliveryAddress | null =
    method !== "delivery"
      ? null
      : addrMode === "saved"
      ? selectedSaved
        ? addressToDelivery(selectedSaved)
        : null
      : address;

  const selectedRate = rates?.find((r) => r.serviceCode === serviceCode) ?? null;
  const deliveryFee =
    method === "delivery" ? selectedRate?.priceZAR ?? 0 : 0;
  const total = goodsTotal + deliveryFee;

  const addressReady =
    method === "delivery" &&
    (addrMode === "saved"
      ? !!selectedSaved
      : address.streetAddress.trim().length >= 3 &&
        address.city.trim().length >= 2 &&
        address.zone.trim().length >= 2 &&
        address.code.trim().length >= 4);

  // Place-order is only enabled once everything needed is in: contact details,
  // and — for delivery — a courier option picked.
  const contactReady =
    name.trim() !== "" && email.trim() !== "" && phone.trim() !== "";
  const canPlace =
    contactReady && (method === "collection" || !!serviceCode);

  const fetchRates = async () => {
    if (!addressReady || !effectiveAddress) {
      setRatesError("Please complete the address first.");
      return;
    }
    setRatesLoading(true);
    setRatesError(null);
    setRates(null);
    setServiceCode(null);
    const res = await getDeliveryRates({
      items: items.map((i) => ({ slug: i.slug, qty: i.qty })),
      address: effectiveAddress,
    });
    setRatesLoading(false);
    if (res.ok && res.rates) {
      setRates(res.rates);
      // Re-select the option saved in the draft (after a failed-payment retry),
      // else auto-pick when there's only one.
      const saved = draftServiceCode.current;
      if (saved && res.rates.some((r) => r.serviceCode === saved)) {
        setServiceCode(saved);
        draftServiceCode.current = null;
      } else if (res.rates.length === 1) {
        setServiceCode(res.rates[0].serviceCode);
      }
    } else {
      setRatesError(res.error ?? "Couldn’t fetch delivery options.");
    }
  };

  const submitOrder = async () => {
    setSubmitError(null);
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setSubmitError("Please fill in your contact details.");
      return;
    }
    if (method === "delivery" && !serviceCode) {
      setSubmitError("Please choose a delivery option.");
      return;
    }
    setSubmitting(true);
    const res = await placeOrder({
      name,
      email,
      phone,
      method,
      address:
        method === "delivery" ? effectiveAddress ?? undefined : undefined,
      serviceCode: method === "delivery" ? serviceCode ?? undefined : undefined,
      note: note.trim() || undefined,
      ownContainer,
      createAccount: !account && createAccount,
      saveAddress: !!account && addrMode === "new" && saveAddress,
      hp,
      paymentProvider: payment.choose ? provider ?? undefined : undefined,
      items: items.map((i) => ({
        slug: i.slug,
        variant: i.variant ?? null,
        qty: i.qty,
        unitPriceZAR: i.unitPriceZAR,
      })),
    });
    if (!res.ok) {
      setSubmitting(false);
      setSubmitError(res.error ?? "Something went wrong. Please try again.");
      return;
    }
    if (res.mode === "payment" && res.redirectUrl) {
      if (res.paymentDisplay === "iframe") {
        // Inline hosted page — keep the basket behind the overlay; it's emptied
        // when payment completes. The success page, loaded inside the frame,
        // posts to the parent window (see PaymentFrame + ClearCartOnMount).
        setPayFrame({ url: res.redirectUrl, orderNumber: res.orderNumber! });
        setSubmitting(false);
        return;
      }
      // Full-page handoff — the basket is emptied when the customer returns to
      // /checkout/success (ClearCartOnMount), so it survives an abandoned payment.
      window.location.href = res.redirectUrl;
      return;
    }
    // No online payment step — capture the order, empty the basket, show receipt.
    setPlaced(true);
    clearCart();
    clearCheckoutDraft();
    if (res.mode === "whatsapp" && res.whatsappUrl) {
      window.open(res.whatsappUrl, "_blank", "noopener,noreferrer");
    }
    router.push(`/checkout/success?order=${res.orderNumber}`);
  };

  if (mounted && items.length === 0 && !placed && !payFrame) {
    return (
      <section className="px-5 py-24 text-center sm:px-8">
        <p className="editorial-italic text-2xl text-ink">
          Your selection is empty.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          Add a few things you love, then come back to check out.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center justify-center rounded-full border border-ink/25 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
        >
          Explore the shop
        </Link>
      </section>
    );
  }

  return (
    <section className="relative px-5 py-12 sm:px-8 lg:py-16">
      <Honeypot value={hp} onChange={setHp} />
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="eyebrow text-olive">Almost yours</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Checkout</h1>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
          {/* ---------- Form column ---------- */}
          <div className="space-y-6">
            {/* Contact */}
            <Panel title="Your details">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={inputCls}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 or 0…"
                    className={inputCls}
                  />
                </Field>
              </div>
              {!account && (
                <label className="flex items-start gap-2.5 rounded-xl bg-cream-2/50 px-4 py-3 text-sm text-ink-soft">
                  <Checkbox
                    checked={createAccount}
                    onChange={setCreateAccount}
                    className="mt-0.5"
                  />
                  <span>
                    Create an account with this email - we’ll send a link to set
                    your password, so you can track orders and reorder faster.
                  </span>
                </label>
              )}
            </Panel>

            {/* Method */}
            <Panel title="Delivery or collection">
              <div className="grid gap-3 sm:grid-cols-2">
                {deliveryEnabled && (
                  <MethodCard
                    active={method === "delivery"}
                    onClick={() => setMethod("delivery")}
                    icon={<Truck size={20} />}
                    title="Delivery"
                    sub="Courier, nationwide"
                  />
                )}
                <MethodCard
                  active={method === "collection"}
                  onClick={() => setMethod("collection")}
                  icon={<Store size={20} />}
                  title="Collection"
                  sub={collectionInfo || "Cape Town"}
                />
              </div>
              {!deliveryEnabled && (
                <p className="mt-3 rounded-xl bg-cream-2/60 px-4 py-3 text-sm text-ink-soft">
                  Online delivery isn’t available right now  choose collection,
                  or get in touch and we’ll arrange it.
                </p>
              )}
            </Panel>

            {/* Delivery address + rates */}
            {method === "delivery" && (
              <Panel title="Delivery address">
                {hasSaved && (
                  <SavedAddressPicker
                    addresses={savedAddresses}
                    selectedId={selectedAddrId}
                    mode={addrMode}
                    onSelect={(id) => {
                      setAddrMode("saved");
                      setSelectedAddrId(id);
                      invalidateRates();
                    }}
                    onNew={() => {
                      setAddrMode("new");
                      invalidateRates();
                    }}
                  />
                )}
                {(!hasSaved || addrMode === "new") && (
                  <>
                <Field label="Company (optional)">
                  <input
                    value={address.company}
                    onChange={(e) => setAddr("company", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Street address">
                  <input
                    value={address.streetAddress}
                    onChange={(e) => setAddr("streetAddress", e.target.value)}
                    placeholder="12 Main Road"
                    className={inputCls}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Suburb / area">
                    <input
                      value={address.localArea}
                      onChange={(e) => setAddr("localArea", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="City">
                    <input
                      value={address.city}
                      onChange={(e) => setAddr("city", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Province">
                    <Select
                      value={address.zone}
                      onChange={(v) => setAddr("zone", v)}
                      options={ZA_PROVINCES.map((p) => ({
                        value: p.code,
                        label: p.name,
                      }))}
                      placeholder="Choose…"
                    />
                  </Field>
                  <Field label="Postal code">
                    <input
                      value={address.code}
                      onChange={(e) => setAddr("code", e.target.value)}
                      inputMode="numeric"
                      className={inputCls}
                    />
                  </Field>
                </div>
                {account && (
                  <label className="flex items-center gap-2.5 text-sm text-ink-soft">
                    <Checkbox checked={saveAddress} onChange={setSaveAddress} />
                    <span>Save this address to my account</span>
                  </label>
                )}
                  </>
                )}

                {/* Rates */}
                <div className="mt-2">
                  {!rates && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={fetchRates}
                      disabled={ratesLoading || !addressReady}
                      className="w-full sm:w-auto"
                    >
                      {ratesLoading && (
                        <Loader2 size={16} className="animate-spin" />
                      )}
                      {ratesLoading ? "Finding couriers…" : "Proceed"}
                    </Button>
                  )}
                  {ratesError && (
                    <p className="mt-3 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">
                      {ratesError}
                    </p>
                  )}
                  {rates && rates.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-sm font-medium text-ink">
                        Choose a courier
                      </p>
                      {rates.map((r) => (
                        <RateRow
                          key={r.serviceCode}
                          rate={r}
                          active={serviceCode === r.serviceCode}
                          onSelect={() => setServiceCode(r.serviceCode)}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={fetchRates}
                        className="link-underline text-xs text-ink-soft"
                      >
                        Refresh options
                      </button>
                    </div>
                  )}
                </div>
              </Panel>
            )}

            {/* Note */}
            <Panel title="A note (optional)">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Personalisation, scent, colour, gift message…"
                className={`${inputCls} resize-none`}
              />
            </Panel>
          </div>

          {/* ---------- Summary column ---------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-cream-3 bg-cream-2/40 p-6">
              <h2 className="font-display text-2xl">Order summary</h2>

              <ul className="mt-5 space-y-3 border-b border-cream-3 pb-5">
                {mounted &&
                  items.map((i) => (
                    <li
                      key={`${i.slug}-${i.variant ?? ""}`}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <span className="text-ink">
                        {i.qty} × {i.name}
                        {i.variant ? (
                          <span className="text-ink-soft"> · {i.variant}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-soft">
                        {formatZAR(i.unitPriceZAR * i.qty)}
                      </span>
                    </li>
                  ))}
              </ul>

              <div className="space-y-2 py-5 text-sm">
                <Row label="Subtotal" value={formatZAR(subtotal)} muted />
                {ownContainer && (
                  <Row
                    label="Own container · 10% off"
                    value={`−${formatZAR(subtotal - goodsTotal)}`}
                    accent
                  />
                )}
                {method === "delivery" && (
                  <Row
                    label="Delivery"
                    value={
                      selectedRate
                        ? formatZAR(deliveryFee)
                        : rates
                        ? "Select an option"
                        : "Enter address"
                    }
                    muted
                  />
                )}
                {method === "collection" && (
                  <Row label="Collection" value="Free" muted />
                )}
              </div>

              <div className="flex items-baseline justify-between border-t border-cream-3 pt-4">
                <span className="font-medium text-ink">Total</span>
                <span className="font-display text-3xl">{formatZAR(total)}</span>
              </div>

              {payment.choose && (
                <fieldset className="mt-5">
                  <legend className="mb-2 text-sm font-medium text-ink">
                    How would you like to pay?
                  </legend>
                  <div className="space-y-2">
                    {payment.options.map((o) => {
                      const active = provider === o.provider;
                      return (
                        <button
                          key={o.provider}
                          type="button"
                          onClick={() => setProvider(o.provider)}
                          aria-pressed={active}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                            active
                              ? "border-olive bg-olive/5"
                              : "border-cream-3 hover:border-olive/40"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              active ? "border-olive" : "border-cream-3"
                            }`}
                          >
                            {active && (
                              <span className="h-2.5 w-2.5 rounded-full bg-olive" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-ink">
                              {o.label}
                            </span>
                            <span className="block text-xs text-ink-soft">
                              {o.sublabel}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {submitError && (
                <p className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">
                  {submitError}
                </p>
              )}

              <Button
                size="lg"
                className="mt-5 w-full"
                onClick={submitOrder}
                disabled={
                  submitting || !mounted || items.length === 0 || !canPlace
                }
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Placing your order…" : "Place order"}
              </Button>
              <p className="mt-3 text-center text-xs text-ink-soft">
                {mounted && !canPlace
                  ? !contactReady
                    ? "Add your contact details to continue."
                    : "Choose a delivery option to continue."
                  : "You’ll confirm payment on the next step."}
              </p>
            </div>
          </aside>
        </div>
      </div>

      {payFrame && (
        <PaymentFrame
          url={payFrame.url}
          onCompleted={() => {
            setPlaced(true);
            clearCart();
            clearCheckoutDraft();
            router.push(`/checkout/success?order=${payFrame.orderNumber}`);
          }}
          onFailed={() => {
            setPayFrame(null);
            setSubmitError(
              "Your payment wasn’t completed. Your selection is saved  you can try again."
            );
          }}
          onClose={() => setPayFrame(null)}
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline (iframe) payment overlay  webhook stays authoritative      */
/* ------------------------------------------------------------------ */
function PaymentFrame({
  url,
  onCompleted,
  onFailed,
  onClose,
}: {
  url: string;
  onCompleted: () => void;
  onFailed: (status: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    let origin: string | null = null;
    try {
      origin = new URL(url).origin;
    } catch {
      origin = null;
    }
    const onMessage = (e: MessageEvent) => {
      // Accept the hosted page's origin, or our own (the success page signals
      // the parent when it loads inside this frame after a completed payment).
      if (e.origin !== origin && e.origin !== window.location.origin) return;
      const data = (e.data ?? {}) as { type?: string; status?: string };
      if (data.type !== "payment_complete") return;
      if (data.status === "completed") onCompleted();
      else onFailed(data.status ?? "failed");
    };
    window.addEventListener("message", onMessage);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("message", onMessage);
      document.body.style.overflow = "";
    };
  }, [url, onCompleted, onFailed]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/50 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-cream shadow-2xl">
        <header className="flex items-center justify-between border-b border-cream-2 px-5 py-3.5">
          <span className="font-display text-lg">Secure payment</span>
          <button
            type="button"
            aria-label="Close payment"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-cream-2 hover:text-olive"
          >
            <X size={18} />
          </button>
        </header>
        <iframe
          src={url}
          title="YetoPay Payment"
          allow="payment"
          className="h-[680px] max-h-[80dvh] w-full bg-white"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                       */
/* ------------------------------------------------------------------ */
const inputCls =
  "w-full rounded-xl border border-cream-3 bg-cream px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-olive focus:outline-none";

function SavedAddressPicker({
  addresses,
  selectedId,
  mode,
  onSelect,
  onNew,
}: {
  addresses: AddressView[];
  selectedId: string | null;
  mode: "saved" | "new";
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="space-y-2.5">
      {addresses.map((a) => {
        const active = mode === "saved" && selectedId === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
              active ? "border-olive bg-olive/5" : "border-cream-3 hover:border-olive/40"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                active ? "border-olive bg-olive text-cream" : "border-cream-3"
              }`}
            >
              {active && <Check size={12} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">
                {a.label || a.recipientName}
                {a.isPrimary && (
                  <span className="ml-2 text-xs font-normal text-olive">Primary</span>
                )}
              </span>
              <span className="block truncate text-xs text-ink-soft">
                {oneLine(a)}
              </span>
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onNew}
        className={`flex w-full items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all ${
          mode === "new"
            ? "border-olive bg-olive/5 text-olive"
            : "border-cream-3 text-ink-soft hover:border-olive/40"
        }`}
      >
        <Plus size={16} /> Use a new address
      </button>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-cream-3 bg-cream p-6 sm:p-7">
      <h2 className="mb-4 font-display text-xl">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function MethodCard({
  active,
  onClick,
  icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all ${
        active
          ? "border-olive bg-olive/5"
          : "border-cream-3 bg-cream hover:border-olive/40"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          active ? "bg-olive text-cream" : "bg-cream-2 text-olive"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-ink">{title}</span>
        <span className="block truncate text-xs text-ink-soft">{sub}</span>
      </span>
    </button>
  );
}

function RateRow({
  rate,
  active,
  onSelect,
}: {
  rate: RateOption;
  active: boolean;
  onSelect: () => void;
}) {
  const eta = rateEta(rate);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
        active ? "border-olive bg-olive/5" : "border-cream-3 hover:border-olive/40"
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            active ? "border-olive bg-olive text-cream" : "border-cream-3"
          }`}
        >
          {active && <Check size={12} />}
        </span>
        <span>
          <span className="block text-sm font-medium text-ink">
            {rate.serviceName}
          </span>
          {eta && (
            <span className="block text-xs text-ink-soft">Arrives {eta}</span>
          )}
        </span>
      </span>
      <span className="shrink-0 font-display text-lg tabular-nums">
        {formatZAR(rate.priceZAR)}
      </span>
    </button>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        accent ? "text-olive" : muted ? "text-ink-soft" : "text-ink"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
