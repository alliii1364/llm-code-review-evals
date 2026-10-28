import type { ExpectedBug, LoadedCase } from "./types.js";

/**
 * The review prompt deliberately gives no hints about which bugs exist,
 * so the score reflects what the model finds on its own.
 */
export function reviewPrompt(c: LoadedCase): string {
  return [
    "You are reviewing a pull request. Review the code below for bugs, security issues and edge cases.",
    "For each problem: say what is wrong, when it happens, and how to fix it. Be specific and concise.",
    "If the code is correct, say so.",
    "",
    "```" + (c.file.endsWith(".js") ? "js" : "ts"),
    c.code.trim(),
    "```",
  ].join("\n");
}

/** Asks a model to grade one review against one known bug. Answers must start with YES or NO. */
export function judgePrompt(bug: ExpectedBug, review: string): string {
  return [
    "You are grading a code review. Decide whether the review identifies the specific bug described below.",
    "It counts only if the review names this problem (or its direct cause). A vague or unrelated comment does not count.",
    "",
    `Known bug: ${bug.description}`,
    "",
    "Review:",
    '"""',
    review.trim(),
    '"""',
    "",
    "Answer with YES or NO on the first line, then one short sentence explaining why.",
  ].join("\n");
}
