# xing-cli

CLI for searching jobs on XING's public job-search pages, covering **Germany,
Austria, and Switzerland** (DACH region).

**Data source**: XING's server-rendered `/jobs/search/ki` results page and `/jobs/<slug>-<id>` detail pages.
**Authentication**: None required.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only pulls dev type defs.

> **Personal use only.** XING's `robots.txt` disallows `/jobs/search` for
> generic crawlers, with an explicit exception for named AI-bot user agents
> this CLI does not claim to be. Treat this as a grey area: keep volume low,
> don't use it commercially or for bulk data collection, and run it on your
> own responsibility.

## Installation

```bash
cd .agents/skills/xing-search/cli
bun install   # optional — only installs TypeScript dev types
```

The CLI runs without any install because it has zero runtime dependencies.

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search for job listings |
| `detail` | Fetch full detail for a single job listing |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts `--format json|plain`.
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Quick examples

```bash
# Software Engineer C++ roles in München, 50km radius
bun run src/cli.ts search -q "Software Engineer C++" -l "München" --radius 50 --format table

# Computer Vision roles in München
bun run src/cli.ts search -q "Computer Vision Engineer" -l "München" --format table

# Second page of results
bun run src/cli.ts search -q "C++ Entwickler" -l "München" --page 2 --format table

# Full detail for one job
bun run src/cli.ts detail 156013338 --format plain
```

See `../SKILL.md` for the full flag reference and the robots.txt note.

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--query` | `-q` | Keywords (title / skill / role), e.g. `"Software Engineer C++"`. |
| `--location` | `-l` | City or region, e.g. `"München"`, `"Berlin"`. |
| `--radius` | | Search radius in km around `--location`. Omit for exact location only. |
| `--page` | | 1-indexed page (20 results/page). |
| `--limit` | `-n` | Cap results emitted. |
| `--format` | | `json` \| `table` \| `plain`. |
| `--jobage` | | Not supported by XING's search page — accepted but ignored. |
