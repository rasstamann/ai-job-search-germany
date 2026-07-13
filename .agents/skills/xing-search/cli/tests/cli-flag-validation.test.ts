import { describe, test, expect } from "bun:test";
import { runCLI } from "./helpers";

const LOCATION = "München";
const QUERY = "Software Engineer C++";

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

describe("XING CLI flag validation", () => {
  describe("--radius NaN validation", () => {
    test("non-numeric string exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--radius", "foo"]);
      expect(result.exitCode).not.toBe(0);
      const err = parsedStderr(result.stderr);
      expect(err.code).toBe("BAD_ARG");
      expect(err.error).toMatch(/radius/);
    });
  });

  describe("--page NaN validation", () => {
    test("non-numeric string exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--page", "abc"]);
      expect(result.exitCode).not.toBe(0);
      const err = parsedStderr(result.stderr);
      expect(err.code).toBe("BAD_ARG");
      expect(err.error).toMatch(/page/);
    });
  });

  describe("--limit NaN validation", () => {
    test("non-numeric string exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--limit", "xyz"]);
      expect(result.exitCode).not.toBe(0);
      const err = parsedStderr(result.stderr);
      expect(err.code).toBe("BAD_ARG");
      expect(err.error).toMatch(/limit/);
    });
  });

  describe("detail requires an id", () => {
    test("missing id exits 1 with NO_ID", async () => {
      const result = await runCLI(["detail"]);
      expect(result.exitCode).not.toBe(0);
      const err = parsedStderr(result.stderr);
      expect(err.code).toBe("NO_ID");
    });
  });

  describe("unknown command", () => {
    test("exits 1 with BAD_CMD", async () => {
      const result = await runCLI(["bogus"]);
      expect(result.exitCode).not.toBe(0);
      const err = parsedStderr(result.stderr);
      expect(err.code).toBe("BAD_CMD");
    });
  });

  describe("live smoke test (network)", () => {
    test("search returns at least one result with non-null id/title/url", async () => {
      const result = await runCLI(["search", "-q", QUERY, "-l", LOCATION, "--limit", "5"]);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.results.length).toBeGreaterThan(0);
      for (const r of parsed.results) {
        expect(r.id).toBeTruthy();
        expect(r.title).toBeTruthy();
        expect(r.url).toMatch(/^https:\/\/www\.xing\.com\/jobs\//);
      }
    }, 30000);
  });
});
