import { fetchFeed, idFromUrl, toJobDetail, writeError, type JobDetail } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a raw slug id or a full germantechjobs.de job URL. */
function normalizeId(input: string): string {
  if (input.startsWith("http")) return idFromUrl(input) ?? input
  return input
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  try {
    const items = await fetchFeed()
    const match = items.find((item) => idFromUrl(item.link) === id)
    if (!match) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const job: JobDetail = toJobDetail(match)

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.salary || "—"} · ${job.date || "—"}`,
        "",
        job.requirements.length ? `Requirements:\n- ${job.requirements.join("\n- ")}` : "",
        job.responsibilities.length ? `Responsibilities:\n- ${job.responsibilities.join("\n- ")}` : "",
        job.technologies.length ? `Technologies: ${job.technologies.join(", ")}` : "",
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
