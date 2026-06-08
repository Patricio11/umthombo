"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { CustomRequestForm } from "@/components/custom/CustomRequestForm";
import { lockScroll, unlockScroll } from "@/lib/lenis";

const EASE = [0.22, 1, 0.36, 1] as const;

export function CustomRequestModal({
  trigger,
  defaultType,
}: {
  trigger: React.ReactNode;
  defaultType?: string;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    lockScroll();
    return () => unlockScroll();
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-[2px]"
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="fixed left-1/2 top-1/2 z-[81] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2"
              >
                <div
                  data-lenis-prevent
                  className="max-h-[88dvh] overflow-y-auto rounded-3xl bg-cream p-6 shadow-2xl sm:p-8"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow text-olive">Made for you</p>
                      <Dialog.Title className="mt-1 font-display text-2xl">
                        Request a custom piece
                      </Dialog.Title>
                    </div>
                    <Dialog.Close
                      aria-label="Close"
                      className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-ink-soft transition-colors hover:bg-cream-2 hover:text-olive"
                    >
                      <X size={20} />
                    </Dialog.Close>
                  </div>
                  <CustomRequestForm
                    onClose={() => setOpen(false)}
                    defaultType={defaultType}
                  />
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
