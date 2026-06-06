import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Hide this column in the desktop table + omit from mobile cards. */
  hidden?: boolean;
  /** Don't show the label in the mobile card (e.g. the primary cell). */
  primary?: boolean;
  className?: string;
  align?: "left" | "right";
}

/**
 * Responsive data section: a single white panel (like the dashboard cards)
 * holding an optional toolbar (filters/search) above the data  a real table
 * on ≥sm, stacked rows on mobile. Cells may contain interactive elements.
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  empty,
  onRowClick,
  toolbar,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
}) {
  const cols = columns.filter((c) => !c.hidden);

  return (
    <div className="overflow-hidden rounded-2xl border border-cream-3 bg-cream">
      {toolbar && (
        <div className="border-b border-cream-3 px-3 py-3 sm:px-4">{toolbar}</div>
      )}

      {rows.length === 0 ? (
        <div className="px-4 py-6">{empty}</div>
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden w-full border-collapse text-sm sm:table">
            <thead>
              <tr className="border-b border-cream-3 bg-cream-2/40">
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft",
                      c.align === "right" ? "text-right" : "text-left",
                      c.className
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={getKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-cream-2 transition-colors last:border-0 hover:bg-cream-2/40",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-3 align-middle",
                        c.align === "right" ? "text-right" : "text-left",
                        c.className
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: divided rows within the same panel */}
          <div className="divide-y divide-cream-2 sm:hidden">
            {rows.map((row) => (
              <div
                key={getKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("px-4 py-4", onRowClick && "cursor-pointer")}
              >
                {cols.map((c) =>
                  c.primary ? (
                    <div key={c.key} className="mb-2">
                      {c.cell(row)}
                    </div>
                  ) : (
                    <div
                      key={c.key}
                      className="flex items-center justify-between gap-3 py-1 text-sm"
                    >
                      <span className="text-xs uppercase tracking-wide text-ink-soft">
                        {c.header}
                      </span>
                      <span className="text-right">{c.cell(row)}</span>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
