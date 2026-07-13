import { DETAIL_BASE_URL, htmlFetch, parseJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a raw numeric job ID or a full xing.com/jobs/... URL. */
function normalizeId(input: string): string | null {
  const url = input.match(/\/jobs\/[a-z0-9-]*-(\d{6,})(?:\?|$)/i)
  if (url) return url[1]
  const bare = input.match(/^\d{6,}$/)
  if (bare) return input
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a job ID from "${opts.id}"`, "BAD_ID")
    return 1
  }
  const url = opts.id.startsWith("http") ? opts.id : `${DETAIL_BASE_URL}/job-${id}`
  try {
    const html = await htmlFetch(url)
    if (!html) {
      // A bare numeric id is fetched via a synthetic "/jobs/job-<id>" URL,
      // since the real slug isn't known. XING requires the exact stored
      // slug (confirmed live: even plausible slugs 410) and returns
      // 404/410 for any mismatch, so this also fires for guessed-slug
      // misses, not just truly removed postings. Passing the full URL from
      // a `search` result avoids this entirely.
      writeError(
        opts.id.startsWith("http")
          ? "Job not found (expired or removed)"
          : "Job not found — bare numeric ids use a guessed URL slug and XING requires an exact match. Pass the full job URL from `search` results instead.",
        "NOT_FOUND",
      )
      return 1
    }
    const job = parseJobDetail(html, id, url)

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}`,
        "",
        job.seniority ? `Seniority: ${job.seniority}` : "",
        job.employmentType ? `Employment: ${job.employmentType}` : "",
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
