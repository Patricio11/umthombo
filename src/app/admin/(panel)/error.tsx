"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-clay/10 text-clay">
        <AlertTriangle size={22} />
      </div>
      <h1 className="font-display text-2xl">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        That screen hit a snag. Try again  if it keeps happening, check the
        server logs.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
