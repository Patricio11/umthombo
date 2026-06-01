"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { site } from "@/data/site";

const inputCls =
  "w-full rounded-xl border border-cream-3 bg-cream px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-olive focus:outline-none";

export function ContactForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = encodeURIComponent(
      `Hi Umthombo 🌱${name ? ` — I'm ${name}.` : ""}\n\n${message}`
    );
    window.open(
      `${site.whatsapp.href}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
    setSent(true);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="So we know who we're talking to"
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Your message</span>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="A question, an idea, a custom request…"
          className={`${inputCls} resize-none`}
        />
      </label>

      <Button type="submit" size="lg" className="w-full" disabled={!message.trim()}>
        <AnimatePresence mode="wait" initial={false}>
          {sent ? (
            <motion.span
              key="sent"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="inline-flex items-center gap-2"
            >
              <Check size={18} /> Opened in WhatsApp — just hit send
            </motion.span>
          ) : (
            <motion.span
              key="send"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="inline-flex items-center gap-2"
            >
              <WhatsAppIcon size={18} /> Send via WhatsApp
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
      <p className="text-center text-xs text-ink-soft">
        We&rsquo;ll reply on WhatsApp — usually quickly, always warmly.
      </p>
    </form>
  );
}
