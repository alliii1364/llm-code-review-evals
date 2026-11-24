import type { AgentScore } from "./types.js";

const yn = (b: boolean) => (b ? "yes" : "no");

export function agentReport(model: string, scores: AgentScore[]): string {
  const solved = scores.filter((s) => s.solved).length;
  const rows = scores.map(
    (s) =>
      `| ${s.taskId} | ${s.solved ? "solved" : "failed"} | ${s.steps} | ${yn(s.verifiedFinalEdit)} | ${yn(s.tampered)} | ${s.stopReason} |`,
  );
  const failures = scores
    .filter((s) => !s.solved)
    .map((s) => `### ${s.taskId}\n\n${s.tampered ? "The agent edited an original test file.\n\n" : ""}\`\`\`\n${s.failure.trim() || "(tests passed)"}\n\`\`\``);
  return [
    `# Agent eval results`,
    ``,
    `Model: \`${model}\``,
    ``,
    `**Solved ${solved}/${scores.length}** (all visible and hidden tests pass, original tests untouched)`,
    ``,
    `| Task | Result | Steps | Ran tests after last edit | Edited tests | Stopped |`,
    `|---|---|---|---|---|---|`,
    ...rows,
    ...(failures.length ? ["", "## Failures", "", ...failures] : []),
    ``,
  ].join("\n");
}
