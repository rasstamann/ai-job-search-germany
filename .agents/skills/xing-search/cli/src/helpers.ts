// Data source: XING's public, server-rendered /jobs/search/ki results page and
// /jobs/<slug>-<id> detail pages. No authentication required. We parse both
// with regex anchored on data-testid/data-xds attributes rather than
// styled-components class hashes, which are not stable across deployments.

export const SEARCH_URL = "https://www.xing.com/jobs/search/ki"
export const DETAIL_BASE_URL = "https://www.xing.com/jobs"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** Fetch HTML with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    // 404 (unknown id) and 410 (expired posting, or — confirmed by live
    // testing — a /jobs/<slug>-<id> request whose slug doesn't exactly match
    // XING's stored slug for that id) both mean "nothing to show here".
    if (response.status === 404 || response.status === 410) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  employmentType: string | null
  salary: string | null
}

export interface JobDetail {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  description: string | null
  employmentType: string | null
  seniority: string | null
  applyUrl: string | null
}

/**
 * Convert a Unicode code point to a string. Uses `fromCodePoint` (not
 * `fromCharCode`) so supplementary-plane code points (e.g. emoji, U+1F600)
 * decode correctly, and drops out-of-range values instead of throwing.
 */
function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    // Numeric character references: decimal (&#233;) and hexadecimal (&#xE9;).
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function clean(html: string): string {
  return decodeHtmlEntities(stripTags(html))
}

/**
 * Parse the search response: XING server-renders each result inside an
 * element carrying data-testid="job-search-result". Splitting on that exact
 * marker bounds each chunk between consecutive cards, so one malformed card
 * cannot break the rest.
 */
export function parseJobCards(html: string): JobCard[] {
  const results: JobCard[] = []
  const chunks = html.split('data-testid="job-search-result"').slice(1)

  for (const chunk of chunks) {
    const linkMatch = chunk.match(
      /<a href="(\/jobs\/[a-z0-9-]*-(\d{6,}))"[^>]*aria-label="([^"]*)"/i,
    )
    if (!linkMatch) continue
    const id = linkMatch[2]
    const url = `https://www.xing.com${decodeHtmlEntities(linkMatch[1])}`

    const titleMatch = chunk.match(/data-testid="job-teaser-list-title"[^>]*>([\s\S]*?)<\/h2>/i)
    const title = titleMatch ? clean(titleMatch[1]) : clean(linkMatch[3])
    if (!title) continue

    const rest = titleMatch ? chunk.slice(titleMatch.index! + titleMatch[0].length) : chunk

    const companyMatch = rest.match(/data-xds="BodyCopy">([\s\S]*?)<\/p>/i)
    const company = companyMatch ? clean(companyMatch[1]) || null : null

    let location: string | null = null
    const locSectionMatch = rest.match(
      /multi-location-display-styles__Container[\s\S]*?data-xds="BodyCopy">([\s\S]*?)<\/p>/i,
    )
    if (locSectionMatch) {
      const withoutOverflow = locSectionMatch[1].replace(/<b[^>]*>[\s\S]*?<\/b>/i, "")
      location = clean(withoutOverflow).replace(/\s*,\s*/g, ", ").replace(/,\s*$/, "") || null
    }

    const dateMatch = rest.match(/<time dateTime="([^"]+)"/i)
    const date = dateMatch ? dateMatch[1] : null

    const factsMatch = rest.match(
      /job-teaser-facts__MarkerContainer[\s\S]*?<\/div><\/div>/i,
    )
    let employmentType: string | null = null
    let salary: string | null = null
    if (factsMatch) {
      const spans = [...factsMatch[0].matchAll(/marker-styles__Text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)].map(
        (m) => clean(m[1]),
      )
      for (const s of spans) {
        if (/€/.test(s)) salary = s
        else if (s) employmentType = s
      }
    }

    results.push({ id, title, company, location, date, url, employmentType, salary })
  }

  return results
}

/** Parse the single-job detail page. */
export function parseJobDetail(html: string, id: string, fallbackUrl: string): JobDetail {
  const titleMatch = html.match(/data-testid="job-details-title"[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const title = titleMatch ? clean(titleMatch[1]) : "(untitled)"

  const companyMatch = html.match(/data-testid="job-details-company-info-name"[^>]*>([\s\S]*?)<\/p>/i)
  const company = companyMatch ? clean(companyMatch[1]) || null : null

  // Locations aren't repeated near the header on the detail page; the <title>
  // tag reliably carries "<title> in <locations> | XING Jobs".
  let location: string | null = null
  const pageTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (pageTitleMatch) {
    const t = decodeHtmlEntities(pageTitleMatch[1])
    const m = t.match(/ in (.+?) \| XING Jobs$/)
    if (m) location = m[1].trim()
  }

  const dateMatch = html.match(/data-testid="job-details-published-date"[\s\S]*?<time dateTime="([^"]+)"/i)
  const date = dateMatch ? dateMatch[1] : null

  let description: string | null = null
  const descMatch = html.match(/data-testid="expandable-content"[^>]*>([\s\S]*?)<\/div>\s*<\/section>/i)
  if (descMatch) {
    const withBreaks = descMatch[1]
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
    description = decodeHtmlEntities(stripTags(withBreaks)).replace(/\n{3,}/g, "\n\n").trim() || null
  }

  const metaMatch = html.match(/<meta data-ch name="description" content="([\s\S]*?)"\/>/i)
  let employmentType: string | null = null
  let seniority: string | null = null
  if (metaMatch) {
    const metaText = decodeHtmlEntities(metaMatch[1])
    const empMatch = metaText.match(/Besch.ftigungsart:\s*([^/]+?)(?:\s*\/|$)/)
    if (empMatch) employmentType = empMatch[1].trim()
    const seniorityMatch = metaText.match(/Karriere-Stufe:\s*([^/]+?)(?:\s*\/|$)/)
    if (seniorityMatch) seniority = seniorityMatch[1].trim()
  }

  return {
    id,
    title,
    company,
    location,
    date,
    url: fallbackUrl,
    description,
    employmentType,
    seniority,
    // XING's "Einfach bewerben" is a JS-driven in-app apply flow with no
    // external href — the job's own URL is where a candidate applies.
    applyUrl: null,
  }
}
