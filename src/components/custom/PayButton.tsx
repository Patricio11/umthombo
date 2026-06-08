"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { startCustomPayment } from "@/server/actions/custom-requests";
import { Button } from "@/components/ui/Button";

export function PayButton({
  token,
  kind,
  label,
}: {
  token: string;
  kind: "deposit" | "balance";
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    const res = await startCustomPayment(token, kind);
    if (res.ok && res.redirectUrl) {
      window.location.href = res.redirectUrl;
      return;
    }
    setLoading(false);
    setError(res.error ?? "Couldn’t start payment. Please try again.");
  };

  return (
    <div className="mt-4">
      <Button size="lg" className="w-full" onClick={onClick} disabled={loading}>
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? "Taking you to payment…" : label}
      </Button>
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
    </div>
  );
}
