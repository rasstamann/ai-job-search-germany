---
name: xing-search
version: 1.0.0
description: >
  Use this skill to search live job listings on XING, Germany's leading
  professional network and job board (jobs.xing.com). Covers Germany, Austria,
  and Switzerland (DACH region) in German or English. Trigger phrases: XING
  jobs, Xing Jobsuche, Stellenangebote, offene Stellen, Jobsuche, find a job on
  Xing, search Xing jobs, "gibt es Jobs für X in <Ort>".
context: fork
allowed-tools: Bash(bun run .agents/skills/xing-search/cli/src/cli.ts *)
---

# XING Search Skill

Search live job listings from XING's public job-search pages
(`xing.com/jobs/search/ki`) for the DACH region (Germany, Austria, Switzerland).
No authentication, no API key, and **zero runtime dependencies** — it runs with
just `bun`.

> This follows the repo's country-agnostic job-portal-skill pattern
> (see `linkedin-search` for the canonical example), scaffolded specifically
> for the German-language XING market.

## ⚠️ Personal use only

XING's `robots.txt` disallows `/jobs/search` for generic crawlers (`User-agent: *`),
but carries an explicit `Allow: /jobs/search/` exception for `ClaudeBot`,
`GPTBot`, and `PerplexityBot`. This CLI identifies itself with a standard
browser User-Agent rather than spoofing those bot identities, so it falls
under the generic rule. Treat this as a grey area: **keep request volume low,
never use it commercially or for bulk data collection, and run it on your own
responsibility.**

## When to use this skill

- Search for job openings on XING in a given German/Austrian/Swiss city or region
- Filter by search radius around a location
- Get the full description of a specific job listing

## Commands

### Search job listings

```bash
bun run .agents/skills/xing-search/cli/src/cli.ts search --query "<keywords>" --location "<place>" [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords (job title, skill, role), e.g. `"Software Engineer C++"`.
- `--location <text>` / `-l <text>` — a city or region, e.g. `"München"`, `"Berlin"`.
- `--radius <km>` — search radius in kilometers around `--location` (e.g. `25`, `50`, `100`). Omit to search the exact location only.
- `--page <n>` — page number (1-indexed, 20 results/page). Default 1.
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.
- `--jobage <days>` is **not supported** by XING's search page — no query parameter was found for posting-age filtering (see `url-reference.md`). Passing it is a no-op.

### Fetch full job detail

```bash
bun run .agents/skills/xing-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

Prefer passing the full XING `xing.com/jobs/<slug>-<id>` URL from a `search`
result — confirmed live, XING requires the exact stored slug and 404/410s any
other slug for that id, so a bare numeric ID (e.g. `156013338`) is fetched via
a guessed `/jobs/job-<id>` URL that reliably fails. Returns the full
description, employment type, seniority level, publication date, and
locations.

## Usage examples

```bash
# Software Engineer C++ roles in München, 50km radius
bun run .agents/skills/xing-search/cli/src/cli.ts search -q "Software Engineer C++" -l "München" --radius 50 --format table

# Computer Vision roles in München
bun run .agents/skills/xing-search/cli/src/cli.ts search -q "Computer Vision Engineer" -l "München" --format table

# Embedded systems roles, wider radius
bun run .agents/skills/xing-search/cli/src/cli.ts search -q "Embedded Software Engineer" -l "München" --radius 100 --format table

# Second page of results
bun run .agents/skills/xing-search/cli/src/cli.ts search -q "C++ Entwickler" -l "München" --page 2 --format table

# Full details for a specific job (use the full URL from a search result)
bun run .agents/skills/xing-search/cli/src/cli.ts detail "https://www.xing.com/jobs/muenchen-senior-software-engineer-medical-imaging-156192753" --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Data is scraped from XING's server-rendered `/jobs/search/ki` results page and
  individual `/jobs/<slug>-<id>` detail pages — no credentials required.
- Page size is fixed at 20 results per page.
- Job postings are frequently multi-location (one listing spanning several
  cities); `search` and `detail` join all listed locations with `, `.
- XING's "Einfach bewerben" (Easy Apply) button is JS-driven with no direct
  external apply URL — `applyUrl` in `detail` output is always `null`; the job's
  own URL is the place to apply.
- No posting-age filter parameter exists on the search page (unlike LinkedIn's
  `f_TPR`); `--jobage` is accepted for interface consistency but has no effect.
- XING may rate-limit; the CLI retries 429/5xx with exponential backoff. Keep
  volume low (see ToS note above).
