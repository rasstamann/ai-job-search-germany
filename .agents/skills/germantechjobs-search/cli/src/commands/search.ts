import { fetchFeed, toJobCard, matchesAllTerms, daysSince, writeError, type JobCard } from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 42).padEnd(42)
    const company = (c.company || "—").slice(0, 26).padEnd(26)
    const salary = (c.salary || "—").slice(0, 20).padEnd(20)
    const date = c.date || "—"
    return `${c.id.slice(0, 30).padEnd(30)} ${title} ${company} ${salary} ${date}`
  })
  const header =
    "ID".padEnd(30) + " " + "TITLE".padEnd(42) + " " + "COMPANY".padEnd(26) + " " + "SALARY".padEnd(20) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const items = await fetchFeed()
    let cards = items
      .filter((item) => (opts.jobage >= 9999 ? true : daysSince(item.pubDate) <= opts.jobage))
      .filter((item) => (opts.query ? matchesAllTerms(`${item.title} ${item.descriptionHtml}`, opts.query) : true))
      .filter((item) => (opts.location ? matchesAllTerms(item.descriptionHtml, opts.location) : true))
      .map(toJobCard)

    const pageSize = 20
    const start = (opts.page - 1) * pageSize
    cards = cards.slice(start, start + pageSize)
    if (opts.limit !== undefined && opts.limit >= 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.salary || "—"} · ${c.date || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: cards.length, page: opts.page }, results: cards }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
