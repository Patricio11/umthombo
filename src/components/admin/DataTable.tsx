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
 * Responsive data table: a real table on ≥sm, stacked label/value cards on
 * mobile. Cells can contain interactive elements (passed from a client page).
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  empty?: ReactNode;
}) {
  const cols = columns.filter((c) => !c.hidden);

  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-cream-3 sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-cream-3 bg-cream-2/60">
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
                className="border-b border-cream-2 transition-colors last:border-0 hover:bg-cream-2/40"
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
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <div
            key={getKey(row)}
            className="rounded-2xl border border-cream-3 bg-cream p-4"
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
  );
}
