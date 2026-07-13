// src/lib/contentful.ts
// Contentful Content Delivery API — Insights (news articles).
//
// ── SETUP ────────────────────────────────────────────────────────────────────
// 1. In Contentful, create Content Type "insight" with these fields:
//    title      Short text
//    slug       Short text (unique, URL-safe)
//    date       Date
//    summary    Short text
//    category   Short text  e.g. Project / Logistics / Agriculture / Media
//    featured   Boolean
//    body       Rich Text
//
// 2. Add environment variables (Cloudflare Pages → Settings → Variables):
//    CONTENTFUL_SPACE_ID      your-space-id
//    CONTENTFUL_ACCESS_TOKEN  your-delivery-api-token
//
// 3. These functions run at build time (Astro SSG).
// ─────────────────────────────────────────────────────────────────────────────

const SPACE = import.meta.env.CONTENTFUL_SPACE_ID as string;
const TOKEN = import.meta.env.CONTENTFUL_ACCESS_TOKEN as string;
const BASE  = `https://cdn.contentful.com/spaces/${SPACE}/environments/master`;

export interface InsightEntry {
  slug:     string;
  title:    string;
  date:     Date;
  summary:  string;
  category: string;
  featured: boolean;
  body:     RichTextDoc;
}

// Minimal rich-text document shape
export interface RichTextDoc {
  nodeType: string;
  content:  unknown[];
  [k: string]: unknown;
}

/** Fetch all insights, sorted newest-first */
export async function getAllInsights(): Promise<InsightEntry[]> {
  const res  = await fetch(`${BASE}/entries?content_type=insight&order=-fields.date&include=0&access_token=${TOKEN}`);
  if (!res.ok) throw new Error(`Contentful: ${res.status}`);
  const data = await res.json() as { items: unknown[] };
  return data.items.map(mapEntry);
}

/** Fetch a single insight by slug — returns null if not found */
export async function getInsightBySlug(slug: string): Promise<InsightEntry | null> {
  const res  = await fetch(`${BASE}/entries?content_type=insight&fields.slug=${slug}&include=0&access_token=${TOKEN}`);
  if (!res.ok) return null;
  const data = await res.json() as { items: unknown[] };
  return data.items.length ? mapEntry(data.items[0]) : null;
}

/** Return all slugs — used in getStaticPaths */
export async function getAllInsightSlugs(): Promise<string[]> {
  return (await getAllInsights()).map(i => i.slug);
}

function mapEntry(item: unknown): InsightEntry {
  const f = (item as { fields: Record<string, unknown> }).fields;
  return {
    slug:     String(f.slug     ?? ''),
    title:    String(f.title    ?? ''),
    date:     new Date(String(f.date ?? new Date().toISOString())),
    summary:  String(f.summary  ?? ''),
    category: String(f.category ?? 'Insight'),
    featured: Boolean(f.featured),
    body:     (f.body as RichTextDoc) ?? { nodeType: 'document', content: [] },
  };
}
