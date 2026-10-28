export type Severity = "low" | "medium" | "high" | "critical";

export interface ExpectedBug {
  id: string;
  description: string;
  severity: Severity;
  /** Case-insensitive regular expressions. Matching any one counts as "found". */
  patterns: string[];
}

export interface EvalCase {
  id: string;
  title: string;
  /** Path to the code snippet, relative to the cases folder. */
  file: string;
  bugs: ExpectedBug[];
}

export interface LoadedCase extends EvalCase {
  code: string;
}

export interface BugResult {
  bugId: string;
  severity: Severity;
  found: boolean;
  /** The pattern or judge reason that decided the result. */
  evidence: string | null;
}

export interface CaseResult {
  caseId: string;
  title: string;
  bugs: BugResult[];
}

export interface RunSummary {
  model: string;
  scorer: "keywords" | "judge";
  cases: CaseResult[];
  found: number;
  total: number;
}
