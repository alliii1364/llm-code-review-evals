import type { RunSummary, Severity } from "./types.js";

const ORDER: Severity[] = ["critical", "high", "medium", "low"];

function pct(found: number, total: number): string {
  return total === 0 ? "n/a" : `${Math.round((found / total) * 100)}%`;
}

/** Builds the markdown report that is saved as results.md. */
export function toMarkdown(run: RunSummary, date = new Date()): string {
  const lines: string[] = [];
  lines.push(`# Results: ${run.model}`);
  lines.push("");
  lines.push(`Run on ${date.toISOString().slice(0, 10)} · scorer: ${run.scorer}`);
  lines.push("");
  lines.push(`**Bugs found: ${run.found} / ${run.total} (${pct(run.found, run.total)})**`);
  lines.push("");

  lines.push("| Severity | Found |");
  lines.push("|---|---|");
  for (const sev of ORDER) {
    const bugs = run.cases.flatMap((c) => c.bugs).filter((b) => b.severity === sev);
    if (bugs.length === 0) continue;
    const found = bugs.filter((b) => b.found).length;
    lines.push(`| ${sev} | ${found} / ${bugs.length} |`);
  }
  lines.push("");

  lines.push("| Case | Bug | Severity | Found | Evidence |");
  lines.push("|---|---|---|---|---|");
  for (const c of run.cases) {
    for (const b of c.bugs) {
      const evidence = (b.evidence ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").slice(0, 120);
      lines.push(`| ${c.title} | ${b.bugId} | ${b.severity} | ${b.found ? "yes" : "**no**"} | ${evidence} |`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
