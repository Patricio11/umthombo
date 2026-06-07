"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth-client";
import { AuthShell, authInputCls } from "@/components/auth/AuthShell";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
import { Honeypot } from "@/components/ui/Honeypot";
import { isHoneypotFilled } from "@/lib/honeypot";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [hp, setHp] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHoneypotFilled(hp)) return; // silent drop for bots
    setLoading(true);
    await requestPasswordReset(
      { email: email.trim(), redirectTo: "/set-password" },
      captcha ? { headers: { "x-captcha-response": captcha } } : undefined
    );
    setLoading(false);
    captchaRef.current?.reset();
    setCaptcha(null);
    setSent(true); // always show success (no email enumeration)
  };

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <div className="rounded-2xl border border-cream-3 bg-cream p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-olive/15 text-olive">
            <MailCheck size={22} />
          </span>
          <p className="mt-4 text-sm text-ink-soft">
            If an account exists for{" "}
            <span className="font-medium text-ink">{email}</span>, we’ve sent a
            link to set a new password.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block link-underline text-sm text-olive"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="We’ll email you a link to set a new one."
      footer={
        <Link href="/login" className="link-underline text-olive">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="relative space-y-3">
        <Honeypot value={hp} onChange={setHp} />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          required
          className={authInputCls}
        />
        <Turnstile
          ref={captchaRef}
          onVerify={setCaptcha}
          onExpire={() => setCaptcha(null)}
        />
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
