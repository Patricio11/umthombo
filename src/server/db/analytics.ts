import "server-only";
import { and, asc, desc, eq, gte, lt, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems } from "@/server/db/schema";

export const PERIODS = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-30", label: "Last 30 days" },
  { key: "this-year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];
export type Scope = "completed" | "pipeline" | "paid";

export function isPeriodKey(v: string | undefined): v is PeriodKey {
  return !!v && PERIODS.some((p) => p.key === v);
}

export interface DateRange {
  start: Date;
  end: Date;
  granularity: "day" | "month";
  label: string;
}

const shortDate = (d: Date) =>
  new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(d);

/** Resolve the selected period (incl. a custom from/to) into a date range. */
export function resolveRange(
  key: PeriodKey,
  from?: string,
  to?: string
): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (key === "custom") {
    const s = from ? new Date(from) : null;
    const e = to ? new Date(to) : null;
    if (s && e && !isNaN(s.getTime()) && !isNaN(e.getTime()) && s <= e) {
      s.setHours(0, 0, 0, 0);
      const end = new Date(e);
      end.setHours(23, 59, 59, 999);
      const spanDays = (end.getTime() - s.getTime()) / 86_400_000;
      return {
        start: s,
        end,
        granularity: spanDays > 62 ? "month" : "day",
        label: `${shortDate(s)} – ${shortDate(e)}`,
      };
    }
    // invalid custom range → fall back to this month
  }

  switch (key) {
    case "last-month":
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1), granularity: "day", label: "Last month" };
    case "last-30": {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start, end, granularity: "day", label: "Last 30 days" };
    }
    case "this-year":
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1), granularity: "month", label: "This year" };
    case "all":
      return { start: new Date(2020, 0, 1), end: new Date(y + 1, 0, 1), granularity: "month", label: "All time" };
    case "this-month":
    case "custom":
    default:
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1), granularity: "day", label: "This month" };
  }
}

/** WHERE for orders counted as "made":
 *  - `paid`: payment confirmed (real revenue)
 *  - `pipeline`: everything except cancelled
 *  - `completed`: fulfilled orders only */
export function scopeCondition(scope: Scope): SQL {
  if (scope === "paid") return eq(orders.paymentStatus, "paid");
  if (scope === "pipeline") return ne(orders.status, "cancelled");
  return eq(orders.status, "completed");
}

export interface Analytics {
  range: DateRange;
  scope: Scope;
  revenue: number;
  deliveryRevenue: number;
  scopedCount: number; // completed (or active) orders
  ordersPlaced: number;
  itemsSold: number;
  avgOrder: number;
  conversion: number;
  statusBreakdown: { status: string; count: number }[];
  methodSplit: { delivery: number; collection: number };
  series: { label: string; value: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getAnalytics(opts: {
  period: PeriodKey;
  from?: string;
  to?: string;
  scope: Scope;
}): Promise<Analytics> {
  const range = resolveRange(opts.period, opts.from, opts.to);
  const { start, end, granularity } = range;
  const inPeriod = and(gte(orders.createdAt, start), lt(orders.createdAt, end));
  const scoped = and(scopeCondition(opts.scope), inPeriod);

  const [rows, statusRows, [itemsRow], topProducts] = await Promise.all([
    db
      .select({
        totalZAR: orders.totalZAR,
        deliveryFeeZAR: orders.deliveryFeeZAR,
        createdAt: orders.createdAt,
        method: orders.method,
      })
      .from(orders)
      .where(scoped)
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
      .where(scoped),
    db
      .select({
        name: orderItems.name,
        qty: sql<number>`sum(${orderItems.qty})::int`,
        revenue: sql<number>`sum(${orderItems.lineTotalZAR})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(scoped)
      .groupBy(orderItems.name)
      .orderBy(desc(sql`sum(${orderItems.qty})`))
      .limit(8),
  ]);

  const revenue = rows.reduce((n, o) => n + o.totalZAR, 0);
  const deliveryRevenue = rows.reduce((n, o) => n + o.deliveryFeeZAR, 0);
  const scopedCount = rows.length;
  const ordersPlaced = statusRows.reduce((n, r) => n + r.count, 0);
  const methodSplit = {
    delivery: rows.filter((o) => o.method === "delivery").length,
    collection: rows.filter((o) => o.method === "collection").length,
  };

  const buckets = new Map<string, { label: string; value: number; sort: number }>();
  const keyOf = (d: Date) =>
    granularity === "day"
      ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      : `${d.getFullYear()}-${d.getMonth()}`;
  const today = new Date();
  if (granularity === "day") {
    for (let d = new Date(start); d < end && d <= today; d.setDate(d.getDate() + 1)) {
      buckets.set(keyOf(d), { label: String(d.getDate()), value: 0, sort: d.getTime() });
    }
  } else {
    for (let d = new Date(start); d < end; d.setMonth(d.getMonth() + 1)) {
      const lbl =
        opts.period === "all" || range.label.includes("–")
          ? `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
          : monthNames[d.getMonth()];
      buckets.set(keyOf(d), { label: lbl, value: 0, sort: d.getTime() });
    }
  }
  for (const o of rows) {
    const b = buckets.get(keyOf(new Date(o.createdAt)));
    if (b) b.value += o.totalZAR;
  }
  const series = [...buckets.values()]
    .sort((a, b) => a.sort - b.sort)
    .map(({ label, value }) => ({ label, value }));

  return {
    range,
    scope: opts.scope,
    revenue,
    deliveryRevenue,
    scopedCount,
    ordersPlaced,
    itemsSold: itemsRow.n,
    avgOrder: scopedCount ? Math.round(revenue / scopedCount) : 0,
    conversion: ordersPlaced ? scopedCount / ordersPlaced : 0,
    statusBreakdown: statusRows,
    methodSplit,
    series,
    topProducts,
  };
}

/** Flat order rows for CSV export. */
export async function getOrdersForExport(
  period: PeriodKey,
  scope: Scope,
  from?: string,
  to?: string
) {
  const { start, end } = resolveRange(period, from, to);
  return db
    .select({
      orderNumber: orders.orderNumber,
      createdAt: orders.createdAt,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      method: orders.method,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentProvider: orders.paymentProvider,
      shippingService: orders.shippingService,
      trackingReference: orders.trackingReference,
      itemCount: sql<number>`count(${orderItems.id})::int`,
      subtotalZAR: orders.subtotalZAR,
      deliveryFeeZAR: orders.deliveryFeeZAR,
      totalZAR: orders.totalZAR,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end), scopeCondition(scope)))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt));
}
