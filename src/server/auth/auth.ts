import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";
import {
  user,
  session,
  account,
  verification,
} from "@/server/db/auth-schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // the admin is created by the seed, no public sign-up
    minPasswordLength: 8,
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
    },
  },
  advanced: {
    // Secure only on real https origins  never on http://localhost, even in
    // a production build (Secure cookies aren't sent over http).
    useSecureCookies: (process.env.BETTER_AUTH_URL ?? "").startsWith("https"),
  },
});

export type Session = typeof auth.$Infer.Session;
