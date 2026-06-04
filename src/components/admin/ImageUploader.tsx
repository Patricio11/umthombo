"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud, X, ChevronLeft, ChevronRight } from "lucide-react";
import { uploadImage } from "@/server/actions/products";
import { useToast } from "@/components/admin/Toast";
import { cn } from "@/lib/utils";

async function doUpload(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await uploadImage(fd);
  if (!res.ok || !res.url) throw new Error(res.error ?? "Upload failed.");
  return res.url;
}

function Dropzone({
  onFiles,
  busy,
  multiple,
  compact,
}: {
  onFiles: (files: File[]) => void;
  busy: boolean;
  multiple?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cream-3 bg-cream-2/40 text-center transition-colors hover:border-olive/40",
        drag && "border-olive bg-olive/5",
        compact ? "h-28 p-3" : "h-40 p-6"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(multiple ? files : files.slice(0, 1));
          e.target.value = "";
        }}
      />
      {busy ? (
        <Loader2 size={22} className="animate-spin text-olive" />
      ) : (
        <UploadCloud size={compact ? 20 : 24} className="text-taupe" />
      )}
      <span className="text-xs text-ink-soft">
        {busy ? "Uploading…" : "Drop an image or click to upload"}
      </span>
    </button>
  );
}

/** Single primary image. */
export function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handle = async (files: File[]) => {
    setBusy(true);
    try {
      onChange(await doUpload(files[0]));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <div className="group relative aspect-[4/5] w-40 overflow-hidden rounded-2xl border border-cream-3 bg-cream-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Product" className="h-full w-full object-cover" />
        <button
          type="button"
          aria-label="Remove image"
          onClick={() => onChange("")}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-cream transition-colors hover:bg-clay"
        >
          <X size={15} />
        </button>
      </div>
    );
  }
  return (
    <div className="w-full max-w-xs">
      <Dropzone onFiles={handle} busy={busy} />
    </div>
  );
}

/** Multiple gallery images with remove + reorder. */
export function GalleryField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handle = async (files: File[]) => {
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await doUpload(f));
      onChange([...value, ...urls]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((url, i) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-cream-3 bg-cream-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onChange(value.filter((_, k) => k !== i))}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-cream transition-colors hover:bg-clay"
              >
                <X size={13} />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/40 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Move left"
                  onClick={() => move(i, -1)}
                  className="p-1 text-cream disabled:opacity-30"
                  disabled={i === 0}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Move right"
                  onClick={() => move(i, 1)}
                  className="p-1 text-cream disabled:opacity-30"
                  disabled={i === value.length - 1}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dropzone onFiles={handle} busy={busy} multiple compact />
    </div>
  );
}
