import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runAgent } from "../src/agent/loop.js";
import { toAnthropicMessages } from "../src/agent/models.js";
import { gradeTask, loadTasks, prepareWorkspace } from "../src/agent/task.js";
import type { AgentModel, ToolCall } from "../src/agent/types.js";

const tasks = loadTasks(resolve("agent-cases"));
const task = (id: string) => tasks.find((t) => t.id === id)!;
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((r) => rmSync(r, { recursive: true, force: true })));

let n = 0;
const call = (name: string, args: Record<string, unknown> = {}): ToolCall => ({ id: `c${n++}`, name, args });

/** A fake model that plays back one prepared list of tool calls per turn. */
function scripted(turns: ToolCall[][]): AgentModel {
  let i = 0;
  return { step: async () => ({ content: "", toolCalls: turns[i++] ?? [] }) };
}

function play(id: string, turns: ToolCall[][], maxSteps = 15) {
  const ws = prepareWorkspace(task(id));
  roots.push(ws.root);
  return runAgent(scripted(turns), ws, task(id).ticket, maxSteps).then((trace) => ({ ws, trace }));
}

const FIXED_RANGE = `export function range(start, end) {
  const out = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}
`;

describe("agent task fixtures", () => {
  it("every task starts broken: the visible tests fail", () => {
    for (const t of tasks) {
      const ws = prepareWorkspace(t);
      roots.push(ws.root);
      expect(ws.runTests().passed, t.id).toBe(false);
    }
  });
});

describe("agent loop and grading", () => {
  it("scores a correct fix as solved and records that the final edit was tested", async () => {
    const { ws, trace } = await play("01-range", [
      [call("read_file", { path: "src/range.js" })],
      [call("write_file", { path: "src/range.js", content: FIXED_RANGE })],
      [call("run_tests")],
      [call("finish", { summary: "inclusive end" })],
    ]);
    const s = gradeTask(task("01-range"), ws, trace);
    expect(s).toMatchObject({ solved: true, tampered: false, ranTests: true, verifiedFinalEdit: true, stopReason: "finish", steps: 4 });
  });

  it("does not credit a fix that was never tested", async () => {
    const { ws, trace } = await play("01-range", [
      [call("write_file", { path: "src/range.js", content: FIXED_RANGE })],
      [call("finish", { summary: "done" })],
    ]);
    const s = gradeTask(task("01-range"), ws, trace);
    expect(s.solved).toBe(true);
    expect(s.verifiedFinalEdit).toBe(false);
  });

  it("fails an agent that rewrites the test instead of fixing the code", async () => {
    const { ws, trace } = await play("01-range", [
      [call("write_file", { path: "tests/range.test.mjs", content: "import { test } from 'node:test';\ntest('ok', () => {});\n" })],
      [call("finish", { summary: "tests pass now" })],
    ]);
    const s = gradeTask(task("01-range"), ws, trace);
    expect(s.tampered).toBe(true);
    expect(s.testsPass).toBe(false); // the original test is restored, and it still fails
    expect(s.solved).toBe(false);
  });

  it("fails a narrow fix that passes the visible test but not the hidden ones", async () => {
    const { ws, trace } = await play("01-range", [
      [call("write_file", { path: "src/range.js", content: "export function range(a, b) { return b === 3 ? [1, 2, 3] : []; }\n" })],
      [call("finish", { summary: "done" })],
    ]);
    const s = gradeTask(task("01-range"), ws, trace);
    expect(s.tampered).toBe(false);
    expect(s.testsPass).toBe(false);
  });

  it("stops at max steps and when the model stops calling tools", async () => {
    const forever = await play("01-range", [[call("list_files")], [call("list_files")], [call("list_files")]], 2);
    expect(forever.trace).toMatchObject({ steps: 2, stopReason: "max_steps" });
    const silent = await play("01-range", [[]]);
    expect(silent.trace.stopReason).toBe("no_tool_call");
  });

  it("returns tool errors to the model instead of crashing, and blocks paths outside the workspace", async () => {
    const { trace } = await play("01-range", [
      [call("read_file", { path: "../../etc/passwd" }), call("write_file", { path: "../escape.txt", content: "x" }), call("nope")],
      [call("finish", { summary: "gave up" })],
    ]);
    expect(trace.events.slice(0, 3).map((e) => e.ok)).toEqual([false, false, false]);
  });
});

describe("anthropic message conversion", () => {
  it("merges the tool results of one turn into a single user message", () => {
    const out = toAnthropicMessages([
      { role: "user", content: "fix it" },
      { role: "assistant", content: "", toolCalls: [{ id: "a", name: "list_files", args: {} }, { id: "b", name: "run_tests", args: {} }] },
      { role: "tool", callId: "a", name: "list_files", content: "x" },
      { role: "tool", callId: "b", name: "run_tests", content: "PASS" },
    ]);
    expect(out.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(out[2]!.content).toHaveLength(2);
  });
});
