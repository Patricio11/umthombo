"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Ticket, Sparkles, X } from "lucide-react";
import type { AdminPromotionRow } from "@/server/db/promotions";
import type { PromotionType } from "@/lib/promotions";
import { describePromotion } from "@/lib/promotions";
import {
  Card,
  Field,
  Input,
  Select,
  Switch,
  EmptyState,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import {
  createPromotion,
  updatePromotion,
  setPromotionEnabled,
  deletePromotion,
} from "@/server/actions/discounts";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { value: "percent", label: "% off the order" },
  { value: "fixed", label: "Rand off the order" },
  { value: "free_shipping", label: "Free delivery" },
];

const dateInput = (d: Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

interface Draft {
  id?: string;
  name: string;
  code: string;
  type: PromotionType;
  value: string;
  minSubtotalZAR: string;
  freeShippingCapZAR: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  stackable: boolean;
  enabled: boolean;
}

const blank: Draft = {
  name: "",
  code: "",
  type: "free_shipping",
  value: "",
  minSubtotalZAR: "",
  freeShippingCapZAR: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  stackable: false,
  enabled: true,
};

const toDraft = (p: AdminPromotionRow): Draft => ({
  id: p.id,
  name: p.name,
  code: p.code ?? "",
  type: p.type,
  value: p.value ? String(p.value) : "",
  minSubtotalZAR: p.minSubtotalZAR != null ? String(p.minSubtotalZAR) : "",
  freeShippingCapZAR:
    p.freeShippingCapZAR != null ? String(p.freeShippingCapZAR) : "",
  startsAt: dateInput(p.startsAt),
  endsAt: dateInput(p.endsAt),
  usageLimit: p.usageLimit != null ? String(p.usageLimit) : "",
  stackable: p.stackable,
  enabled: p.enabled,
});

export function PromotionsManager({
  promotions,
}: {
  promotions: AdminPromotionRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const onSave = () => {
    if (!draft) return;
    start(async () => {
      const payload = {
        name: draft.name,
        code: draft.code || undefined,
        type: draft.type,
        value: draft.value || 0,
        minSubtotalZAR: draft.minSubtotalZAR || null,
        freeShippingCapZAR: draft.freeShippingCapZAR || null,
        startsAt: draft.startsAt || null,
        endsAt: draft.endsAt || null,
        usageLimit: draft.usageLimit || null,
        stackable: draft.stackable,
        enabled: draft.enabled,
      };
      const res = draft.id
        ? await updatePromotion(draft.id, payload)
        : await createPromotion(payload);
      if (res.ok) {
        toast.success(draft.id ? "Promotion saved." : "Promotion created.");
        setDraft(null);
        router.refresh();
      } else {
        toast.error(res.error ?? "Couldn’t save.");
      }
    });
  };

  const onToggle = (p: AdminPromotionRow) =>
    start(async () => {
      await setPromotionEnabled(p.id, !p.enabled);
      router.refresh();
    });

  const onDelete = async (p: AdminPromotionRow) => {
    const yes = await confirm({
      title: `Delete “${p.name}”?`,
      description:
        "It stops applying immediately. Orders that already used it keep their record.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await deletePromotion(p.id);
      if (res.ok) toast.success("Promotion deleted.");
      else toast.error(res.error ?? "Couldn’t delete.");
      router.refresh();
    });
  };

  /* ---------------------------------------------------------------- */
  /*  Editor                                                          */
  /* ---------------------------------------------------------------- */
  if (draft) {
    const isFree = draft.type === "free_shipping";
    const preview = describePromotion({
      id: "",
      name: draft.name,
      code: draft.code ? draft.code.toUpperCase() : null,
      type: draft.type,
      value: Number(draft.value) || 0,
      minSubtotalZAR: draft.minSubtotalZAR ? Number(draft.minSubtotalZAR) : null,
      freeShippingCapZAR: draft.freeShippingCapZAR
        ? Number(draft.freeShippingCapZAR)
        : null,
      startsAt: null,
      endsAt: null,
      usageLimit: null,
      stackable: draft.stackable,
      enabled: draft.enabled,
    });

    return (
      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg">
              {draft.id ? "Edit promotion" : "New promotion"}
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Leave the code blank and it applies automatically — no code to type.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraft(null)}
            aria-label="Close"
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" required hint="Customers see this on their order">
            <Input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Free delivery over R350"
            />
          </Field>
          <Field
            label="Code"
            hint="Blank = applies automatically to every qualifying order"
          >
            <Input
              value={draft.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="No code needed"
              className="font-mono uppercase"
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type" required>
            <Select
              value={draft.type}
              onChange={(v) => set("type", v as PromotionType)}
              options={TYPE_OPTIONS}
            />
          </Field>
          {!isFree && (
            <Field
              label={draft.type === "percent" ? "Percent off" : "Amount off (R)"}
              required
            >
              <Input
                inputMode="numeric"
                value={draft.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder={draft.type === "percent" ? "10" : "50"}
              />
            </Field>
          )}
          {isFree && (
            <Field
              label="Most you'll absorb (R)"
              hint="Blank = the whole courier fee, whatever it is"
            >
              <Input
                inputMode="numeric"
                value={draft.freeShippingCapZAR}
                onChange={(e) => set("freeShippingCapZAR", e.target.value)}
                placeholder="No cap"
              />
            </Field>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Minimum spend (R)" hint="Blank = no minimum">
            <Input
              inputMode="numeric"
              value={draft.minSubtotalZAR}
              onChange={(e) => set("minSubtotalZAR", e.target.value)}
              placeholder="Any order"
            />
          </Field>
          <Field label="Starts" hint="Blank = right away">
            <Input
              type="date"
              value={draft.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
            />
          </Field>
          <Field label="Ends" hint="Blank = never expires">
            <Input
              type="date"
              value={draft.endsAt}
              onChange={(e) => set("endsAt", e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Usage limit"
          hint="Total times it can be used, across everyone. Blank = unlimited — worth setting on anything generous, codes get shared."
        >
          <Input
            inputMode="numeric"
            value={draft.usageLimit}
            onChange={(e) => set("usageLimit", e.target.value)}
            placeholder="Unlimited"
            className="sm:max-w-[12rem]"
          />
        </Field>

        <label className="flex items-center justify-between gap-3 border-t border-cream-2 pt-4">
          <span className="text-sm font-medium">
            Can combine with the bring-back discount
            <span className="mt-0.5 block text-xs font-normal text-ink-soft">
              Off = the customer gets whichever saves them more, never both
            </span>
          </span>
          <Switch
            checked={draft.stackable}
            onChange={(v) => set("stackable", v)}
            label="Stackable"
          />
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Active</span>
          <Switch
            checked={draft.enabled}
            onChange={(v) => set("enabled", v)}
            label="Active"
          />
        </label>

        {draft.name && (
          <p className="rounded-xl bg-olive/10 px-4 py-2.5 text-xs text-olive">
            {preview}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="button" onClick={onSave} disabled={pending || !draft.name}>
            {pending && <Loader2 size={16} className="animate-spin" />}
            {draft.id ? "Save changes" : "Create promotion"}
          </Button>
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="text-sm text-ink-soft transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  List                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Coupons & offers</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Codes customers type, or rules that apply themselves.
          </p>
        </div>
        <Button size="sm" type="button" onClick={() => setDraft({ ...blank })}>
          <Plus size={16} /> New promotion
        </Button>
      </div>

      {promotions.length === 0 ? (
        <EmptyState
          icon={<Ticket size={28} />}
          title="No promotions yet"
          description="Create a code, or a rule like free delivery over a certain spend that applies on its own."
          action={
            <Button size="sm" type="button" onClick={() => setDraft({ ...blank })}>
              New promotion
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-cream-2 rounded-xl border border-cream-3">
          {promotions.map((p) => {
            const used = p.usageCount;
            const limit = p.usageLimit;
            const exhausted = limit != null && used >= limit;
            const expired = !!p.endsAt && new Date(p.endsAt) < new Date();
            const live = p.enabled && !exhausted && !expired;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 px-3 py-3"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    live ? "bg-olive/10 text-olive" : "bg-cream-2 text-taupe"
                  )}
                >
                  {p.code ? <Ticket size={16} /> : <Sparkles size={16} />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {p.name}
                    {p.code ? (
                      <code className="ml-2 rounded bg-cream-2 px-1.5 py-0.5 font-mono text-xs">
                        {p.code}
                      </code>
                    ) : (
                      <span className="ml-2 text-xs font-normal text-taupe">
                        automatic
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {describePromotion(p)}{" "}
                    {p.endsAt && `Ends ${formatDate(p.endsAt)}.`}
                  </p>
                </div>

                <div className="shrink-0 text-right text-xs">
                  <p className={cn(exhausted ? "text-clay" : "text-ink-soft")}>
                    {used}
                    {limit != null ? ` / ${limit}` : ""} used
                  </p>
                  {expired && <p className="text-clay">Expired</p>}
                  {p.stackable && <p className="text-taupe">Stacks</p>}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Switch
                    checked={p.enabled}
                    onChange={() => onToggle(p)}
                    label={`${p.enabled ? "Disable" : "Enable"} ${p.name}`}
                  />
                  <button
                    type="button"
                    aria-label={`Edit ${p.name}`}
                    onClick={() => setDraft(toDraft(p))}
                    className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => onDelete(p)}
                    className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
