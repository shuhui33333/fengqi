/**
 * src/lib/storyblok.ts
 * Storyblok Content Delivery API — Insights.
 *
 * Cloudflare Secret : storyblock  (do NOT rename)
 * Content path      : insights/*
 *
 * Content type fields (exact Storyblok names → API lowercase keys):
 *   Title       Text          → c.title
 *   Date        Date/Time     → c.date
 *   Summary     Textarea      → c.summary
 *   CoverImage  Asset         → c.coverimage  (Storyblok lowercases field names)
 *   Richtext    Richtext      → c.richtext
 *   Category    Single-Option → c.category
 *
 * "Category" field setup (added manually in the Storyblok backend):
 *   Field name : Category
 *   Field type : Single-Option (or Text) — the exact stored VALUE must be
 *                one of the slugs below (lowercase, hyphenated). The display
 *                label shown to editors in Storyblok can be anything
 *                ("Official News" etc.) — only the option VALUE matters here.
 *     official     → Official News   / 官方新闻
 *     media        → Media Coverage  / 媒体报道
 *     arff-china   → ARFF China      / ARFF中国区
 *   Entries with a missing/unrecognized Category still show up under "All"
 *   but are excluded from every category-specific listing.
 *
 * Nested folders: articles do NOT need to live directly under insights/.
 * If an editor drops a story into insights/media-coverage/2026-... instead
 * of flat under insights/, everything below still resolves it correctly —
 * `slug` on InsightEntry is always the FULL path after "insights/", derived
 * from Storyblok's `full_slug`, not the single-segment `slug` field.
 *
 * Environments:
 *   Production deploy  → version=published
 *   Preview deploy     → version=draft  (auto-detected via import.meta.env.MODE)
 */

const TOKEN   = (import.meta.env.storyblock ?? '') as string
const BASE    = 'https://api.storyblok.com/v2/cdn'
const VERSION = (import.meta.env.MODE === 'production' ? 'published' : 'draft') as 'published' | 'draft'
const CV      = Date.now()

// ── Categories ──────────────────────────────────────────────────────────────

/** Stored Storyblok option values — must match the "Category" field exactly. */
export type InsightCategory = 'official' | 'media' | 'arff-china'

const VALID_CATEGORIES: readonly InsightCategory[] = ['official', 'media', 'arff-china']

function normalizeCategory(raw: unknown): InsightCategory | null {
  const v = String(raw ?? '').trim().toLowerCase()
  return (VALID_CATEGORIES as readonly string[]).includes(v) ? (v as InsightCategory) : null
}

// ── Public types ────────────────────────────────────────────────────────────

export interface InsightEntry {
  slug:     string   // full path after "insights/" — may contain "/" if the story lives in a subfolder
  title:    string
  date:     Date
  summary:  string
  image:    string | null    // CoverImage URL or null → caller supplies default
  body:     SBRichText
  category: InsightCategory | null
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
  full_slug:    string   // e.g. "insights/media-coverage/20260124" — includes any nested folder
  published_at: string | null
  first_published_at: string | null
  content:      Record<string, unknown>
}

// ── Fetch API ───────────────────────────────────────────────────────────────

/** All stories in insights/, newest-first. Paginates through every Storyblok
 *  page so there is no 100-article cap. Pass a `category` to filter server-side
 *  (Official News / Media Coverage / ARFF China). Returns [] on any error. */
export async function getAllInsights(category?: InsightCategory): Promise<InsightEntry[]> {
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
        category ? `&filter_query[category][in]=${encodeURIComponent(category)}` : '',
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

    console.log(`[storyblok] getAllInsights(${category ?? 'all'}) → ${all.length} stories:`, all.map(s => s.full_slug))

    return all.map(mapStory)
  } catch (err) {
    console.error('[storyblok] getAllInsights fetch failed:', err)
    return []
  }
}

/** Single story by slug (the full path after insights/, "/" and all —
 *  matches InsightEntry.slug). Returns null if not found. */
export async function getInsightBySlug(slug: string): Promise<InsightEntry | null> {
  if (!TOKEN) return null

  // Defensive cleanup: strip any leading/trailing slashes and an accidental
  // "insights/" prefix if the caller already included it, then re-encode
  // each path segment individually (encodeURIComponent would otherwise
  // escape the "/" between segments, which breaks the nested path).
  const cleanSlug = slug
    .replace(/^\/+/, '')
    .replace(/^insights\//, '')
    .replace(/\/+$/, '')
  const encodedSlug = cleanSlug.split('/').map(encodeURIComponent).join('/')
  const storyPath = `insights/${encodedSlug}`

  const url = `${BASE}/stories/${storyPath}?token=${TOKEN}&version=${VERSION}&cv=${CV}`

  // DEBUG — remove once nested-slug routing is confirmed working in prod.
  console.log('[storyblok] getInsightBySlug fetching:', storyPath)

  try {
    const res = await fetch(url)
    console.log('[storyblok] getInsightBySlug response:', res.status, res.statusText, 'for', storyPath)
    if (!res.ok) {
      console.error('[storyblok] getInsightBySlug failed:', storyPath, res.status, await res.text().catch(() => ''))
      return null
    }
    const data = await res.json() as { story?: SBStory }
    return data.story ? mapStory(data.story) : null
  } catch (err) {
    console.error('[storyblok] getInsightBySlug fetch threw:', storyPath, err)
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

  // Category — single-option field; see header comment for valid values
  const category = normalizeCategory(c.category ?? c.Category)

  // Slug — use the FULL path after "insights/", not just the last segment.
  // If an editor organizes articles into Storyblok subfolders
  // (e.g. insights/media-coverage/20260124), story.slug would only be
  // "20260124", which breaks routing and the Storyblok lookup below once an
  // article isn't at the top level. full_slug always carries the complete
  // path, so this works whether content is flat or nested.
  const slug = story.full_slug.replace(/^insights\//, '')

  return { slug, title, date, summary, image, body, category }
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
