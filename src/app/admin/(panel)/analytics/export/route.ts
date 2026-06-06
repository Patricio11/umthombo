import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/server/auth/guard";
import {
  getOrdersForExport,
  isPeriodKey,
  type Scope,
} from "@/server/db/analytics";

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-ZA", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(d)
  );

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const periodParam = sp.get("period") ?? undefined;
  const period = isPeriodKey(periodParam) ? periodParam : "this-month";
  const scopeParam = sp.get("scope");
  const scope: Scope =
    scopeParam === "pipeline"
      ? "pipeline"
      : scopeParam === "paid"
      ? "paid"
      : "completed";
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;

  const rows = await getOrdersForExport(period, scope, from, to);

  const header = [
    "Order",
    "Date",
    "Customer",
    "Email",
    "Phone",
    "Method",
    "Status",
    "Payment",
    "Payment via",
    "Courier",
    "Tracking",
    "Items",
    "Subtotal (ZAR)",
    "Delivery (ZAR)",
    "Total (ZAR)",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.orderNumber,
        fmtDate(r.createdAt),
        r.customerName,
        r.customerEmail,
        r.customerPhone,
        r.method,
        r.status,
        r.paymentStatus,
        r.paymentProvider ?? "",
        r.shippingService ?? "",
        r.trackingReference ?? "",
        r.itemCount,
        r.subtotalZAR,
        r.deliveryFeeZAR,
        r.totalZAR,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  const csv = "﻿" + lines.join("\r\n"); // BOM for Excel

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="umthombo-orders-${period}-${scope}.csv"`,
    },
  });
}
