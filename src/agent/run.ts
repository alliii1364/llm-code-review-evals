import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { configFromEnv } from "../providers.js";
import { runAgent } from "./loop.js";
import { agentModelFor } from "./models.js";
import { agentReport } from "./report.js";
import { gradeTask, loadTasks, prepareWorkspace } from "./task.js";
import type { AgentScore } from "./types.js";

const HELP = `Usage: npm run agent -- [options]

  --only <taskId>     Run a single task, e.g. --only 02-cart-cents
  --max-steps <n>     Model turns allowed per task (default 15)
  --help              Show this message

Environment (.env): PROVIDER=openai|anthropic, MODEL, OPENAI_API_KEY or ANTHROPIC_API_KEY

The model's code runs on this machine (node --test inside a temp folder). Use a throwaway machine or container.`;

async function main() {
  const { values } = parseArgs({
    options: { only: { type: "string" }, "max-steps": { type: "string", default: "15" }, help: { type: "boolean", default: false } },
  });
  if (values.help) {
    console.log(HELP);
    return;
  }
  if (existsSync(".env")) process.loadEnvFile(".env");
  const cfg = configFromEnv();
  const maxSteps = Number(values["max-steps"]);
  if (!Number.isInteger(maxSteps) || maxSteps < 1) throw new Error("--max-steps must be a positive integer");

  let tasks = loadTasks(resolve("agent-cases"));
  if (values.only) {
    tasks = tasks.filter((t) => t.id === values.only);
    if (tasks.length === 0) throw new Error(`No task with id ${values.only}`);
  }

  const model = agentModelFor(cfg);
  const label = `${cfg.provider}/${cfg.model}`;
  const runDir = resolve("runs", `agent-${cfg.model.replace(/[^\w.-]/g, "_")}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });

  const scores: AgentScore[] = [];
  for (const task of tasks) {
    process.stdout.write(`Running ${task.id}... `);
    const ws = prepareWorkspace(task);
    try {
      const trace = await runAgent(model, ws, task.ticket, maxSteps);
      const score = gradeTask(task, ws, trace);
      scores.push(score);
      console.log(`${score.solved ? "solved" : "failed"} in ${score.steps} steps`);
    } finally {
      rmSync(ws.root, { recursive: true, force: true });
    }
  }

  const markdown = agentReport(label, scores);
  writeFileSync(join(runDir, "agent-results.md"), markdown);
  writeFileSync(join(runDir, "agent-summary.json"), JSON.stringify({ model: label, scores }, null, 2));
  writeFileSync("agent-results.md", markdown);
  console.log(`\nSolved ${scores.filter((s) => s.solved).length}/${scores.length}. Report saved to agent-results.md and ${runDir}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
