# XING Jobs URL Reference

Public, unauthenticated, server-rendered pages used by this skill.

> Personal use only — see the robots.txt note in `SKILL.md`. Keep volume low.

## robots.txt (as of 2026-07-11)

`https://www.xing.com/robots.txt` disallows `/jobs/search` and `/jobs/search?*`
for `User-agent: *`, but has an explicit block allowing `ClaudeBot`, `Claude-User`,
`GPTBot`, `GPTUser`, `PerplexityBot`, and `Perplexity-User` to access
`/jobs/search/` and `/jobs/search?*`. This CLI uses a standard browser
User-Agent (not one of the listed bot identities), so it is technically bound
by the generic `Disallow`. Documented here for future maintainers; the
personal-use warning in `SKILL.md` reflects this.

## Search

```
GET https://www.xing.com/jobs/search/ki
```

Requesting `https://www.xing.com/jobs/search?keywords=...&location=...` (no `/ki`)
returns a `301` redirect to the `/ki` path with the same query string preserved.

Query params:

| Param | Meaning | Example |
|-------|---------|---------|
| `keywords` | Free-text query | `Software Engineer C++` |
| `location` | City/region name | `München`, `Berlin` |
| `radius` | Search radius in km around `location` | `25`, `50`, `100` (omit = exact location only) |
| `page` | 1-indexed page number | `1`, `2`, … (20 results/page) |

No parameter for posting-age/recency was found. The rendered page includes a
"Veröffentlicht" (published) filter with UI tags (24h / 7 days / etc.), but
those are applied via client-side GraphQL state (`/graphql/`, which robots.txt
disallows for everyone) rather than a URL query parameter — confirmed by
testing `sinceDays`, `age`, `publishedSince`, `days`, and `recency` params,
none of which changed the embedded `filterCollection` state or result set.

The response is a full HTML page (React SSR, `noindex, follow` meta robots tag)
with 20 job cards server-rendered into the markup — no separate JSON API call
is needed to get initial results.

### Result card anchors

Each result is wrapped in an element carrying `data-testid="job-search-result"`.
Splitting the HTML on that exact string yields one chunk per card (bounded by
the next occurrence). Within a chunk:

| Field | Anchor |
|-------|--------|
| id + url | `<a href="/jobs/<slug>-<id>" ... aria-label="<title>" ...>` — id is the trailing digit run in the href |
| title | `data-testid="job-teaser-list-title"` — text of the `<h2>` |
| company | first `<p ... data-xds="BodyCopy">` following the title `<h2>` |
| location(s) | inside the `multi-location-display-styles__Container...` block, first `<p ... data-xds="BodyCopy">` — comma-joined `<span>` city names, with a trailing `<b>...weitere</b>` ("+N more") tag to strip |
| date | `<time dateTime="ISO-8601">` inside the card |
| employment type / salary | `job-teaser-facts__MarkerContainer` block, plain text spans (e.g. `Vollzeit`, `62.000 € – 85.000 €`) — informational, not required by the portal-skill contract |

Class names using `styled-components` hashes (e.g. `card-styles__Card-sc-852940f4-0`)
are **not stable** across XING deployments and are deliberately avoided as anchors
in favor of `data-testid` / `data-xds` attributes, which are semantic and far
less likely to change.

## Detail

```
GET https://www.xing.com/jobs/<slug>-<id>
```

`id` is the numeric ID from search results. `slug` was assumed to be
arbitrary ("XING resolves by ID") but **live testing during verification
(2026-07-12) disproved this**: XING requires the exact stored slug for that
id — a guessed or generic slug (e.g. `job-<id>`, or even a plausible but
wrong slug) returns `410 Gone`; only a bare `/jobs/<id>` with no slug at all
returns `200`, but that serves a search-results fallback page, not the job
detail page. There is no known way to construct a working detail URL from
the id alone — always use the full `url` field from a `search` result.

| Field | Anchor |
|-------|--------|
| title | `data-testid="job-details-title"` — text of the inner `<h1>` |
| company | `data-testid="job-details-company-info-name"` — text of the `<p>` |
| locations | the page `<title>` tag: `"<title> in <locations> \| XING Jobs"` — split on `" in "` / `" \| XING Jobs"` (more reliable than the header, which does not repeat job locations) |
| date | `data-testid="job-details-published-date"` — `<time dateTime="ISO-8601">` |
| description | `data-testid="expandable-content"` — rich HTML block; strip tags, keep paragraph breaks |
| employment type | `<meta name="description">` content — `Beschäftigungsart: <value>` segment |
| seniority | `<meta name="description">` content — `Karriere-Stufe: <value>` segment |
| apply URL | none — "Einfach bewerben" (Easy Apply) is a JS-driven in-app action with no external href; `detail` returns `applyUrl: null` and the job's own URL doubles as the place to apply |

## Notes

- No authentication required for search or detail pages.
- Respect rate limits — the CLI backs off on 429/5xx.
- Job postings are frequently multi-location; treat `location` as a
  comma-joined list, not a single city.
- If XING's markup changes and result counts drop to zero, re-fetch a live
  search page and check whether `data-testid="job-search-result"`,
  `job-teaser-list-title`, or the `multi-location-display-styles__Container`
  class prefix have changed.
