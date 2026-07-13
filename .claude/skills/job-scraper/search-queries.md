# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Search Sites

**Priority: scaffold a dedicated portal skill for Indeed.de via `/add-portal` before relying on Google site-search below.** These are German market job boards and are the primary target for direct scraping, not just query-string fallbacks.

- **StepStone.de** - Akamai bot-protected (403 on robots.txt, search, and detail pages); no public search API exists (only an employer-side JobFeed API for posting jobs, and a preview-only recruiter Candidate Search API). Staying on Google site-search fallback permanently - do not re-attempt `/add-portal` for this one.
- **Xing.com** - scaffolded and verified via `/add-portal` (2026-07-12). Scrapes the server-rendered `/jobs/search/ki?keywords=&location=&radius=&page=` results page, no auth needed. Detail lookups require the exact slug from a search result (`/jobs/<slug>-<id>`) - a guessed slug returns `410 Gone`. Skill at `.agents/skills/xing-search/`.
- **Indeed.de** - to be scaffolded via `/add-portal` (high priority)
- **linkedin.com/jobs** - LinkedIn job listings (filter: Germany / München)
- **Google site-search** - fallback general web search across job boards and company career pages until dedicated portal skills exist

## Query Categories

Queries are grouped by priority. Each query should be combined with your location terms (München, Bavaria, Germany) where the site supports it.

### Priority 1: Software Engineer / C++

These match your strongest and most desired career direction.

```
site:linkedin.com/jobs "Software Engineer" C++ München
site:linkedin.com/jobs "C++ Developer" München
site:stepstone.de "C++ Entwickler" München
site:indeed.de "Software Engineer" C++ München
```

### Priority 2: Computer Vision / Robotics

These match your domain expertise and target career direction.

```
site:linkedin.com/jobs "Computer Vision Engineer" München
site:linkedin.com/jobs "Robotics Engineer" München
site:stepstone.de "Bildverarbeitung" OR "Computer Vision" München
site:indeed.de "Robotics" C++ München
```

### Priority 3: Embedded Systems (adjacent)

Adjacent roles that build on your embedded/hardware background.

```
site:linkedin.com/jobs "Embedded Software Engineer" München
site:stepstone.de "Embedded Systems" C++ München
```

### Priority 4: Broader Technical

Wider net for general C++/software roles in München.

```
site:linkedin.com/jobs "C++" developer München
site:indeed.de "C++" München
```

## Location Filter

When evaluating results, verify the job location is within reasonable commute distance from your home. Define acceptable areas:
- München and surrounding areas
- Direct S-Bahn/transit-connected suburbs of München
- Anywhere requiring relocation outside the München area (too far - deal-breaker)

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
