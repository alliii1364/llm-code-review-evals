import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EvalCase, LoadedCase } from "./types.js";

const SEVERITIES = new Set(["low", "medium", "high", "critical"]);

/** Throws a clear error if the case file is malformed, so bad data fails fast. */
export function validateCases(cases: unknown): asserts cases is EvalCase[] {
  if (!Array.isArray(cases)) throw new Error("cases.json must be an array");
  const ids = new Set<string>();
  for (const c of cases as EvalCase[]) {
    if (!c.id || !c.title || !c.file) throw new Error(`Case is missing id, title or file: ${JSON.stringify(c)}`);
    if (ids.has(c.id)) throw new Error(`Duplicate case id: ${c.id}`);
    ids.add(c.id);
    if (!Array.isArray(c.bugs) || c.bugs.length === 0) throw new Error(`Case ${c.id} has no expected bugs`);
    for (const bug of c.bugs) {
      if (!SEVERITIES.has(bug.severity)) throw new Error(`Case ${c.id} / ${bug.id}: unknown severity "${bug.severity}"`);
      if (!bug.patterns?.length) throw new Error(`Case ${c.id} / ${bug.id}: needs at least one pattern`);
      for (const p of bug.patterns) new RegExp(p, "i"); // throws on an invalid pattern
    }
  }
}

export function loadCases(casesFile: string): LoadedCase[] {
  const raw: unknown = JSON.parse(readFileSync(casesFile, "utf8"));
  validateCases(raw);
  const base = dirname(casesFile);
  return raw.map((c) => ({ ...c, code: readFileSync(join(base, c.file), "utf8") }));
}
