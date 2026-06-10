# Journal (Editorial Blog) — Build Plan

An **admin-managed journal** at `/journal` — the highest-leverage SEO move after Google Business Profile. Store pages rank for *transactional* queries ("buy soy candles"); a journal earns *informational* traffic and backlinks ("soy vs paraffin", "Cape Town handmade gift guide", "how to care for your candle") that lift the whole domain. It reuses the existing architecture almost exactly (Drizzle, Supabase uploads, `requireAdmin` + Zod actions, `seo.ts` graph, sitemap, ISR).

> Track progress here. Tick tasks as they land. Each phase ends with a green build (`npm run build`).

> **Status: shipped ✓** — all phases built (migration `0023`), green build, two starter posts seeded. See [Journal in the README](../README.md#journal).

---

## Locked decisions

| Area | Choice |
|---|---|
| **Authoring** | **Markdown + live preview** (toolbar over a textarea). Render with `react-markdown` + `remark-gfm` + `rehype-sanitize` (+ `rehype-slug` for heading anchors). Safe, lightweight, structured headings/links/images — exactly what ranks. |
| **Scope** | **Full** — tags/topic pages, related posts, RSS feed. |
| **Tags** | Free-text on the post, stored as a Postgres **`text[]`** column (no separate taxonomy screen — far easier for a solo owner). Slugified for `/journal/topic/[tag]` pages; humanised for headings. |
| **Author** | Single brand author ("Umthombo Creations"); an `authorName` field leaves room for guests later. |
| **Images** | Required **cover image** + inline images, all Supabase-hosted (reuse the existing uploader). Cover carries an `alt`. |
| **Nav** | "Journal" added to the primary nav + footer; RSS `<link>` in the head. |
| **Out of scope** | Comments (spam magnet — point at socials), multi-author profiles, scheduled/queued publishing, newsletter. |

---

## Data model

**`posts`**
- `id` uuid pk · `slug` unique · `title`
- `excerpt` — the dek/summary (cards + meta-description fallback)
- `body` — Markdown source
- `coverImage` · `coverAlt`
- `tags` — `text[]` (default `{}`)
- `status` — `draft | published`
- `featured` — bool (hero slot on the index)
- `publishedAt` — timestamp, null until first published
- `seoTitle` · `seoDescription` — optional overrides
- `readingMinutes` — int, computed on save
- `authorName` — default "Umthombo Creations"
- `createdAt` · `updatedAt`

No new tables — tags live on the row. Related posts are computed (shared-tag overlap, then recency).

---

## Phases

### Phase 1 — Foundation (data + reads)
- [x] Migration: `posts` table (with `text[]` tags). Drizzle schema + inferred types.
- [x] Public reads: `getPublishedPosts({page,tag?})`, `getPostBySlug`, `getRelatedPosts(slug, tags)`, `getAllTags()` (distinct, with counts), `getPostsByTag(tag)`.
- [x] Admin reads: `getAdminPosts()`, `getAdminPost(id)`.
- [x] Utils: `slugify`, `tagSlug`/`tagLabel`, `readingMinutes(markdown)`.

### Phase 2 — Admin CRUD
- [x] `lib/post-schema.ts` (Zod) — title, slug, excerpt, body, cover, alt, tags, SEO, status, featured, publishedAt.
- [x] Actions (`requireAdmin` + Zod): `createPost`, `updatePost`, `deletePost`, `togglePostStatus` (publish/draft — the eye toggle, like products). Revalidate `/journal` + the post path.
- [x] Admin pages: `/admin/journal` (DataTable: title, status, tags, published date, eye toggle), `/admin/journal/new`, `/admin/journal/[id]`.
- [x] Editor: title (auto slug, editable) · excerpt · **cover upload** (reuse uploader) + alt · **tags** chip input · **Markdown body** with toolbar + **split live preview** · SEO title/description · featured · publish toggle + date.
- [x] Sidebar entry + dashboard count.

### Phase 3 — Safe Markdown rendering
- [x] Add deps: `react-markdown`, `remark-gfm`, `rehype-sanitize`, `rehype-slug`.
- [x] `<Markdown>` component — sanitised schema, brand `prose` typography, styled images (lazy), external links get `rel="noopener" target="_blank"`. Shared by the admin preview and the public article (one renderer, no drift).

### Phase 4 — Public pages
- [x] `/journal` — featured hero + card grid, tag-filter chips, pagination, ISR. Editorial, motion-restrained.
- [x] `/journal/[slug]` — cover, title, date, reading time, author, body, tag chips, share, **related posts**, back link. `generateMetadata` (canonical, OG = cover).
- [x] `/journal/topic/[tag]` — posts for a tag (title = tag), canonical, ISR.
- [x] Tasteful empty states.

### Phase 5 — SEO surfaces
- [x] `seo.ts`: `articleLd(post)` → **BlogPosting** (headline, image, datePublished, dateModified, author, publisher, `mainEntityOfPage`, keywords from tags) + **BreadcrumbList**; `/journal` → **Blog**/CollectionPage.
- [x] `sitemap.ts`: published posts (`lastmod = updatedAt`) + `/journal` + topic pages.
- [x] Nav + footer link; one light cross-link CTA from product/about pages.

### Phase 6 — RSS
- [x] `/journal/rss.xml` route handler — latest published posts, valid RSS 2.0, cache headers. `<link rel="alternate" type="application/rss+xml">` in head + footer.

### Phase 7 — Polish
- [x] Optional idempotent seed of 1–2 sample posts (so the section isn't empty), or ship the empty state.
- [x] README + docs index updated. Build green.

---

## Why this slots in cleanly

| Journal piece | Existing pattern reused |
|---|---|
| `posts` table + migration | `products` schema + drizzle-kit flow |
| Admin list + editor | DataTable, forms, `requireAdmin` + Zod actions |
| Cover/inline images | Supabase uploader (drag-and-drop) |
| Publish/draft eye toggle | products' show/hide toggle |
| Article + Breadcrumb JSON-LD | `seo.ts` graph builders |
| Sitemap + per-post metadata | existing `sitemap.ts` + `generateMetadata` |
| ISR + revalidate-on-write | the whole storefront already works this way |
