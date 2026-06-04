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
