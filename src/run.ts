import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadCases } from "./cases.js";
import { complete, configFromEnv, type ModelConfig } from "./providers.js";
import { judgePrompt, reviewPrompt } from "./prompts.js";
import { toMarkdown } from "./report.js";
import { parseJudgeAnswer, scoreCaseByKeywords, totals } from "./score.js";
import type { CaseResult, LoadedCase, RunSummary } from "./types.js";

const HELP = `Usage: npm run eval -- [options]

  --judge            Grade with an LLM judge instead of keyword matching
  --only <caseId>    Run a single case, e.g. --only 05-withdraw
  --rescore <dir>    Re-score saved reviews in runs/<dir> without calling the model for reviews
  --help             Show this message

Environment (.env): PROVIDER=openai|anthropic, MODEL, OPENAI_API_KEY or ANTHROPIC_API_KEY`;

async function judgeCase(cfg: ModelConfig, c: LoadedCase, review: string): Promise<CaseResult> {
  const bugs = [];
  for (const bug of c.bugs) {
    const answer = await complete(cfg, judgePrompt(bug, review), 200);
    const { found, reason } = parseJudgeAnswer(answer);
    bugs.push({ bugId: bug.id, severity: bug.severity, found, evidence: reason });
  }
  return { caseId: c.id, title: c.title, bugs };
}

async function main() {
  const { values } = parseArgs({
    options: {
      judge: { type: "boolean", default: false },
      only: { type: "string" },
      rescore: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(HELP);
    return;
  }

  if (existsSync(".env")) process.loadEnvFile(".env");
  // Re-scoring saved reviews with keywords needs no API key; everything else does.
  const needsModel = !values.rescore || values.judge;
  const cfg = needsModel ? configFromEnv() : null;

  let cases = loadCases(resolve("cases/cases.json"));
  if (values.only) {
    cases = cases.filter((c) => c.id === values.only);
    if (cases.length === 0) throw new Error(`No case with id ${values.only}`);
  }

  const runDir = values.rescore
    ? resolve("runs", values.rescore)
    : resolve("runs", `${cfg!.model.replace(/[^\w.-]/g, "_")}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const reviewsDir = join(runDir, "reviews");
  mkdirSync(reviewsDir, { recursive: true });

  const results: CaseResult[] = [];
  for (const c of cases) {
    const reviewFile = join(reviewsDir, `${c.id}.md`);
    let review: string;
    if (values.rescore) {
      review = readFileSync(reviewFile, "utf8");
    } else {
      process.stdout.write(`Reviewing ${c.id}... `);
      review = await complete(cfg!, reviewPrompt(c));
      writeFileSync(reviewFile, review);
    }
    const result = values.judge ? await judgeCase(cfg!, c, review) : scoreCaseByKeywords(c, review);
    results.push(result);
    const found = result.bugs.filter((b) => b.found).length;
    console.log(`${values.rescore ? c.id + ": " : ""}${found}/${result.bugs.length} bugs found`);
  }

  const previous = join(runDir, "summary.json");
  const model = cfg
    ? `${cfg.provider}/${cfg.model}`
    : existsSync(previous)
      ? (JSON.parse(readFileSync(previous, "utf8")) as RunSummary).model
      : values.rescore!;
  const summary: RunSummary = {
    model,
    scorer: values.judge ? "judge" : "keywords",
    cases: results,
    ...totals(results),
  };
  const markdown = toMarkdown(summary);
  writeFileSync(join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  writeFileSync(join(runDir, "results.md"), markdown);
  writeFileSync("results.md", markdown);

  console.log(`\nTotal: ${summary.found}/${summary.total} bugs found. Report saved to results.md and ${runDir}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
