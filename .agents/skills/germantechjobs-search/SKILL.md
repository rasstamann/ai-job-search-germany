---
name: germantechjobs-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for IT/tech job listings on
  GermanTechJobs (germantechjobs.de), a transparent job board covering Germany with
  mandatory salary and tech-stack info per posting. Trigger phrases: GermanTechJobs,
  german tech jobs, IT-Jobs Deutschland, Stellenangebote IT, Softwareentwickler Job,
  Tech-Jobs mit Gehalt, find jobs on germantechjobs, tech job with salary Germany.
context: fork
allowed-tools: Bash(bun run .agents/skills/germantechjobs-search/cli/src/cli.ts *)
---

# GermanTechJobs Search Skill

Search live job listings from [GermanTechJobs](https://germantechjobs.de), a tech/IT job
board covering Germany that requires every posting to disclose a salary range and tech
stack. No authentication, no API key, **zero runtime dependencies** — it runs with just
`bun`.

## Why this skill works the way it does

GermanTechJobs' search pages (`/jobs/<role>/<city>`) are a client-rendered React SPA with
no server-side HTML for job results, and the legacy `/api/jobs` REST endpoint now returns
`"Deprecated"`. The only public, scrapeable data source is the site's **sitewide RSS feed**
(`https://germantechjobs.de/rss`) — it lists every live posting for all of Germany with a
rich HTML description per item (salary, requirements, responsibilities, technologies). The
feed has no query parameters, so `search` fetches the full feed once per call and filters
client-side by keyword, description-text location match, and posting age.

## When to use this skill

- Search for German tech/IT job openings by keyword (role, skill, technology)
- Filter by a city/region mentioned in the posting text (best-effort — see Notes)
- Filter by recency (posted within N days)
- Get the full description (salary, requirements, responsibilities, tech stack) of a
  specific listing

## Commands

### Search job listings

```bash
bun run .agents/skills/germantechjobs-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (title, skill, role). Matched against
  title + full description text, all terms must appear (AND).
- `--location <text>` / `-l <text>` — text match against the posting **description**
  (e.g. `"München"`). There is no structured location field in the feed — see Notes.
- `--jobage <days>` — posted within N days. Omit for all postings.
- `--page <n>` — page number (1-indexed, 20 results/page, applied client-side after
  filtering the full feed).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/germantechjobs-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the job slug from `search` results (e.g.
`KNDS-Deutschland-Mission-Electronics-Senior-Software-Entwickler-mwd`), or a full
`germantechjobs.de/jobs/...` URL. Returns the full description plus parsed
`requirements`, `responsibilities`, and `technologies` lists.

## Usage examples

```bash
# C++/embedded roles, filtered to postings mentioning München in the description
bun run .agents/skills/germantechjobs-search/cli/src/cli.ts search -q "C++" -l "München" --format table

# Computer vision / robotics roles anywhere in Germany, last 30 days
bun run .agents/skills/germantechjobs-search/cli/src/cli.ts search -q "computer vision" --jobage 30 --format table

# Any tech role mentioning Munich
bun run .agents/skills/germantechjobs-search/cli/src/cli.ts search -l "Munich" --format table

# Full details for a specific listing
bun run .agents/skills/germantechjobs-search/cli/src/cli.ts detail KNDS-Deutschland-Mission-Electronics-Senior-Software-Entwickler-mwd --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process
exits with code `1`.

## Notes

- Data source: `germantechjobs.de/rss`, a public sitewide feed, no credentials required.
  robots.txt does not disallow `/rss` or `/jobs/*` — only admin/build-artifact paths.
- The feed has **no location field** — `location` in results is always `null`. Some titles
  embed a city (e.g. `"... - Trier @ Company [...]"`) but most don't, so `--location` falls
  back to a text search over the posting's description, the same pattern `jobindex-search`
  uses when a portal doesn't expose location as a real parameter. Combine `--query` and
  `--location` for best precision, or just fold the city into `--query`.
- The feed covers **all of Germany**, not just München — always pass `--location` (or fold
  the city into `--query`) to narrow results, otherwise you'll get sitewide noise.
- The feed is ~9MB and re-fetched on every `search`/`detail` call (no server-side query
  params exist to fetch less). Keep call volume reasonable.
- Job IDs are URL slugs (e.g. `Bayerische-Versorgungskammer-SAP-Basis-Administrator-mwd`),
  not numeric — pass them as-is to `detail`.
- No posting-age parameter exists upstream; `--jobage` is applied client-side from each
  item's `pubDate`.
