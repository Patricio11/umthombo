"use client";

import { useState, forwardRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orderSchema, type OrderInput } from "@/lib/zod-schemas";
import { buildWhatsAppOrder } from "@/lib/whatsapp";
import { useCart, selectTotal } from "@/store/cart";
import { formatZAR } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { OrderSuccess } from "@/components/order/OrderSuccess";

const EASE = [0.22, 1, 0.36, 1] as const;

export function OrderModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const items = useCart((s) => s.items);
  const ownContainer = useCart((s) => s.ownContainer);
  const total = useCart(selectTotal);
  const clear = useCart((s) => s.clear);
  const closeCart = useCart((s) => s.closeCart);

  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: { method: "delivery" },
  });

  const onSubmit = (data: OrderInput) => {
    const url = buildWhatsAppOrder(items, {
      ...data,
      ownContainer,
    });
    // Open WhatsApp with the pre-filled order.
    window.open(url, "_blank", "noopener,noreferrer");
    setSubmitted(true);
  };

  const handleClose = () => {
    onClose();
    // Reset a beat later so the closing animation doesn't flash the form.
    setTimeout(() => {
      setSubmitted(false);
      reset();
    }, 350);
  };

  const finishAndClear = () => {
    clear();
    closeCart();
    handleClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="fixed inset-0 z-[80] bg-ink/45 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="fixed left-1/2 top-1/2 z-[81] flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-cream shadow-2xl"
              >
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <OrderSuccess key="success" onDone={finishAndClear} />
                  ) : (
                    <motion.div
                      key="form"
                      exit={{ opacity: 0 }}
                      className="flex flex-col overflow-y-auto"
                    >
                      <header className="flex items-start justify-between px-7 pt-7">
                        <div>
                          <p className="eyebrow text-clay">Almost there</p>
                          <Dialog.Title className="mt-2 font-display text-3xl">
                            Place your order
                          </Dialog.Title>
                          <p className="mt-1.5 text-sm text-ink-soft">
                            We&rsquo;ll open WhatsApp with your order ready to
                            send.
                          </p>
                        </div>
                        <Dialog.Close
                          aria-label="Close"
                          className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-cream-2 hover:text-clay"
                        >
                          <X size={20} />
                        </Dialog.Close>
                      </header>

                      <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex flex-col gap-4 px-7 py-6"
                      >
                        <Field label="Name" error={errors.name?.message}>
                          <input
                            {...register("name")}
                            placeholder="Your name"
                            className={inputCls}
                          />
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Email" error={errors.email?.message}>
                            <input
                              {...register("email")}
                              type="email"
                              placeholder="you@email.com"
                              className={inputCls}
                            />
                          </Field>
                          <Field label="Phone" error={errors.phone?.message}>
                            <input
                              {...register("phone")}
                              placeholder="+27 or 0…"
                              className={inputCls}
                            />
                          </Field>
                        </div>

                        <fieldset>
                          <legend className="mb-2 text-sm font-medium text-ink">
                            How would you like it?
                          </legend>
                          <div className="grid grid-cols-2 gap-3">
                            <RadioCard
                              {...register("method")}
                              value="delivery"
                              title="Delivery"
                              sub="Nationwide"
                              defaultChecked
                            />
                            <RadioCard
                              {...register("method")}
                              value="collection"
                              title="Collection"
                              sub="Observatory"
                            />
                          </div>
                        </fieldset>

                        <Field
                          label="A note (optional)"
                          error={errors.note?.message}
                        >
                          <textarea
                            {...register("note")}
                            rows={3}
                            placeholder="Personalisation, scent, colour…"
                            className={`${inputCls} resize-none`}
                          />
                        </Field>

                        <div className="mt-1 flex items-center justify-between rounded-2xl bg-cream-2 px-4 py-3">
                          <span className="text-sm text-ink-soft">
                            Order total
                          </span>
                          <span className="font-display text-xl">
                            {formatZAR(total)}
                          </span>
                        </div>

                        <Button
                          type="submit"
                          size="lg"
                          className="mt-1 w-full"
                          disabled={isSubmitting || items.length === 0}
                        >
                          Send via WhatsApp
                        </Button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

const inputCls =
  "w-full rounded-xl border border-cream-3 bg-cream px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-clay focus:outline-none";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-clay">{error}</span>}
    </label>
  );
}

// Styled radio "card". forwardRef so RHF register() works.
const RadioCard = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { title: string; sub: string }
>(({ title, sub, ...props }, ref) => (
  <label className="relative cursor-pointer">
    <input ref={ref} type="radio" className="peer sr-only" {...props} />
    <div className="rounded-2xl border border-cream-3 bg-cream px-4 py-3 transition-all peer-checked:border-clay peer-checked:bg-clay/5 peer-focus-visible:outline-2 peer-focus-visible:outline-clay">
      <p className="font-medium text-ink">{title}</p>
      <p className="text-xs text-ink-soft">{sub}</p>
    </div>
  </label>
));
RadioCard.displayName = "RadioCard";
