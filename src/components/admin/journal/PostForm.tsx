"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  X,
  Bold,
  Italic,
  Heading,
  Link as LinkIcon,
  List,
  Quote,
  Eye,
  Pencil,
} from "lucide-react";
import type { Post } from "@/server/db/schema";
import {
  Card,
  Field,
  Input,
  Textarea,
  Select,
  Switch,
  inputClass,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { ImageField } from "@/components/admin/ImageUploader";
import { Markdown } from "@/components/journal/Markdown";
import { useToast } from "@/components/admin/Toast";
import { slugify } from "@/lib/admin-schemas";
import { normaliseTags, readingMinutes } from "@/lib/journal";
import { createPost, updatePost } from "@/server/actions/journal";
import { cn } from "@/lib/utils";

export function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt ?? "");
  const [tags, setTags] = useState<string[]>(post?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [status, setStatus] = useState<"draft" | "published">(
    post?.status ?? "draft"
  );
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    post?.seoDescription ?? ""
  );
  const [tab, setTab] = useState<"write" | "preview">("write");

  const onTitle = (v: string) => {
    setTitle(v);
    if (!slugEdited) setSlug(slugify(v));
  };

  const commitTag = () => {
    const next = normaliseTags([...tags, tagDraft]);
    setTags(next);
    setTagDraft("");
  };

  const onTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagDraft.trim()) commitTag();
    } else if (e.key === "Backspace" && !tagDraft && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  // Wrap or insert Markdown around the current textarea selection.
  const surround = (before: string, after = before, placeholder = "") => {
    const ta = bodyRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const sel = body.slice(s, e) || placeholder;
    const next = body.slice(0, s) + before + sel + after + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = s + before.length;
      ta.selectionEnd = s + before.length + sel.length;
    });
  };

  const prefixLine = (prefix: string) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = body.lastIndexOf("\n", s - 1) + 1;
    const next = body.slice(0, lineStart) + prefix + body.slice(lineStart);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = s + prefix.length;
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      title,
      slug,
      excerpt,
      body,
      coverImage,
      coverAlt,
      tags,
      status,
      featured,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
    };
    startTransition(async () => {
      const res = post
        ? await updatePost(post.id, input)
        : await createPost(input);
      if (res.ok) {
        toast.success(post ? "Post saved." : "Post created.");
        router.push("/admin/journal");
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  };

  const tbClass =
    "rounded-lg p-2 text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink";

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-4">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-5">
            <h2 className="font-display text-lg">Basics</h2>
            <Field label="Title" required htmlFor="title">
              <Input
                id="title"
                value={title}
                onChange={(e) => onTitle(e.target.value)}
                required
              />
            </Field>
            <Field label="Slug" required htmlFor="slug" hint="/journal/slug">
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
            <Field
              label="Excerpt"
              htmlFor="excerpt"
              hint="The dek shown on cards and used as the meta description."
            >
              <Textarea
                id="excerpt"
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                maxLength={400}
              />
            </Field>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">Body</h2>
              <div className="flex gap-1 rounded-full bg-cream-2 p-1">
                {(
                  [
                    ["write", "Write", Pencil],
                    ["preview", "Preview", Eye],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors",
                      tab === key
                        ? "bg-cream text-ink shadow-sm"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {tab === "write" ? (
              <>
                <div className="flex flex-wrap gap-1 border-b border-cream-3 pb-2">
                  <button type="button" title="Bold" aria-label="Bold" className={tbClass} onClick={() => surround("**", "**", "bold text")}>
                    <Bold size={16} />
                  </button>
                  <button type="button" title="Italic" aria-label="Italic" className={tbClass} onClick={() => surround("_", "_", "italic")}>
                    <Italic size={16} />
                  </button>
                  <button type="button" title="Heading" aria-label="Heading" className={tbClass} onClick={() => prefixLine("## ")}>
                    <Heading size={16} />
                  </button>
                  <button type="button" title="List" aria-label="List" className={tbClass} onClick={() => prefixLine("- ")}>
                    <List size={16} />
                  </button>
                  <button type="button" title="Quote" aria-label="Quote" className={tbClass} onClick={() => prefixLine("> ")}>
                    <Quote size={16} />
                  </button>
                  <button type="button" title="Link" aria-label="Link" className={tbClass} onClick={() => surround("[", "](https://)", "link text")}>
                    <LinkIcon size={16} />
                  </button>
                </div>
                <textarea
                  ref={bodyRef}
                  rows={20}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write in Markdown…  **bold**, _italic_, ## heading, - list"
                  className={cn(
                    inputClass,
                    "resize-y font-mono text-sm leading-relaxed"
                  )}
                />
                <p className="text-xs text-ink-soft">
                  Markdown supported · ~{readingMinutes(body)} min read
                </p>
              </>
            ) : (
              <div className="min-h-[20rem] rounded-xl border border-cream-3 bg-cream p-5">
                {body.trim() ? (
                  <Markdown>{body}</Markdown>
                ) : (
                  <p className="text-sm text-ink-soft">Nothing to preview yet.</p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card className="space-y-5">
            <h2 className="font-display text-lg">Visibility</h2>
            <Field
              label="Status"
              htmlFor="status"
              hint="Drafts are hidden from the journal."
            >
              <Select
                id="status"
                value={status}
                onChange={(v) => setStatus(v as "draft" | "published")}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                ]}
              />
            </Field>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Feature on journal</span>
              <Switch checked={featured} onChange={setFeatured} label="Featured" />
            </label>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-lg">Cover</h2>
            <Field label="Cover image">
              <ImageField value={coverImage} onChange={setCoverImage} />
            </Field>
            <Field
              label="Alt text"
              htmlFor="coverAlt"
              hint="Describes the image for screen readers + SEO."
            >
              <Input
                id="coverAlt"
                value={coverAlt}
                onChange={(e) => setCoverAlt(e.target.value)}
                placeholder={title || "A short description"}
              />
            </Field>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-display text-lg">Tags</h2>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-cream-2 px-2.5 py-1 text-sm"
                  >
                    {t}
                    <button
                      type="button"
                      aria-label={`Remove ${t}`}
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-ink-soft transition-colors hover:text-clay"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Field hint="Press Enter or comma to add. Topic pages are built from these.">
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={onTagKey}
                onBlur={() => tagDraft.trim() && commitTag()}
                placeholder="e.g. Candle care"
              />
            </Field>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-lg">SEO overrides</h2>
            <Field
              label="Meta title"
              htmlFor="seoTitle"
              hint="Defaults to the post title."
            >
              <Input
                id="seoTitle"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                maxLength={70}
              />
            </Field>
            <Field
              label="Meta description"
              htmlFor="seoDescription"
              hint="Defaults to the excerpt."
            >
              <Textarea
                id="seoDescription"
                rows={3}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                maxLength={200}
              />
            </Field>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-cream-3 bg-cream-2/90 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={16} className="animate-spin" />}
          {post ? "Save changes" : "Create post"}
        </Button>
        <Link
          href="/admin/journal"
          className="text-sm text-ink-soft transition-colors hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
