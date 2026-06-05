"use client";

import { createContext, useContext } from "react";
import type { SiteSettings } from "@/lib/settings-types";

const Ctx = createContext<SiteSettings | null>(null);

export function SiteSettingsProvider({
  value,
  children,
}: {
  value: SiteSettings;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiteSettings(): SiteSettings {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useSiteSettings must be used within <SiteSettingsProvider>");
  return ctx;
}
