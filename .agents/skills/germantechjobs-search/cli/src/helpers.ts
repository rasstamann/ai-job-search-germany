// Data source: GermanTechJobs' public sitewide RSS feed (https://germantechjobs.de/rss).
// The site itself is a React SPA with no server-rendered search results and no public
// search API (the old /api/jobs endpoint is deprecated), but the RSS feed lists every
// live posting with a rich HTML description (salary, requirements, responsibilities,
// tech stack) embedded per item. There is no query/location/page parameter on the feed
// itself, so search, location, and posting-age filtering all happen client-side after a
// single fetch of the full feed.

export const RSS_URL = "https://germantechjobs.de/rss"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** Fetch text with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function textFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
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
    if (response.status === 404) return ""
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
  salary: string | null
}

export interface JobDetail extends JobCard {
  description: string | null
  requirements: string[]
  responsibilities: string[]
  technologies: string[]
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
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

function cdata(raw: string): string {
  const m = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  return decodeHtmlEntities((m ? m[1] : raw).trim())
}

/** "<Job Title> @ <Company> [<Salary>]" -> parts. Falls back to the raw title if malformed. */
function parseTitle(rawTitle: string): { title: string; company: string | null; salary: string | null } {
  const m = rawTitle.match(/^(.*?)\s@\s(.*?)\s\[(.*?)\]\s*$/)
  if (!m) return { title: rawTitle, company: null, salary: null }
  return { title: m[1].trim(), company: m[2].trim(), salary: m[3].trim() || null }
}

/** Job id = the URL slug under /jobs/, e.g. "Bayerische-Versorgungskammer-SAP-Basis-Administrator-mwd". */
export function idFromUrl(url: string): string | null {
  const m = url.match(/\/jobs\/([^/?]+)/)
  return m ? m[1] : null
}

interface RawItem {
  title: string
  link: string
  pubDate: string
  descriptionHtml: string
}

function parseItems(xml: string): RawItem[] {
  const items: RawItem[] = []
  const chunks = xml.split(/<item>/).slice(1)
  for (const chunk of chunks) {
    const body = chunk.split(/<\/item>/)[0]
    const titleM = body.match(/<title>([\s\S]*?)<\/title>/)
    const linkM = body.match(/<link>([\s\S]*?)<\/link>/)
    const pubM = body.match(/<pubDate>([\s\S]*?)<\/pubDate>/)
    const descM = body.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/) || body.match(/<description>([\s\S]*?)<\/description>/)
    if (!titleM || !linkM) continue
    items.push({
      title: cdata(titleM[1]),
      link: decodeHtmlEntities(linkM[1].trim()).split("?")[0],
      pubDate: pubM ? pubM[1].trim() : "",
      descriptionHtml: descM ? cdata(descM[1]) : "",
    })
  }
  return items
}

function extractList(html: string, label: string): string[] {
  const re = new RegExp(`<b>${label}:?<\\/b>\\s*<ul>([\\s\\S]*?)<\\/ul>`, "i")
  const m = html.match(re)
  if (!m) return []
  const items: string[] = []
  const liRe = /<li>([\s\S]*?)<\/li>/g
  let lm: RegExpExecArray | null
  while ((lm = liRe.exec(m[1])) !== null) {
    const text = clean(lm[1])
    if (text) items.push(text)
  }
  return items
}

export function toJobCard(item: RawItem): JobCard {
  const { title, company, salary } = parseTitle(item.title)
  const id = idFromUrl(item.link) ?? item.link
  return {
    id,
    title,
    company,
    location: null,
    date: item.pubDate || null,
    url: item.link,
    salary,
  }
}

export function toJobDetail(item: RawItem): JobDetail {
  const card = toJobCard(item)
  const withBreaks = item.descriptionHtml
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const description = decodeHtmlEntities(stripTags(withBreaks)).replace(/\n{3,}/g, "\n\n").trim() || null
  return {
    ...card,
    description,
    requirements: extractList(item.descriptionHtml, "Requirements"),
    responsibilities: extractList(item.descriptionHtml, "Responsibilities"),
    technologies: extractList(item.descriptionHtml, "Technologies"),
  }
}

/** Fetch and parse the full feed once. ~9MB / several thousand postings sitewide (all of Germany). */
export async function fetchFeed(): Promise<RawItem[]> {
  const xml = await textFetch(RSS_URL)
  return parseItems(xml)
}

/** True if every whitespace-separated term in `query` appears in `text` (case-insensitive). */
export function matchesAllTerms(text: string, query: string): boolean {
  const haystack = text.toLowerCase()
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term.toLowerCase()))
}

/** Days between an RFC-822 pubDate and now. Returns Infinity if unparseable. */
export function daysSince(pubDate: string): number {
  const t = Date.parse(pubDate)
  if (isNaN(t)) return Infinity
  return (Date.now() - t) / 86400000
}
