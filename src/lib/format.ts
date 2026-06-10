const zar = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** R75  South African Rand, no decimals (prices are whole numbers). */
export function formatZAR(n: number): string {
  return zar.format(n).replace(/ /g, " "); // tidy the space after R
}

const dateFmt = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "10 June 2026" — long, human date. Accepts a Date or ISO string. */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "" : dateFmt.format(date);
}
