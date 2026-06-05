"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import type { Scope } from "@/server/db/analytics";
import { cn } from "@/lib/utils";

export function CustomRange({
  from,
  to,
  scope,
}: {
  from?: string;
  to?: string;
  scope: Scope;
}) {
  const router = useRouter();
  const [f, setF] = useState(from ?? "");
  const [t, setT] = useState(to ?? "");

  const apply = () => {
    if (!f || !t) return;
    const p = new URLSearchParams({ period: "custom", from: f, to: t, scope });
    router.push(`/admin/analytics?${p.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-cream-3 bg-cream p-4">
      <label className="text-sm">
        <span className="mb-1.5 block font-medium text-ink">From</span>
        <input
          type="date"
          value={f}
          max={t || undefined}
          onChange={(e) => setF(e.target.value)}
          className={cn(inputClass, "w-auto")}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1.5 block font-medium text-ink">To</span>
        <input
          type="date"
          value={t}
          min={f || undefined}
          onChange={(e) => setT(e.target.value)}
          className={cn(inputClass, "w-auto")}
        />
      </label>
      <Button type="button" onClick={apply} disabled={!f || !t} size="sm">
        Apply
      </Button>
    </div>
  );
}
