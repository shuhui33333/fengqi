/**
 * src/lib/storyblok.ts
 * Storyblok Content Delivery API — Insights (news articles).
 *
 * Cloudflare Secret name : storyblock  (do NOT rename)
 * Content path           : insights/
 * Storyblok fields       : Title · Date · Richtext · Image
 *                          (Storyblok normalises field names to lowercase in the API response)
 *
 * Environments:
 *   Production  → published=1   (default CDN, public token)
 *   Preview     → version=draft (same token works; Storyblok uses the same
 *                                Public Token for both draft + published reads)
 *   The token is stored in Cloudflare Secret "storyblock" and injected via
 *   import.meta.env.storyblock at build time for both preview and production
 *   deployments.
 */

const TOKEN = (import.meta.env.storyblock ?? '') as string
const BASE  = 'https://api.storyblok.com/v2/cdn'

// Use draft in non-production builds so preview deploys show unpublished content
const VERSION: 'published' | 'draft' =
  import.meta.env.MODE === 'production' ? 'published' : 'draft'

const CV = Date.now()   // cache-bust token

// ── Types ─────────────────────────────────────────────────────────────────

export interface InsightEntry {
  slug:     string
  title:    string
  date:     Date
  summary:  string   // first paragraph of Richtext, or a "Summary" text field if added later
  category: string
  featured: boolean
  image:    string | null
  body:     SBRichText
}

export interface SBRichText {
  type:    string
  content: SBNode[]
}
export interface SBNode {
  type:     string
  attrs?:   Record<string, unknown>
  content?: SBNode[]
  text?:    string
  marks?:   { type: string; attrs?: Record<string, unknown> }[]
}

interface SBStory {
  slug:         string
  published_at: string | null
  content:      Record<string, unknown>
}

// ── Fetch helpers ─────────────────────────────────────────────────────────

/** All published (or draft in preview) insight stories, newest-first */
export async function getAllInsights(): Promise<InsightEntry[]> {
  if (!TOKEN) {
    console.warn('[storyblok] Token missing — check Cloudflare Secret "storyblock"')
    return []
  }
  const url =
    `${BASE}/stories` +
    `?token=${TOKEN}` +
    `&starts_with=insights/` +
    `&version=${VERSION}` +
    `&sort_by=first_published_at:desc` +
    `&per_page=100` +
    `&cv=${CV}`

  const res = await fetch(url)
  if (!res.ok) {
    console.error(`[storyblok] ${res.status} ${res.statusText}`)
    return []
  }
  const data = await res.json() as { stories: SBStory[] }
  return (data.stories ?? []).map(mapStory)
}

/** Single story by slug — returns null if not found */
export async function getInsightBySlug(slug: string): Promise<InsightEntry | null> {
  if (!TOKEN) return null
  const url =
    `${BASE}/stories/insights/${slug}` +
    `?token=${TOKEN}` +
    `&version=${VERSION}` +
    `&cv=${CV}`

  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as { story: SBStory }
  return data.story ? mapStory(data.story) : null
}

/** All slugs — for getStaticPaths */
export async function getAllInsightSlugs(): Promise<string[]> {
  return (await getAllInsights()).map(i => i.slug)
}

// ── Mapper ────────────────────────────────────────────────────────────────
//
// Storyblok lowercases field names in the JSON response.
// Your content type fields:  Title · Date · Richtext · Image
// API response keys:         title · date · richtext · image
//
function mapStory(story: SBStory): InsightEntry {
  const c = story.content

  // Title  → c.title  (Text field)
  const title = String(c.title ?? c.Title ?? '')

  // Date  → c.date  (Date/time field)
  const rawDate = (c.date ?? c.Date ?? story.published_at ?? new Date().toISOString()) as string
  const date = new Date(String(rawDate))

  // Image  → c.image  (Asset field — Storyblok returns { filename, alt, … })
  const image = extractImageUrl(c.image ?? c.Image)

  // Richtext  → c.richtext  (Rich-Text field)
  const body = (c.richtext ?? c.Richtext ?? c.body ?? c.Body) as SBRichText | undefined
    ?? { type: 'doc', content: [] }

  // Summary — derive from first paragraph if no explicit field
  const summary = String(
    c.summary ?? c.Summary ?? c.excerpt ?? c.Excerpt ?? extractSummary(body) ?? ''
  )

  // Category / Featured — optional convenience fields
  const category = String(c.category ?? c.Category ?? 'Insight')
  const featured  = Boolean(c.featured ?? c.Featured ?? false)

  return { slug: story.slug, title, date, summary, category, featured, image, body }
}

/** Pull the text content of the first paragraph as a summary fallback */
function extractSummary(doc: SBRichText): string {
  const para = doc.content?.find(n => n.type === 'paragraph')
  if (!para) return ''
  return (para.content ?? [])
    .filter(n => n.type === 'text')
    .map(n => n.text ?? '')
    .join('')
    .slice(0, 200)
}

function extractImageUrl(img: unknown): string | null {
  if (!img) return null
  if (typeof img === 'string') return img || null
  if (typeof img === 'object') {
    const o = img as Record<string, unknown>
    const url = String(o.filename ?? o.url ?? o.src ?? '')
    return url || null
  }
  return null
}
