import { CUSTOM_REQUEST_STATUS_LABEL } from "@/lib/custom-request-schema";
import { cn } from "@/lib/utils";

const STYLE: Record<string, string> = {
  pending: "bg-taupe/20 text-taupe",
  quoted: "bg-mist/25 text-ink",
  in_progress: "bg-olive/15 text-olive",
  ready: "bg-olive/15 text-olive",
  completed: "bg-olive/20 text-olive",
  declined: "bg-clay/12 text-clay",
  cancelled: "bg-cream-2 text-ink-soft",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        STYLE[status] ?? "bg-cream-2 text-ink-soft"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {CUSTOM_REQUEST_STATUS_LABEL[status] ?? status}
    </span>
  );
}
