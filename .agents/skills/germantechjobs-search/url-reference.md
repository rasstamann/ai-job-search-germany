# GermanTechJobs — Data Source Reference

## Investigation summary (2026-07-12)

GermanTechJobs (germantechjobs.de) is one of a family of sibling job boards run on the
same platform (swissdevjobs.ch, devitjobs.fr/nl/uk/com) — visible from shared host
prefixes in the site's JS bundle (`jobapp.*`, `talentportal.*`, `static.*`).

### Search page — not scrapeable

- `https://www.germantechjobs.de/jobs/<Role>/<City>` (e.g. `/jobs/Embedded/Munich`)
  redirects (301, Cloudflare) to `https://germantechjobs.de/jobs/<Role>/<City>`.
- The response is a React SPA shell (~4.7KB HTML, `<div id="root">` with no job markup).
  Job results are rendered client-side after the bundle (`/static/js/main.*.js`) runs —
  no SSR, nothing to parse from a plain HTTP fetch.
- No `window.__PRELOADED_STATE__` or similar inline hydration payload was found in the
  initial HTML.

### Legacy REST endpoint — deprecated

- `GET https://germantechjobs.de/api/jobs` returns the literal text:
  `"ENDPOINT Deprecated - contact hello@swissdevjobs.ch if you are using it"`.
- Every other `/api/*` path tried (`/api/v1/jobs`, `/api/search`, `/api/jobs/search`, etc.)
  falls through to the SPA catch-all route (200, same HTML shell) — not a real API.
- The `jobapp.germantechjobs.de` subdomain is a separate product (the employer-facing
  "CompanyApp" for posting jobs), not a search API.

### RSS feed — the data source used

- `GET https://germantechjobs.de/rss` → `200`, `application/rss+xml` (actually served
  without an explicit content-type override; ~9MB body).
- No query parameters — always returns the full, current, sitewide list of live postings
  (all of Germany, all roles). Linked from the SPA's `<link rel="alternate" ...>` tag.
- Structure: standard RSS 2.0. One `<item>` per posting:
  - `<title>` — `<![CDATA[<Job Title> @ <Company> [<Salary Range> €]]]>`. Some titles
    embed a city before the `@`, e.g. `"... - Trier @ Company [...]"`, but this is
    inconsistent and not present on most postings.
  - `<link>` / `<guid isPermaLink="false">` — both `https://germantechjobs.de/jobs/<slug>?utm_source=...&utm_medium=...`.
    The **slug** (path segment after `/jobs/`, before the query string) is used as the
    stable job id — there is no separate numeric id in the feed.
  - `<pubDate>` — RFC 822 date, used for `--jobage` filtering.
  - `<content:encoded>` (CDATA HTML) — the full rich description:
    - `<p><b>Salary: ... per year</b></p>`
    - `<b>Requirements:</b><ul><li>...</li>...</ul>`
    - `<b>Responsibilities:</b><ul><li>...</li>...</ul>`
    - `<b>Technologies:</b><ul><li>...</li>...</ul>`
    - `<p><b>More:</b></p><p>free-text company/role blurb, often names the city</p>`
  - `<enclosure url="https://static.germantechjobs.de/social-media-images/....png" .../>` —
    a generic social-share image, not job-specific artwork; not used.

### Detail — no separate endpoint

There is no separate single-job page worth fetching (`https://germantechjobs.de/jobs/<slug>`
is the same SPA shell as the search page — CSR only). The `detail` command instead
re-fetches the RSS feed and finds the item whose slug matches, since the feed item already
contains everything a detail page would show.

### Access rules

- `robots.txt` (`https://germantechjobs.de/robots.txt`): disallows only
  `/apply-for-this-role-by-clicking-here/`, various build-artifact extensions
  (`*.gz`, `*.php`, `*.bak`, `*.sql`, `*.env`, `*.ini`), `/wp-content/`, `/admin/`,
  `/fontsv1/`, `/mapv2/`. **`/rss` and `/jobs/*` are not disallowed.** A separate
  `User-agent: Meta-ExternalAgent` block disallows `/api/` for that agent only.
- No login/authentication required to read the feed or any job page.
- No explicit ToS restriction found against automated feed consumption; kept volume low
  during investigation (a handful of requests) and the CLI re-fetches the full feed on
  every call, so callers should not run it in a tight loop.
