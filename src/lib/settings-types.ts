/** Resolved site settings (DB overrides merged over data/site defaults).
 *  Client-safe — no server imports. */
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
  instagram: { handle: string; href: string };
  facebook: { handle: string; href: string };
}
