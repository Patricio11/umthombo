"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, X } from "lucide-react";
import type { AdminProductDetail } from "@/server/db/admin-queries";
import type { CategoryView } from "@/lib/view-types";
import {
  Card,
  Field,
  Input,
  Textarea,
  Select,
  Switch,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { ImageField, GalleryField } from "@/components/admin/ImageUploader";
import { useToast } from "@/components/admin/Toast";
import { slugify } from "@/lib/admin-schemas";
import { createProduct, updateProduct } from "@/server/actions/products";

const num = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
};

export function ProductForm({
  product,
  categories,
}: {
  product?: AdminProductDetail;
  categories: CategoryView[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!product);
  const [categoryId, setCategoryId] = useState(
    product?.categoryId ?? categories[0]?.id ?? ""
  );
  const [tagline, setTagline] = useState(product?.tagline ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [notes, setNotes] = useState(product?.notes ?? "");
  const [size, setSize] = useState(product?.size ?? "");
  const [weight, setWeight] = useState(product?.weight ?? "");
  const [price, setPrice] = useState(product ? String(product.priceZAR) : "");
  const [priceMax, setPriceMax] = useState(
    product?.priceMaxZAR != null ? String(product.priceMaxZAR) : ""
  );
  const [packPrice, setPackPrice] = useState(
    product?.packPriceZAR != null ? String(product.packPriceZAR) : ""
  );
  const [variants, setVariants] = useState<string[]>(product?.variants ?? []);
  const [customisable, setCustomisable] = useState(
    product?.customisable ?? false
  );
  const [image, setImage] = useState(product?.image ?? "");
  const [gallery, setGallery] = useState<string[]>(product?.gallery ?? []);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [status, setStatus] = useState<"draft" | "active">(
    product?.status ?? "active"
  );

  const onName = (v: string) => {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      name,
      slug,
      categoryId,
      tagline,
      description,
      notes: notes || null,
      size: size || null,
      weight: weight || null,
      priceZAR: num(price) as number, // null → schema "A price is required."
      priceMaxZAR: num(priceMax),
      packPriceZAR: num(packPrice),
      customisable,
      featured,
      status,
      image,
      gallery,
      variants: variants.map((v) => v.trim()).filter(Boolean),
    };
    startTransition(async () => {
      const res = product
        ? await updateProduct(product.id, input)
        : await createProduct(input);
      if (res.ok) {
        toast.success(product ? "Product updated." : "Product created.");
        router.push("/admin/products");
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-4">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-5">
            <h2 className="font-display text-lg">Basics</h2>
            <Field label="Name" required htmlFor="name">
              <Input id="name" value={name} onChange={(e) => onName(e.target.value)} required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Slug" required htmlFor="slug" hint="/product/slug">
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEdited(true);
                  }}
                  required
                />
              </Field>
              <Field label="Category" required htmlFor="category">
                <Select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Tagline" htmlFor="tagline" hint="A short editorial line">
              <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </Field>
            <Field label="Description" htmlFor="description">
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-lg">Details</h2>
            <Field label="Notes" htmlFor="notes" hint="Scent / ingredient notes, separated by ·">
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cinnamon · Pear" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Size" htmlFor="size">
                <Input id="size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="150ml" />
              </Field>
              <Field label="Weight" htmlFor="weight">
                <Input id="weight" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="165g" />
              </Field>
            </div>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-lg">Options</h2>
            <Field label="Variants" hint="Scents / colours customers can pick">
              <div className="space-y-2">
                {variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={v}
                      onChange={(e) => {
                        const next = [...variants];
                        next[i] = e.target.value;
                        setVariants(next);
                      }}
                      placeholder="e.g. Lavender"
                    />
                    <button
                      type="button"
                      aria-label="Remove variant"
                      onClick={() => setVariants(variants.filter((_, k) => k !== i))}
                      className="shrink-0 rounded-lg p-2 text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setVariants([...variants, ""])}
                  className="inline-flex items-center gap-1.5 text-sm text-olive transition-colors hover:text-olive-soft"
                >
                  <Plus size={15} /> Add variant
                </button>
              </div>
            </Field>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Customisable</span>
              <Switch checked={customisable} onChange={setCustomisable} label="Customisable" />
            </label>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-lg">Media</h2>
            <Field label="Primary image">
              <ImageField value={image} onChange={setImage} />
            </Field>
            <Field label="Gallery" hint="Extra photos shown on the product page">
              <GalleryField value={gallery} onChange={setGallery} />
            </Field>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card className="space-y-5">
            <h2 className="font-display text-lg">Visibility</h2>
            <Field label="Status" htmlFor="status" hint="Drafts are hidden from the shop">
              <Select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "active")}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </Select>
            </Field>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Featured on home</span>
              <Switch checked={featured} onChange={setFeatured} label="Featured" />
            </label>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-lg">Pricing</h2>
            <Field label="Price (ZAR)" required htmlFor="price">
              <Input
                id="price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150"
                required
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Max price" htmlFor="priceMax" hint="For a range">
                <Input id="priceMax" inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
              </Field>
              <Field label="Pack of two" htmlFor="packPrice">
                <Input id="packPrice" inputMode="numeric" value={packPrice} onChange={(e) => setPackPrice(e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-cream-3 bg-cream-2/90 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={16} className="animate-spin" />}
          {product ? "Save changes" : "Create product"}
        </Button>
        <Link href="/admin/products" className="text-sm text-ink-soft transition-colors hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
