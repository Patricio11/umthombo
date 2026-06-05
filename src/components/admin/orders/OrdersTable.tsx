"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import type { AdminOrderRow } from "@/server/db/admin-queries";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-schema";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState, StatusBadge } from "@/components/admin/primitives";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(d));

export function OrdersTable({ orders }: { orders: AdminOrderRow[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<"all" | OrderStatus>("all");

  const rows = useMemo(
    () =>
      status === "all" ? orders : orders.filter((o) => o.status === status),
    [orders, status]
  );

  const columns: Column<AdminOrderRow>[] = [
    {
      key: "order",
      header: "Order",
      primary: true,
      cell: (o) => (
        <div>
          <p className="font-medium">{o.customerName}</p>
          <p className="text-xs text-ink-soft">
            {o.orderNumber} · {fmtDate(o.createdAt)}
          </p>
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      cell: (o) => <span className="capitalize text-ink-soft">{o.method}</span>,
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      cell: (o) => <span className="tabular-nums">{o.itemCount}</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (o) => <span className="tabular-nums">{formatZAR(o.totalZAR)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (o) => <StatusBadge status={o.status} />,
    },
  ];

  const toolbar = (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
      <div className="flex gap-1 rounded-full bg-cream-2 p-1">
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
              status === s ? "bg-cream text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getKey={(o) => o.id}
      onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
      toolbar={toolbar}
      empty={
        <EmptyState
          icon={<Inbox size={28} />}
          title={status === "all" ? "No orders yet" : "No orders here"}
          description={
            status === "all"
              ? "When customers place orders, they'll appear here."
              : "Try a different status filter."
          }
        />
      }
    />
  );
}
