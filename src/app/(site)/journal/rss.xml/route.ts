import { site } from "@/data/site";
import { absUrl } from "@/lib/seo";
import { getPublishedPosts } from "@/server/db/journal";

export const revalidate = 3600;

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const posts = await getPublishedPosts({ limit: 30 });
  const feedUrl = absUrl("/journal/rss.xml");
  const journalUrl = absUrl("/journal");

  const items = posts
    .map((p) => {
      const url = absUrl(`/journal/${p.slug}`);
      const pubDate = (p.publishedAt ?? new Date()).toUTCString();
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${esc(p.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)} Journal</title>
    <link>${journalUrl}</link>
    <description>Notes on slow craft, scent and home from ${esc(site.name)}.</description>
    <language>en-ZA</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
