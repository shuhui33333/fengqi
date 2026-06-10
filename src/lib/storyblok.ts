// src/lib/storyblok.ts
// Storyblok Content Delivery API — Insights (news articles).
//
// ── CLOUDFLARE PAGES ENV VAR ─────────────────────────────────────
//   Variable name: Web3Forms        ← as named in Cloudflare
//   (Note: this var holds the Storyblok token despite the name)
//
// ── STORYBLOK CONTENT TYPE SETUP ────────────────────────────────
// Create a Content Type called "insight" with these fields:
//   title       Text
//   slug        Text  (set as URL path, unique)
//   date        Date/time
//   summary     Textarea
//   category    Text  (e.g. Project / Logistics / Agriculture / Media)
//   featured    Boolean
//   image       Asset  (featured image)
//   body        Richtext
// ────────────────────────────────────────────────────────────────

// Cloudflare Pages exposes the env var named "Web3Forms"
// We read it here; if it's a Storyblok token it works as-is.
// The var name in import.meta.env uses the Cloudflare variable name.
const TOKEN  = import.meta.env.storyblock as string   // Cloudflare var name: storyblock
const BASE   = 'https://api.storyblok.com/v2/cdn'
const CV     = Date.now()   // cache busting
const url = `${BASE}/stories/insights?token=${TOKEN}&version=published&cv=${CV}`;
const response = await fetch(url);


export interface InsightEntry {
  slug:     string
  title:    string
  date:     Date
  summary:  string
  category: string
  featured: boolean
  image:    string | null   // URL or null
  body:     StoryblokRichText
}

export interface StoryblokRichText {
  type:    string
  content: StoryblokNode[]
}
export interface StoryblokNode {
  type:    string
  attrs?:  Record<string,unknown>
  content?: StoryblokNode[]
  text?:   string
  marks?:  { type:string; attrs?:Record<string,unknown> }[]
}

interface SBStory {
  slug:     string
  content:  Record<string, unknown>
  published_at: string
}

/** Fetch all published insight stories, newest-first */
export async function getAllInsights(): Promise<InsightEntry[]> {
  const url = `${BASE}/stories?token=${TOKEN}&starts_with=insights/&sort_by=content.date:desc&cv=${CV}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`Storyblok: ${res.status} ${res.statusText}`)
  const data = await res.json() as { stories: SBStory[] }
  return data.stories.map(mapStory)
}

/** Fetch a single insight by slug */
export async function getInsightBySlug(slug: string): Promise<InsightEntry | null> {
  const url = `${BASE}/stories/insights/${slug}?token=${TOKEN}&cv=${CV}`
  const res  = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as { story: SBStory }
  return mapStory(data.story)
}

/** All slugs — for getStaticPaths */
export async function getAllInsightSlugs(): Promise<string[]> {
  return (await getAllInsights()).map(i => i.slug)
}

function mapStory(story: SBStory): InsightEntry {
  const c = story.content
  return {
    slug:     story.slug,
    title:    String(c.title    ?? ''),
    date:     new Date(String(c.date ?? story.published_at ?? new Date().toISOString())),
    summary:  String(c.summary  ?? ''),
    category: String(c.category ?? 'Insight'),
    featured: Boolean(c.featured),
    image:    extractImageUrl(c.image),
    body:     (c.body as StoryblokRichText) ?? { type:'doc', content:[] },
  }
}

function extractImageUrl(img: unknown): string | null {
  if (!img) return null
  if (typeof img === 'string') return img || null
  if (typeof img === 'object') {
    const o = img as Record<string,unknown>
    return String(o.filename ?? o.url ?? '') || null
  }
  return null
}
