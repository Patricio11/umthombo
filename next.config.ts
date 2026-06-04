import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server-only Node packages out of the bundler (Better Auth pulls in
  // adapter variants that shouldn't be statically bundled; Neon/ws are Node).
  serverExternalPackages: [
    "better-auth",
    "@better-auth/kysely-adapter",
    "kysely",
    "@neondatabase/serverless",
    "ws",
  ],
  images: {
    remotePatterns: [
      // Supabase Storage public URLs for product images
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
