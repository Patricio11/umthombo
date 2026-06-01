import { site } from "@/data/site";
import { formatZAR } from "@/lib/format";
import type { CartItem } from "@/store/cart";

export interface OrderDetails {
  name: string;
  email: string;
  phone: string;
  method: "delivery" | "collection";
  note?: string;
  ownContainer: boolean;
}

/** Build a warm, pre-filled WhatsApp order summary and return the deep link. */
export function buildWhatsAppOrder(
  items: CartItem[],
  details: OrderDetails
): string {
  const subtotal = items.reduce((n, i) => n + i.qty * i.unitPriceZAR, 0);
  const total = details.ownContainer ? Math.round(subtotal * 0.9) : subtotal;

  const lines: string[] = [];
  lines.push("Hi Umthombo Creations 🌱 I'd love to order:");
  lines.push("");

  for (const i of items) {
    const variant = i.variant ? ` (${i.variant})` : "";
    lines.push(
      `• ${i.qty} × ${i.name}${variant} — ${formatZAR(i.unitPriceZAR * i.qty)}`
    );
  }

  lines.push("");
  if (details.ownContainer) {
    lines.push(`Subtotal: ${formatZAR(subtotal)}`);
    lines.push(`Bringing my own container — 10% off applied`);
  }
  lines.push(`Total: ${formatZAR(total)}`);
  lines.push("");
  lines.push(`Name: ${details.name}`);
  lines.push(`Email: ${details.email}`);
  lines.push(`Phone: ${details.phone}`);
  lines.push(
    `Preference: ${
      details.method === "collection"
        ? "Collection in Observatory"
        : "Nationwide delivery"
    }`
  );
  if (details.note?.trim()) {
    lines.push(`Note: ${details.note.trim()}`);
  }

  const text = encodeURIComponent(lines.join("\n"));
  return `${site.whatsapp.href}?text=${text}`;
}
