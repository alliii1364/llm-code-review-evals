import type { BugResult, CaseResult, ExpectedBug, LoadedCase } from "./types.js";

/** Keyword scorer: a bug counts as found if any of its patterns appears in the review. */
export function scoreBugByKeywords(bug: ExpectedBug, review: string): BugResult {
  for (const pattern of bug.patterns) {
    const match = review.match(new RegExp(pattern, "i"));
    if (match) {
      return { bugId: bug.id, severity: bug.severity, found: true, evidence: `matched "${match[0]}"` };
    }
  }
  return { bugId: bug.id, severity: bug.severity, found: false, evidence: null };
}

export function scoreCaseByKeywords(c: LoadedCase, review: string): CaseResult {
  return { caseId: c.id, title: c.title, bugs: c.bugs.map((b) => scoreBugByKeywords(b, review)) };
}

/** Reads a judge model's answer. Anything that does not clearly start with YES is a miss. */
export function parseJudgeAnswer(answer: string): { found: boolean; reason: string } {
  const text = answer.trim();
  const found = /^\**\s*yes\b/i.test(text);
  const reason = text.split("\n").slice(1).join(" ").trim() || text;
  return { found, reason };
}

export function totals(cases: CaseResult[]): { found: number; total: number } {
  let found = 0;
  let total = 0;
  for (const c of cases) {
    for (const b of c.bugs) {
      total++;
      if (b.found) found++;
    }
  }
  return { found, total };
}
