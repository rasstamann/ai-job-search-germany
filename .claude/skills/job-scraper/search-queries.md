# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Search Sites

- **StepStone.de** - Akamai bot-protected (403 on robots.txt, search, and detail pages); no public search API exists (only an employer-side JobFeed API for posting jobs, and a preview-only recruiter Candidate Search API). Staying on Google site-search fallback permanently - do not re-attempt `/add-portal` for this one.
- **Xing.com** - scaffolded and verified via `/add-portal` (2026-07-12). Scrapes the server-rendered `/jobs/search/ki?keywords=&location=&radius=&page=` results page, no auth needed. Detail lookups require the exact slug from a search result (`/jobs/<slug>-<id>`) - a guessed slug returns `410 Gone`. Skill at `.agents/skills/xing-search/`.
- **Indeed.de** - blocked. robots.txt disallows `/jobs`, `/viewjob`, and search paths, and explicitly names ClaudeBot as disallowed. Staying on Google site-search fallback permanently - do not re-attempt `/add-portal` for this one.
- **linkedin.com/jobs** - LinkedIn job listings (filter: Germany / [YOUR_CITY])
- **Google site-search** - fallback general web search across job boards and company career pages until dedicated portal skills exist

## Query Categories

Queries are grouped by priority. Each query should be combined with your location terms (e.g. your city, region, or metro area) where the site supports it.

### Priority 1: [YOUR_PRIMARY_ROLE_TYPE]

These match your strongest and most desired career direction.

```
site:[YOUR_JOB_BOARD] "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_CITY]
site:[YOUR_JOB_BOARD] "[YOUR_KEY_SKILL]" [YOUR_CITY]
site:linkedin.com/jobs "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_COUNTRY]
```

### Priority 2: [YOUR_DOMAIN_EXPERTISE]

These match your domain expertise.

```
site:[YOUR_JOB_BOARD] [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY] OR [YOUR_REGION]
site:[YOUR_JOB_BOARD] [YOUR_DOMAIN_KEYWORD_2] [YOUR_COUNTRY]
site:linkedin.com/jobs [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY] [YOUR_COUNTRY]
```

### Priority 3: [YOUR_ADJACENT_ROLE_TYPE]

Adjacent roles you could pivot into.

```
site:[YOUR_JOB_BOARD] "[YOUR_ADJACENT_TITLE_1]" [YOUR_KEY_SKILL] [YOUR_CITY]
site:[YOUR_JOB_BOARD] "[YOUR_ADJACENT_TITLE_2]" [YOUR_KEY_SKILL] [YOUR_CITY]
```

### Priority 4: Broader Technical / Consulting

Wider net for general technical roles.

```
site:[YOUR_JOB_BOARD] [YOUR_KEY_SKILL] developer [YOUR_CITY]
site:linkedin.com/jobs "[YOUR_KEY_SKILL] developer" [YOUR_CITY]
site:[YOUR_JOB_BOARD] "technical consultant" [YOUR_DOMAIN] [YOUR_CITY]
```

## Location Filter

When evaluating results, verify the job location is within reasonable commute distance from your home. Define acceptable areas:
- [YOUR_CITY] and surrounding areas
- [ACCEPTABLE_AREA_1]
- [ACCEPTABLE_AREA_2]
- [BORDERLINE_AREA] (borderline - ~X min by transit)
- [TOO_FAR_AREA] (too far)

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
