import "server-only";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems } from "@/server/db/schema";

export const PERIODS = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-30", label: "Last 30 days" },
  { key: "this-year", label: "This year" },
  { key: "all", label: "All time" },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];

export function isPeriodKey(v: string | undefined): v is PeriodKey {
  return !!v && PERIODS.some((p) => p.key === v);
}

interface Range {
  start: Date;
  end: Date;
  granularity: "day" | "month";
}

function periodRange(key: PeriodKey): Range {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "this-month":
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1), granularity: "day" };
    case "last-month":
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1), granularity: "day" };
    case "last-30": {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start, end, granularity: "day" };
    }
    case "this-year":
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1), granularity: "month" };
    case "all":
    default:
      return { start: new Date(2020, 0, 1), end: new Date(y + 1, 0, 1), granularity: "month" };
  }
}

export interface Analytics {
  periodLabel: string;
  revenue: number; // completed orders' total
  deliveryRevenue: number;
  completedCount: number;
  ordersPlaced: number;
  itemsSold: number;
  avgOrder: number;
  conversion: number; // completed / placed (0..1)
  statusBreakdown: { status: string; count: number }[];
  methodSplit: { delivery: number; collection: number };
  series: { label: string; value: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getAnalytics(key: PeriodKey): Promise<Analytics> {
  const { start, end, granularity } = periodRange(key);
  const label = PERIODS.find((p) => p.key === key)!.label;
  const inPeriod = and(gte(orders.createdAt, start), lt(orders.createdAt, end));
  const completedInPeriod = and(eq(orders.status, "completed"), inPeriod);

  const [completed, statusRows, [itemsRow], topProducts] = await Promise.all([
    db
      .select({
        totalZAR: orders.totalZAR,
        deliveryFeeZAR: orders.deliveryFeeZAR,
        createdAt: orders.createdAt,
        method: orders.method,
      })
      .from(orders)
      .where(completedInPeriod)
      .orderBy(asc(orders.createdAt)),
    db
      .select({ status: orders.status, count: sql<number>`count(*)::int` })
      .from(orders)
      .where(inPeriod)
      .groupBy(orders.status),
    db
      .select({ n: sql<number>`coalesce(sum(${orderItems.qty}), 0)::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(completedInPeriod),
    db
      .select({
        name: orderItems.name,
        qty: sql<number>`sum(${orderItems.qty})::int`,
        revenue: sql<number>`sum(${orderItems.lineTotalZAR})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(completedInPeriod)
      .groupBy(orderItems.name)
      .orderBy(desc(sql`sum(${orderItems.qty})`))
      .limit(8),
  ]);

  const revenue = completed.reduce((n, o) => n + o.totalZAR, 0);
  const deliveryRevenue = completed.reduce((n, o) => n + o.deliveryFeeZAR, 0);
  const completedCount = completed.length;
  const ordersPlaced = statusRows.reduce((n, r) => n + r.count, 0);
  const methodSplit = {
    delivery: completed.filter((o) => o.method === "delivery").length,
    collection: completed.filter((o) => o.method === "collection").length,
  };

  // Time series of completed revenue, bucketed by day or month.
  const buckets = new Map<string, { label: string; value: number; sort: number }>();
  if (granularity === "day") {
    for (
      let d = new Date(start);
      d < end && d <= new Date();
      d.setDate(d.getDate() + 1)
    ) {
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      buckets.set(k, { label: String(d.getDate()), value: 0, sort: d.getTime() });
    }
    for (const o of completed) {
      const d = new Date(o.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const b = buckets.get(k);
      if (b) b.value += o.totalZAR;
    }
  } else {
    const firstYear = start.getFullYear();
    for (
      let d = new Date(start);
      d < end;
      d.setMonth(d.getMonth() + 1)
    ) {
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const lbl =
        key === "all" ? `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` : monthNames[d.getMonth()];
      buckets.set(k, { label: lbl, value: 0, sort: d.getTime() });
    }
    for (const o of completed) {
      const d = new Date(o.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.get(k);
      if (b) b.value += o.totalZAR;
    }
    void firstYear;
  }
  const series = [...buckets.values()]
    .sort((a, b) => a.sort - b.sort)
    .map(({ label, value }) => ({ label, value }));

  return {
    periodLabel: label,
    revenue,
    deliveryRevenue,
    completedCount,
    ordersPlaced,
    itemsSold: itemsRow.n,
    avgOrder: completedCount ? Math.round(revenue / completedCount) : 0,
    conversion: ordersPlaced ? completedCount / ordersPlaced : 0,
    statusBreakdown: statusRows,
    methodSplit,
    series,
    topProducts,
  };
}
