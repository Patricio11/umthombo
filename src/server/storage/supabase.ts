import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

let client: SupabaseClient | null = null;

function supa(): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      "Supabase env missing — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

const PUBLIC_MARKER = `/storage/v1/object/public/${bucket}/`;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB

/** Upload an image to the product-images bucket and return its public URL. */
export async function uploadProductImage(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Please upload a JPEG, PNG, WebP or AVIF image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("That image is over 6MB — please use a smaller one.");
  }
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `products/${randomUUID()}.${ext}`;
  const { error } = await supa()
    .storage.from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return supa().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Delete a previously-uploaded image. No-ops for non-Supabase URLs (seed images). */
export async function deleteProductImage(publicUrl: string): Promise<void> {
  const idx = publicUrl.indexOf(PUBLIC_MARKER);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + PUBLIC_MARKER.length);
  await supa().storage.from(bucket).remove([path]);
}

export function isSupabaseUrl(u: string): boolean {
  return u.includes(PUBLIC_MARKER);
}
