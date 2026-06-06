"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Star, Check } from "lucide-react";
import { ZA_PROVINCES } from "@/lib/integrations";
import type { AddressView } from "@/lib/address-schema";
import { authInputCls } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setPrimaryAddress,
} from "@/server/actions/addresses";

const provinceName = (code: string) =>
  ZA_PROVINCES.find((p) => p.code === code.toUpperCase())?.name ?? code;

function formatLines(a: AddressView): string {
  return [a.company, a.streetAddress, a.localArea, a.city, provinceName(a.zone), a.code]
    .filter(Boolean)
    .join(", ");
}

type Mode = { kind: "list" } | { kind: "new" } | { kind: "edit"; a: AddressView };

export function AddressManager({ addresses }: { addresses: AddressView[] }) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  if (mode.kind !== "list") {
    return (
      <AddressForm
        initial={mode.kind === "edit" ? mode.a : undefined}
        canSetPrimary={addresses.length === 0 || mode.kind === "new"}
        onDone={() => setMode({ kind: "list" })}
      />
    );
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-3 bg-cream px-6 py-12 text-center">
          <p className="font-medium text-ink">No saved addresses yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add one to check out faster next time.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              a={a}
              onEdit={() => setMode({ kind: "edit", a })}
            />
          ))}
        </div>
      )}

      <Button onClick={() => setMode({ kind: "new" })}>
        <Plus size={16} /> Add address
      </Button>
    </div>
  );
}

function AddressCard({ a, onEdit }: { a: AddressView; onEdit: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean }>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="flex flex-col rounded-2xl border border-cream-3 bg-cream p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-ink">
            {a.label || "Address"}
            {a.isPrimary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-olive/15 px-2 py-0.5 text-[11px] font-medium text-olive">
                <Star size={10} fill="currentColor" /> Primary
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-ink">{a.recipientName}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{formatLines(a)}</p>
          {a.phone && <p className="text-sm text-ink-soft">{a.phone}</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-cream-2 pt-3">
        {!a.isPrimary && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setPrimaryAddress(a.id))}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-2 hover:text-olive"
          >
            <Star size={13} /> Make primary
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink"
        >
          <Pencil size={13} /> Edit
        </button>
        {confirming ? (
          <span className="inline-flex items-center gap-1 text-xs text-clay">
            Delete?
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteAddress(a.id))}
              className="rounded-full px-2 py-1 font-medium hover:bg-clay/10"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full px-2 py-1 text-ink-soft hover:bg-cream-2"
            >
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay"
          >
            <Trash2 size={13} /> Delete
          </button>
        )}
        {pending && <Loader2 size={14} className="animate-spin text-ink-soft" />}
      </div>
    </div>
  );
}

function AddressForm({
  initial,
  canSetPrimary,
  onDone,
}: {
  initial?: AddressView;
  canSetPrimary: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    label: initial?.label ?? "",
    recipientName: initial?.recipientName ?? "",
    phone: initial?.phone ?? "",
    company: initial?.company ?? "",
    streetAddress: initial?.streetAddress ?? "",
    localArea: initial?.localArea ?? "",
    city: initial?.city ?? "",
    zone: initial?.zone ?? "",
    code: initial?.code ?? "",
  });
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary ?? false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const payload = { ...f, country: "ZA", isPrimary };
      const res = initial
        ? await updateAddress(initial.id, payload)
        : await createAddress(payload);
      if (res.ok) {
        router.refresh();
        onDone();
      } else {
        setError(res.error ?? "Couldn’t save the address.");
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-lg space-y-4 rounded-2xl border border-cream-3 bg-cream p-6"
    >
      <h2 className="font-display text-xl">
        {initial ? "Edit address" : "Add an address"}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label (optional)">
          <input value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="Home" className={authInputCls} />
        </Field>
        <Field label="Recipient name">
          <input value={f.recipientName} onChange={(e) => set("recipientName", e.target.value)} className={authInputCls} required />
        </Field>
      </div>
      <Field label="Phone (optional)">
        <input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+27 or 0…" className={authInputCls} />
      </Field>
      <Field label="Company (optional)">
        <input value={f.company} onChange={(e) => set("company", e.target.value)} className={authInputCls} />
      </Field>
      <Field label="Street address">
        <input value={f.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} placeholder="12 Main Road" className={authInputCls} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Suburb / area">
          <input value={f.localArea} onChange={(e) => set("localArea", e.target.value)} className={authInputCls} />
        </Field>
        <Field label="City">
          <input value={f.city} onChange={(e) => set("city", e.target.value)} className={authInputCls} required />
        </Field>
        <Field label="Province">
          <Select
            value={f.zone}
            onChange={(v) => set("zone", v)}
            options={ZA_PROVINCES.map((p) => ({ value: p.code, label: p.name }))}
            placeholder="Choose…"
          />
        </Field>
        <Field label="Postal code">
          <input value={f.code} onChange={(e) => set("code", e.target.value)} inputMode="numeric" className={authInputCls} required />
        </Field>
      </div>

      {canSetPrimary && (
        <label className="flex items-center gap-2.5 text-sm text-ink-soft">
          <Checkbox checked={isPrimary} onChange={setIsPrimary} />
          <span>Set as my primary address</span>
        </label>
      )}

      {error && (
        <p className="rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Save address
        </Button>
        <button type="button" onClick={onDone} className="text-sm text-ink-soft transition-colors hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
