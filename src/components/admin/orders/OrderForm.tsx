"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { AdminOrderDetail, OrderableProduct } from "@/server/db/admin-queries";
import {
  Card,
  Field,
  Input,
  Textarea,
  Select,
  Switch,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/order-schema";
import { createOrderAdmin, updateOrderAdmin } from "@/server/actions/orders";
import { formatZAR } from "@/lib/format";
import {
  computeDiscount,
  discountLabel,
  isLineEligible,
  DEFAULT_DISCOUNT_RULE,
  type DiscountRule,
} from "@/lib/discount";

interface ItemRow {
  productId: string;
  variant: string;
  qty: number;
  containersReturned: number;
}

export function OrderForm({
  order,
  products,
  rule = DEFAULT_DISCOUNT_RULE,
}: {
  order?: AdminOrderDetail;
  products: OrderableProduct[];
  rule?: DiscountRule;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const [name, setName] = useState(order?.customerName ?? "");
  const [surname, setSurname] = useState(order?.customerSurname ?? "");
  const [email, setEmail] = useState(order?.customerEmail ?? "");
  const [phone, setPhone] = useState(order?.customerPhone ?? "");
  const [method, setMethod] = useState<"delivery" | "collection">(
    order?.method ?? "delivery"
  );
  const [note, setNote] = useState(order?.note ?? "");
  const [address, setAddress] = useState(order?.shippingAddress ?? "");
  const [shipping, setShipping] = useState(
    order?.deliveryFeeZAR ? String(order.deliveryFeeZAR) : ""
  );
  const [shippingService, setShippingService] = useState(
    order?.shippingService ?? ""
  );
  const [status, setStatus] = useState(order?.status ?? "new");
  const [paymentStatus, setPaymentStatus] = useState(
    order?.paymentStatus ?? "pending"
  );
  const [items, setItems] = useState<ItemRow[]>(
    order?.items.length
      ? order.items.map((i) => ({
          productId: i.productId ?? "",
          variant: i.variant ?? "",
          qty: i.qty,
          containersReturned: i.containersReturned ?? 0,
        }))
      : [{ productId: "", variant: "", qty: 1, containersReturned: 0 }]
  );

  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((arr) => arr.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  const subtotal = items.reduce((sum, it) => {
    const p = byId.get(it.productId);
    return sum + (p ? p.priceZAR * it.qty : 0);
  }, 0);
  const discount = computeDiscount(
    items
      .filter((it) => it.productId)
      .map((it) => {
        const p = byId.get(it.productId);
        return {
          unitPriceZAR: p?.priceZAR ?? 0,
          qty: it.qty,
          containerEligible: !!p?.containerEligible,
          containersReturned: it.containersReturned,
        };
      }),
    rule
  ).totalZAR;
  const goods = subtotal - discount;
  const deliveryFee =
    method === "delivery" ? Math.max(0, parseInt(shipping) || 0) : 0;
  const total = goods + deliveryFee;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = items.filter((it) => it.productId);
    if (cleaned.length === 0) {
      toast.error("Add at least one product.");
      return;
    }
    const input = {
      name,
      surname,
      email,
      phone,
      method,
      address: method === "delivery" ? address : "",
      note: note || undefined,
      status,
      paymentStatus,
      deliveryFeeZAR: deliveryFee,
      shippingService: method === "delivery" ? shippingService : "",
      items: cleaned.map((it) => ({
        productId: it.productId,
        variant: it.variant || null,
        qty: it.qty,
        containersReturned: it.containersReturned,
      })),
    };
    startTransition(async () => {
      const res = order
        ? await updateOrderAdmin(order.id, input)
        : await createOrderAdmin(input);
      if (res.ok) {
        toast.success(order ? "Order updated." : "Order created.");
        router.push(order ? `/admin/orders/${order.id}` : "/admin/orders");
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
      {/* Items */}
      <div className="space-y-6 lg:col-span-2">
        <Card className="space-y-4">
          <h2 className="font-display text-lg">Items</h2>
          {items.map((it, i) => {
            const p = byId.get(it.productId);
            return (
              <div
                key={i}
                className="flex flex-wrap items-end gap-3 rounded-xl border border-cream-2 p-3"
              >
                <Field label="Product" className="min-w-[180px] flex-1">
                  <Select
                    value={it.productId}
                    onChange={(v) => setItem(i, { productId: v, variant: "" })}
                    placeholder="Choose a product…"
                    options={products.map((pr) => ({
                      value: pr.id,
                      label: `${pr.name}  ${formatZAR(pr.priceZAR)}`,
                    }))}
                  />
                </Field>

                {p && p.variants.length > 0 && (
                  <Field label="Variant" className="min-w-[140px]">
                    <Select
                      value={it.variant}
                      onChange={(v) => setItem(i, { variant: v })}
                      placeholder="-"
                      options={p.variants.map((v) => ({ value: v, label: v }))}
                    />
                  </Field>
                )}

                <Field label="Qty" className="w-20">
                  <Input
                    inputMode="numeric"
                    value={String(it.qty)}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      setItem(i, {
                        qty,
                        // jars can never outlive the qty they belong to
                        containersReturned: Math.min(it.containersReturned, qty),
                      });
                    }}
                  />
                </Field>

                {p && isLineEligible(rule, p.containerEligible) && (
                  <Field
                    label="Jars back"
                    className="w-24"
                    hint={`${rule.percent}% × each`}
                  >
                    <Input
                      inputMode="numeric"
                      value={String(it.containersReturned)}
                      onChange={(e) =>
                        setItem(i, {
                          containersReturned: Math.min(
                            Math.max(0, parseInt(e.target.value) || 0),
                            it.qty
                          ),
                        })
                      }
                    />
                  </Field>
                )}

                <div className="flex items-center gap-2 pb-2.5">
                  <span className="w-20 text-right text-sm tabular-nums">
                    {p ? formatZAR(p.priceZAR * it.qty) : ""}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove item"
                    onClick={() => setItems(items.filter((_, k) => k !== i))}
                    className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() =>
              setItems([...items, { productId: "", variant: "", qty: 1, containersReturned: 0 }])
            }
            className="inline-flex items-center gap-1.5 text-sm text-olive transition-colors hover:text-olive-soft"
          >
            <Plus size={15} /> Add item
          </button>

          <div className="space-y-1.5 border-t border-cream-2 pt-4 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatZAR(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-olive">
                <span>{discountLabel(rule)}</span>
                <span className="tabular-nums">−{formatZAR(discount)}</span>
              </div>
            )}
            {method === "delivery" && deliveryFee > 0 && (
              <div className="flex justify-between text-ink-soft">
                <span>Shipping</span>
                <span className="tabular-nums">{formatZAR(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 font-display text-xl">
              <span>Total</span>
              <span className="tabular-nums">{formatZAR(total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Customer + meta */}
      <div className="space-y-6">
        <Card className="space-y-4">
          <h2 className="font-display text-lg">Customer</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Surname" required>
              <Input
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                required
              />
            </Field>
          </div>
          <Field label="Email" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Phone" required>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Field>
          <Field label="Method">
            <Select
              value={method}
              onChange={(v) => setMethod(v as "delivery" | "collection")}
              options={[
                { value: "delivery", label: "Delivery" },
                { value: "collection", label: "Collection" },
              ]}
            />
          </Field>
          {method === "delivery" && (
            <>
              <Field label="Delivery address">
                <Textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, suburb, city, postal code"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Shipping (ZAR)" hint="Courier cost on this order">
                  <Input
                    inputMode="numeric"
                    value={shipping}
                    onChange={(e) => setShipping(e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Courier" hint="Optional, e.g. The Courier Guy">
                  <Input
                    value={shippingService}
                    onChange={(e) => setShippingService(e.target.value)}
                    placeholder="Courier name"
                  />
                </Field>
              </div>
            </>
          )}
          <Field label="Note">
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-lg">Status</h2>
          <Field label="Order status">
            <Select
              value={status}
              onChange={(v) =>
                setStatus(v as (typeof ORDER_STATUSES)[number])
              }
              options={ORDER_STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              }))}
            />
          </Field>
          <Field label="Payment" hint="Mark paid to send confirmation + create the shipment">
            <Select
              value={paymentStatus}
              onChange={(v) =>
                setPaymentStatus(v as (typeof PAYMENT_STATUSES)[number])
              }
              options={PAYMENT_STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              }))}
            />
          </Field>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 size={16} className="animate-spin" />}
            {order ? "Save changes" : "Create order"}
          </Button>
          <Link
            href={order ? `/admin/orders/${order.id}` : "/admin/orders"}
            className="text-sm text-ink-soft transition-colors hover:text-ink"
          >
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
