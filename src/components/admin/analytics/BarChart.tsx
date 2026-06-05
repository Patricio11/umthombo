import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A lightweight, on-brand bar chart (no charting dependency). */
export function BarChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  // Show a label roughly every ~6 bars so dense daily charts stay readable.
  const step = Math.max(1, Math.ceil(data.length / 8));

  if (data.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-ink-soft">
        Nothing to chart yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-44 items-end gap-1">
        {data.map((d, i) => {
          const h = d.value > 0 ? Math.max(3, (d.value / max) * 100) : 0;
          return (
            <div
              key={i}
              className="group relative flex flex-1 items-end"
              style={{ height: "100%" }}
              title={`${d.label} · ${formatZAR(d.value)}`}
            >
              <div
                className={cn(
                  "w-full rounded-t-md transition-colors",
                  d.value > 0 ? "bg-olive/80 group-hover:bg-olive" : "bg-cream-3"
                )}
                style={{ height: d.value > 0 ? `${h}%` : "2px" }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 truncate text-center text-[10px] text-ink-soft"
          >
            {i % step === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
