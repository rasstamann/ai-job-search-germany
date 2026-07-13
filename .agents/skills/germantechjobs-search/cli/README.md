# germantechjobs-cli

CLI for searching [GermanTechJobs](https://germantechjobs.de) — a transparent IT/tech job
board covering Germany with mandatory salary and tech-stack info. Zero runtime dependencies:
just `bun` and the built-in `fetch`.

## Why RSS, not the site's search page

GermanTechJobs' search pages (`/jobs/<role>/<city>`) are a client-rendered React SPA — the
server response is an empty shell with no job data, and there's no public search API (the
legacy `/api/jobs` endpoint returns "Deprecated"). The site does publish a sitewide RSS feed
(`/rss`) listing every live posting with a rich HTML description per item (salary,
requirements, responsibilities, tech stack). That feed is this CLI's only data source.

The feed has no query parameters — it's the same ~9MB, several-thousand-item, all-of-Germany
list every time. `search` fetches it once per invocation and filters client-side by keyword,
description-text location match, and posting age.

## Install

```bash
bun install
```

## Usage

```bash
bun run src/cli.ts search -q "embedded" -l "München" --format table
bun run src/cli.ts detail <id|url> --format plain
```

See `../SKILL.md` for the full flag reference and examples.

## Test

```bash
bun run typecheck
bun run test
```
