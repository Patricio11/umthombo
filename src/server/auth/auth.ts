import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import {
  user,
  session,
  account,
  verification,
} from "@/server/db/auth-schema";
import { sendEmail } from "@/server/email/resend";
import {
  verificationEmail,
  passwordResetEmail,
} from "@/server/email/templates";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  user: {
    additionalFields: {
      // role is server-controlled - never settable from a sign-up request.
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },
      phone: { type: "string", required: false, input: true },
      marketingOptIn: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: false, // customers can sign up; admin is created by the seed
    minPasswordLength: 8,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    sendResetPassword: async ({ user, url }) => {
      const { subject, html } = passwordResetEmail(user.name, url);
      const ok = await sendEmail({ to: user.email, subject, html });
      if (!ok) console.warn("[auth] reset email not sent (Resend off?)");
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 24 hours
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html } = verificationEmail(user.name, url);
      const ok = await sendEmail({ to: user.email, subject, html });
      if (!ok) console.warn("[auth] verification email not sent (Resend off?)");
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    window: 60, // seconds
    max: 30, // requests per window per IP
    customRules: {
      "/sign-in/email": { window: 60, max: 5 }, // throttle brute-force
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/send-verification-email": { window: 300, max: 3 },
    },
  },
  advanced: {
    // Secure only on real https origins  never on http://localhost, even in
    // a production build (Secure cookies aren't sent over http).
    useSecureCookies: (process.env.BETTER_AUTH_URL ?? "").startsWith("https"),
  },
  // Lets auth.api.* calls set cookies from Next.js server actions / handlers.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
