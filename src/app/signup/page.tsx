"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { passwordOk } from "@/lib/password";
import { AuthShell, authInputCls } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
import { Honeypot } from "@/components/ui/Honeypot";
import { isHoneypotFilled } from "@/lib/honeypot";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hp, setHp] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHoneypotFilled(hp)) return; // silent drop for bots
    setError(null);
    if (!passwordOk(password)) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setLoading(true);
    const { error } = await signUp.email(
      {
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        marketingOptIn,
        callbackURL: "/account",
      } as Parameters<typeof signUp.email>[0],
      captcha ? { headers: { "x-captcha-response": captcha } } : undefined
    );
    setLoading(false);
    if (error) {
      captchaRef.current?.reset();
      setCaptcha(null);
      setError(error.message || "We couldn’t create your account.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <AuthShell title="Check your email">
        <div className="rounded-2xl border border-cream-3 bg-cream p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-olive/15 text-olive">
            <MailCheck size={22} />
          </span>
          <p className="mt-4 text-sm text-ink-soft">
            We’ve sent a verification link to{" "}
            <span className="font-medium text-ink">{email}</span>. Click it to
            activate your account, then sign in.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block link-underline text-sm text-olive"
          >
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save addresses, track orders and reorder in a tap."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="link-underline text-olive">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="relative space-y-3">
        <Honeypot value={hp} onChange={setHp} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          required
          className={authInputCls}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          required
          className={authInputCls}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          autoComplete="tel"
          className={authInputCls}
        />
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="Create a password"
          autoComplete="new-password"
          showMeter
        />

        <label className="flex items-start gap-2.5 pt-1 text-sm text-ink-soft">
          <Checkbox
            checked={marketingOptIn}
            onChange={setMarketingOptIn}
            className="mt-0.5"
          />
          <span>Email me about new products and occasional offers.</span>
        </label>

        {error && (
          <p className="rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">
            {error}
          </p>
        )}

        <Turnstile
          ref={captchaRef}
          onVerify={setCaptcha}
          onExpire={() => setCaptcha(null)}
        />

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Create account
        </Button>
        <p className="text-center text-xs text-ink-soft">
          You’ll verify your email before signing in.
        </p>
      </form>
    </AuthShell>
  );
}
