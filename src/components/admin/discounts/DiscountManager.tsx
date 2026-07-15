"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Search, PackageCheck, Check } from "lucide-react";
import type { DiscountProductRow } from "@/server/db/discounts";
import type { DiscountRule, DiscountScope } from "@/lib/discount";
import { unitDiscountZAR } from "@/lib/discount";
import {
  Card,
  Field,
  Input,
  Select,
  Switch,
  inputClass,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { updateDiscountRule, setEligibleProducts } from "@/server/actions/discounts";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DiscountManager({
  rule,
  products,
}: {
  rule: DiscountRule;
  products: DiscountProductRow[];
}) {
  const toast = useToast();
  const [savingRule, startRule] = useTransition();
  const [savingPicks, startPicks] = useTransition();

  const [enabled, setEnabled] = useState(rule.enabled);
  const [percent, setPercent] = useState(String(rule.percent));
  const [scope, setScope] = useState<DiscountScope>(rule.scope);
  const [label, setLabel] = useState(rule.label);

  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(products.filter((p) => p.containerEligible).map((p) => p.id))
  );
  const [q, setQ] = useState("");

  const pct = Math.min(100, Math.max(1, Math.trunc(Number(percent) || 0)));

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.categoryLabel.toLowerCase().includes(needle)
    );
  }, [products, q]);

  const dirty = useMemo(() => {
    const original = new Set(
      products.filter((p) => p.containerEligible).map((p) => p.id)
    );
    if (original.size !== picked.size) return true;
    for (const id of picked) if (!original.has(id)) return true;
    return false;
  }, [products, picked]);

  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onSaveRule = () =>
    startRule(async () => {
      const res = await updateDiscountRule({ enabled, percent: pct, scope, label });
      if (res.ok) toast.success("Discount rule saved.");
      else toast.error(res.error ?? "Couldn’t save.");
    });

  const onSavePicks = () =>
    startPicks(async () => {
      const res = await setEligibleProducts([...picked]);
      if (res.ok) toast.success("Eligible products updated.");
      else toast.error(res.error ?? "Couldn’t save.");
    });

  const summary = enabled
    ? scope === "all"
      ? `Applies to all ${products.length} products at ${pct}%.`
      : `Applies to ${picked.size} of ${products.length} products at ${pct}%.`
    : "Turned off — no bring-back discount is offered.";

  return (
    <div className="space-y-6">
      {/* The rule */}
      <Card className="space-y-5">
        <div>
          <h2 className="font-display text-lg">The rule</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Customers get this off <strong>one unit&rsquo;s price for each
            container they bring back</strong> — never more than the quantity on
            that line, and only on the products you allow below.
          </p>
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">
            Offer the bring-back discount
            <span className="mt-0.5 block text-xs font-normal text-ink-soft">
              Off = no discount anywhere at checkout
            </span>
          </span>
          <Switch checked={enabled} onChange={setEnabled} label="Enabled" />
        </label>

        <Field
          label="What customers call it"
          htmlFor="label"
          hint={`Shown at checkout as “${label.trim() || "Own container"} · ${pct}% off”`}
        >
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            placeholder="Own container"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Discount" htmlFor="percent" hint="% off one unit, per container">
            <div className="relative">
              <Input
                id="percent"
                inputMode="numeric"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
                %
              </span>
            </div>
          </Field>
          <Field label="Applies to" htmlFor="scope" hint="Which products can earn it">
            <Select
              id="scope"
              value={scope}
              onChange={(v) => setScope(v as DiscountScope)}
              options={[
                { value: "selected", label: "Only selected products" },
                { value: "all", label: "All products" },
              ]}
            />
          </Field>
        </div>

        <p
          className={cn(
            "rounded-xl px-4 py-2.5 text-xs",
            enabled ? "bg-olive/10 text-olive" : "bg-cream-2 text-ink-soft"
          )}
        >
          {summary}
        </p>

        <Button type="button" onClick={onSaveRule} disabled={savingRule}>
          {savingRule && <Loader2 size={16} className="animate-spin" />}
          Save rule
        </Button>
      </Card>

      {/* Eligible products */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg">Eligible products</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Tick everything that comes in a jar, bottle or tub the customer can
              bring back. Leave bars, pillars and sculptural pieces unticked.
            </p>
          </div>
          <span className="rounded-full bg-cream-2 px-3 py-1 text-xs font-medium">
            {picked.size} selected
          </span>
        </div>

        {scope === "all" && (
          <p className="rounded-xl bg-clay/10 px-4 py-2.5 text-xs text-clay">
            Scope is set to <strong>All products</strong>, so every product earns
            the discount and these ticks are ignored. Switch to “Only selected
            products” to use this list.
          </p>
        )}

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className={cn(inputClass, "pl-9")}
          />
        </div>

        <ul className="max-h-[28rem] divide-y divide-cream-2 overflow-y-auto rounded-xl border border-cream-3">
          {rows.map((p) => {
            const on = picked.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    on ? "bg-olive/5" : "hover:bg-cream-2/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                      on ? "border-olive bg-olive text-cream" : "border-cream-3"
                    )}
                  >
                    {on && <Check size={13} />}
                  </span>
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-cream-2">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {p.name}
                      {p.status === "draft" && (
                        <span className="ml-1.5 text-xs font-normal text-taupe">
                          · draft
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                      {p.categoryLabel}
                      {p.size ? ` · ${p.size}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    <span className="block text-ink-soft">{formatZAR(p.priceZAR)}</span>
                    {on && (
                      <span className="block text-olive">
                        −{formatZAR(unitDiscountZAR(p.priceZAR, pct))}/jar
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ink-soft">
              No matching products.
            </li>
          )}
        </ul>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={onSavePicks} disabled={savingPicks || !dirty}>
            {savingPicks ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <PackageCheck size={16} />
            )}
            Save eligible products
          </Button>
          {dirty && <span className="text-xs text-clay">Unsaved changes</span>}
        </div>
      </Card>
    </div>
  );
}
