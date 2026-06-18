/**
 * src/lib/storyblok.ts
 * Storyblok Content Delivery API — Insights.
 *
 * Cloudflare Secret : storyblock  (do NOT rename)
 * Content path      : insights/*
 *
 * Content type fields (exact Storyblok names → API lowercase keys):
 *   Title       Text        → c.title
 *   Date        Date/Time   → c.date
 *   Summary     Textarea    → c.summary
 *   CoverImage  Asset       → c.coverimage  (Storyblok lowercases field names)
 *   Richtext    Richtext    → c.richtext
 *
 * Environments:
 *   Production deploy  → version=published
 *   Preview deploy     → version=draft  (auto-detected via import.meta.env.MODE)
 */

const TOKEN   = (import.meta.env.storyblock ?? '') as string
const BASE    = 'https://api.storyblok.com/v2/cdn'
const VERSION = (import.meta.env.MODE === 'production' ? 'published' : 'draft') as 'published' | 'draft'
const CV      = Date.now()

// ── Public types ────────────────────────────────────────────────────────────

export interface InsightEntry {
  slug:     string
  title:    string
  date:     Date
  summary:  string
  image:    string | null    // CoverImage URL or null → caller supplies default
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

// Aliases used by RichText.astro
export type StoryblokNode = SBNode
export type StoryblokRichText = SBRichText

interface SBStory {
  slug:         string
  published_at: string | null
  first_published_at: string | null
  content:      Record<string, unknown>
}

// ── Fetch API ───────────────────────────────────────────────────────────────

/** All stories in insights/, newest-first. Paginates through every Storyblok
 *  page so there is no 100-article cap. Returns [] on any error. */
export async function getAllInsights(): Promise<InsightEntry[]> {
  if (!TOKEN) {
    console.warn('[storyblok] Secret "storyblock" is missing — returning empty array')
    return []
  }

  const PER_PAGE = 100
  const all: SBStory[] = []

  try {
    let page = 1
    // Safety cap of 50 pages (5,000 articles) to avoid runaway loops
    while (page <= 50) {
      const url = [
        `${BASE}/stories`,
        `?token=${TOKEN}`,
        `&starts_with=insights/`,
        `&version=${VERSION}`,
        `&sort_by=content.date:desc`,
        `&per_page=${PER_PAGE}`,
        `&page=${page}`,
        `&cv=${CV}`,
      ].join('')

      const res = await fetch(url)
      if (!res.ok) {
        console.error(`[storyblok] getAllInsights page ${page} → ${res.status} ${res.statusText}`)
        break
      }

      const data = await res.json() as { stories?: SBStory[] }
      const batch = data.stories ?? []
      all.push(...batch)

      // Storyblok exposes the grand total via the "total" response header.
      const total = Number(res.headers.get('total') ?? '0')
      if (batch.length < PER_PAGE || (total > 0 && all.length >= total)) break
      page++
    }

    return all.map(mapStory)
  } catch (err) {
    console.error('[storyblok] getAllInsights fetch failed:', err)
    return []
  }
}

/** Single story by slug (the part after insights/). Returns null if not found. */
export async function getInsightBySlug(slug: string): Promise<InsightEntry | null> {
  if (!TOKEN) return null
  const url = `${BASE}/stories/insights/${slug}?token=${TOKEN}&version=${VERSION}&cv=${CV}`
  try {
    const res  = await fetch(url)
    if (!res.ok) return null
    const data = await res.json() as { story?: SBStory }
    return data.story ? mapStory(data.story) : null
  } catch {
    return null
  }
}

/** All slugs — used in getStaticPaths. */
export async function getAllInsightSlugs(): Promise<string[]> {
  return (await getAllInsights()).map(i => i.slug)
}

// ── Field mapper ────────────────────────────────────────────────────────────
//
// Storyblok lowercases ALL field names in the CDN response.
// Content type fields → API keys:
//   Title       → c.title
//   Date        → c.date
//   Summary     → c.summary
//   CoverImage  → c.coverimage
//   Richtext    → c.richtext
//
function mapStory(story: SBStory): InsightEntry {
  const c = story.content

  const title   = String(c.title   ?? c.Title   ?? '')
  const summary = String(c.summary ?? c.Summary ?? '')

  // Date — prefer field value, fall back to first_published_at then published_at
  const rawDate = String(
    c.date ?? c.Date ??
    story.first_published_at ??
    story.published_at ??
    new Date().toISOString()
  )
  const date = new Date(rawDate)

  // CoverImage — Storyblok Asset object has { filename, alt, … }
  const image = extractImageUrl(c.coverimage ?? c.CoverImage ?? c.image ?? c.Image)

  // Richtext — the article body
  const body: SBRichText = (c.richtext ?? c.Richtext ?? c.body ?? c.Body) as SBRichText
    ?? { type: 'doc', content: [] }

  return { slug: story.slug, title, date, summary, image, body }
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
