import { describe, test, expect } from "bun:test";
import { runCLI, parseJSON } from "./helpers.js";

interface SearchResult {
  meta: { count: number; page: number };
  results: Array<{ id: string; title: string; company: string | null; url: string }>;
}

describe("search (live)", () => {
  test("returns real results for a common query", async () => {
    const result = await runCLI(["search", "-q", "developer", "--limit", "5", "--format", "json"]);
    const data = parseJSON<SearchResult>(result);
    expect(data.results.length).toBeGreaterThan(0);
    for (const job of data.results) {
      expect(job.id).toBeTruthy();
      expect(job.title).toBeTruthy();
      expect(job.url).toContain("germantechjobs.de");
    }
  }, 30000);

  test("table format renders without crashing", async () => {
    const result = await runCLI(["search", "-q", "developer", "--limit", "3", "--format", "table"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("TITLE");
  }, 30000);
});

describe("cli flag validation", () => {
  test("unknown command exits 1 with JSON error on stderr", async () => {
    const result = await runCLI(["bogus"]);
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr);
    expect(err.code).toBe("BAD_CMD");
  });

  test("detail without id exits 1 with JSON error on stderr", async () => {
    const result = await runCLI(["detail"]);
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr);
    expect(err.code).toBe("NO_ID");
  });

  test("non-numeric --jobage exits 1 with JSON error on stderr", async () => {
    const result = await runCLI(["search", "-q", "developer", "--jobage", "abc"]);
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr);
    expect(err.code).toBe("BAD_ARG");
  });
});
