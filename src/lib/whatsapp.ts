import { formatZAR } from "@/lib/format";
import type { CartItem } from "@/store/cart";

export interface OrderDetails {
  name: string;
  email: string;
  phone: string;
  method: "delivery" | "collection";
  note?: string;
  ownContainer: boolean;
  address?: string;
  deliveryFee?: number;
}

/** Build a warm, pre-filled WhatsApp order summary and return the deep link. */
export function buildWhatsAppOrder(
  items: CartItem[],
  details: OrderDetails,
  whatsappHref: string
): string {
  const subtotal = items.reduce((n, i) => n + i.qty * i.unitPriceZAR, 0);
  const goods = details.ownContainer ? Math.round(subtotal * 0.9) : subtotal;
  const deliveryFee = details.method === "delivery" ? details.deliveryFee ?? 0 : 0;
  const total = goods + deliveryFee;

  const lines: string[] = [];
  lines.push("Hi Umthombo Creations 🌱 I'd love to order:");
  lines.push("");

  for (const i of items) {
    const variant = i.variant ? ` (${i.variant})` : "";
    lines.push(
      `• ${i.qty} × ${i.name}${variant}  ${formatZAR(i.unitPriceZAR * i.qty)}`
    );
  }

  lines.push("");
  lines.push(`Subtotal: ${formatZAR(subtotal)}`);
  if (details.ownContainer) {
    lines.push(`Own container — 10% off applied`);
  }
  if (deliveryFee > 0) {
    lines.push(`Delivery: ${formatZAR(deliveryFee)}`);
  } else if (details.method === "delivery") {
    lines.push(`Delivery: to be confirmed`);
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
  if (details.method === "delivery" && details.address?.trim()) {
    lines.push(`Address: ${details.address.trim()}`);
  }
  if (details.note?.trim()) {
    lines.push(`Note: ${details.note.trim()}`);
  }

  const text = encodeURIComponent(lines.join("\n"));
  return `${whatsappHref}?text=${text}`;
}
