import { describe, expect, it } from "vitest";
import { parseJudgeAnswer, scoreBugByKeywords, scoreCaseByKeywords, totals } from "../src/score.js";
import type { ExpectedBug, LoadedCase } from "../src/types.js";

const sqlBug: ExpectedBug = {
  id: "sql-injection",
  description: "String concatenation in SQL",
  severity: "critical",
  patterns: ["sql injection", "parameteri[sz]ed"],
};

describe("scoreBugByKeywords", () => {
  it("finds a bug when any pattern matches, ignoring case", () => {
    const result = scoreBugByKeywords(sqlBug, "This is vulnerable to SQL Injection.");
    expect(result.found).toBe(true);
    expect(result.evidence).toContain("SQL Injection");
  });

  it("accepts British and American spelling through the pattern", () => {
    expect(scoreBugByKeywords(sqlBug, "Use a parameterised query").found).toBe(true);
  });

  it("misses a bug when no pattern matches", () => {
    const result = scoreBugByKeywords(sqlBug, "Looks fine, maybe rename the variable.");
    expect(result).toEqual({ bugId: "sql-injection", severity: "critical", found: false, evidence: null });
  });
});

describe("scoreCaseByKeywords and totals", () => {
  const c: LoadedCase = {
    id: "x",
    title: "Example",
    file: "x.ts",
    code: "",
    bugs: [sqlBug, { id: "other", description: "", severity: "low", patterns: ["never-mentioned"] }],
  };

  it("scores every expected bug in a case and adds them up", () => {
    const result = scoreCaseByKeywords(c, "sql injection here");
    expect(result.bugs.map((b) => b.found)).toEqual([true, false]);
    expect(totals([result])).toEqual({ found: 1, total: 2 });
  });
});

describe("parseJudgeAnswer", () => {
  it.each([
    ["YES\nThe review names the race condition.", true],
    ["**Yes** - it mentions transactions", true],
    ["NO\nIt only talks about naming.", false],
    ["Yesterday the review...", false],
    ["The answer is yes", false],
  ])("reads %j as found=%s", (answer, expected) => {
    expect(parseJudgeAnswer(answer).found).toBe(expected);
  });

  it("keeps the explanation as the reason", () => {
    expect(parseJudgeAnswer("NO\nIt only talks about naming.").reason).toBe("It only talks about naming.");
  });
});
