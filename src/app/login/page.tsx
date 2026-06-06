"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn, sendVerificationEmail } from "@/lib/auth-client";
import { AuthShell, authInputCls } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needVerify, setNeedVerify] = useState(false);
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedVerify(false);
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      if (error.status === 403 || /verif/i.test(error.message || "")) {
        setNeedVerify(true);
        return;
      }
      setError(error.message || "Those details didn’t work. Try again.");
      return;
    }
    router.push(next);
    router.refresh();
  };

  const resend = async () => {
    await sendVerificationEmail({ email, callbackURL: next });
    setResent(true);
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="link-underline text-olive">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          required
          className={authInputCls}
        />
        <PasswordInput value={password} onChange={setPassword} />
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="link-underline text-xs text-ink-soft"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">
            {error}
          </p>
        )}
        {needVerify && (
          <div className="rounded-xl bg-taupe/15 px-4 py-3 text-sm text-ink-soft">
            Please verify your email first.{" "}
            {resent ? (
              <span className="text-olive">Verification email sent.</span>
            ) : (
              <button
                type="button"
                onClick={resend}
                className="link-underline text-olive"
              >
                Resend email
              </button>
            )}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
