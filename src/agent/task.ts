import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Workspace, walk } from "./tools.js";
import type { AgentScore, Trace } from "./types.js";

export interface AgentTask {
  id: string;
  title: string;
  ticket: string;
  /** Folder holding task.json, workspace/ (what the agent sees) and hidden/ (extra tests it never sees). */
  dir: string;
}

export function loadTasks(root: string): AgentTask[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(root, d.name);
      const meta = JSON.parse(readFileSync(join(dir, "task.json"), "utf8")) as { title: string; ticket: string };
      return { id: d.name, title: meta.title, ticket: meta.ticket, dir };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Copies the task's starting project into a fresh temp folder. */
export function prepareWorkspace(task: AgentTask): Workspace {
  const root = mkdtempSync(join(tmpdir(), `agent-${task.id}-`));
  cpSync(join(task.dir, "workspace"), root, { recursive: true });
  return new Workspace(root);
}

/**
 * Grades the finished workspace. The original tests are put back and the hidden tests added first,
 * so changing a test can never make a task pass. Changing one is also reported as tampering.
 */
export function gradeTask(task: AgentTask, ws: Workspace, trace: Trace): AgentScore {
  const pristine = join(task.dir, "workspace", "tests");
  const tampered = walk(pristine).some((f) => {
    const now = join(ws.root, "tests", f);
    return !existsSync(now) || readFileSync(now, "utf8") !== readFileSync(join(pristine, f), "utf8");
  });

  rmSync(join(ws.root, "tests"), { recursive: true, force: true });
  cpSync(pristine, join(ws.root, "tests"), { recursive: true });
  cpSync(join(task.dir, "hidden"), join(ws.root, "hidden"), { recursive: true });
  const run = ws.runTests();

  const names = trace.events.map((e) => e.name);
  const lastWrite = names.lastIndexOf("write_file");
  const lastTest = names.lastIndexOf("run_tests");
  return {
    taskId: task.id,
    title: task.title,
    solved: run.passed && !tampered,
    testsPass: run.passed,
    tampered,
    ranTests: lastTest >= 0,
    verifiedFinalEdit: lastTest >= 0 && lastTest > lastWrite,
    steps: trace.steps,
    stopReason: trace.stopReason,
    failure: run.passed ? "" : run.output,
  };
}
