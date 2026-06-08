import type { PaymentProvider } from "@/lib/integrations";

/** Resolved site settings (DB overrides merged over data/site defaults).
 *  Client-safe  no server imports. */
export interface SiteSettings {
  name: string;
  url: string;
  since: number;
  meaning: string;
  location: string;
  tagline: string;
  story: string;
  collection: string;
  email: string;
  whatsapp: { number: string; display: string; href: string };
  instagram: { handle: string; href: string; enabled: boolean };
  facebook: { handle: string; href: string; enabled: boolean };
  /** Admin's preferred/default live payment gateway. null = auto (whichever is on). */
  paymentProvider: PaymentProvider | null;
  /** Let customers choose their payment gateway at checkout (when both are ready). */
  offerBothGateways: boolean;
}
