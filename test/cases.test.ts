import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCases, validateCases } from "../src/cases.js";
import { reviewPrompt } from "../src/prompts.js";
import { scoreBugByKeywords } from "../src/score.js";

const cases = loadCases(resolve(__dirname, "../cases/cases.json"));

describe("case file", () => {
  it("loads every case with its code snippet", () => {
    expect(cases.length).toBeGreaterThanOrEqual(10);
    for (const c of cases) expect(c.code.length).toBeGreaterThan(0);
  });

  it("rejects malformed cases", () => {
    expect(() => validateCases({})).toThrow(/array/);
    expect(() => validateCases([{ id: "a", title: "A", file: "a.ts", bugs: [] }])).toThrow(/no expected bugs/);
    expect(() =>
      validateCases([{ id: "a", title: "A", file: "a.ts", bugs: [{ id: "b", description: "", severity: "huge", patterns: ["x"] }] }]),
    ).toThrow(/severity/);
  });

  it("never leaks the expected answer into the review prompt", () => {
    for (const c of cases) {
      const prompt = reviewPrompt(c).toLowerCase();
      for (const bug of c.bugs) expect(prompt).not.toContain(bug.description.toLowerCase());
    }
  });

  it("does not count the code itself as a correct review", () => {
    // Echoing the snippet back must not score: patterns should describe the problem, not quote the code.
    const unfair = cases.flatMap((c) =>
      c.bugs.filter((b) => scoreBugByKeywords(b, c.code).found).map((b) => `${c.id}/${b.id}`),
    );
    expect(unfair).toEqual([]);
  });
});

describe("reference reviews", () => {
  // Hand-written correct reviews: every expected bug should be found, otherwise a pattern is too strict.
  const reference = JSON.parse(readFileSync(resolve(__dirname, "fixtures/reference-reviews.json"), "utf8")) as Record<string, string>;

  it.each(cases.map((c) => [c.id, c] as const))("%s: a correct review finds every expected bug", (_id, c) => {
    const review = reference[c.id];
    expect(review, `missing reference review for ${c.id}`).toBeDefined();
    const missed = c.bugs.filter((b) => !scoreBugByKeywords(b, review!).found).map((b) => b.id);
    expect(missed).toEqual([]);
  });
});
