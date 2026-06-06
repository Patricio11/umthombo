import { z } from "zod";

/** A saved customer address (delivery details + recipient). Client-safe. */
export const addressFormSchema = z.object({
  label: z.string().trim().max(40).optional().default(""),
  recipientName: z.string().trim().min(1, "Enter a recipient name.").max(120),
  phone: z.string().trim().max(30).optional().default(""),
  company: z.string().trim().max(120).optional().default(""),
  streetAddress: z.string().trim().min(3, "Enter a street address.").max(200),
  localArea: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().min(2, "Enter a city.").max(120),
  zone: z.string().trim().min(2, "Choose a province.").max(40),
  code: z.string().trim().min(4, "Enter a postal code.").max(10),
  country: z.string().trim().max(2).optional().default("ZA"),
  isPrimary: z.boolean().optional().default(false),
});

export type AddressFormInput = z.input<typeof addressFormSchema>;

/** Shape used by the client form (a saved address from the DB, less metadata). */
export interface AddressView {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string | null;
  company: string | null;
  streetAddress: string;
  localArea: string | null;
  city: string;
  zone: string;
  code: string;
  country: string;
  isPrimary: boolean;
}
