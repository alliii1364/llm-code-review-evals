import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { ToolCall, ToolDef } from "./types.js";

/** Lists every file under dir as a relative path, skipping node_modules. */
export function walk(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full).split(sep).join("/"));
  }
  return out.sort();
}

/** A scratch folder the agent may read and write. Paths cannot leave it. */
export class Workspace {
  constructor(readonly root: string) {}

  resolve(path: string): string {
    const abs = resolve(this.root, path);
    if (abs !== this.root && !abs.startsWith(this.root + sep)) throw new Error(`Path is outside the workspace: ${path}`);
    return abs;
  }

  list(): string[] {
    return walk(this.root);
  }

  read(path: string): string {
    return readFileSync(this.resolve(path), "utf8");
  }

  write(path: string, content: string): void {
    const abs = this.resolve(path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }

  /**
   * Runs `node --test` in the workspace. This executes code the model wrote, with your user's
   * permissions, so only run the harness on a machine you are happy to run model-written code on.
   */
  runTests(): { passed: boolean; output: string } {
    const r = spawnSync(process.execPath, ["--test"], { cwd: this.root, encoding: "utf8", timeout: 20_000 });
    const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    return { passed: r.status === 0, output: output.length > 3000 ? "..." + output.slice(-3000) : output };
  }
}

export const TOOLS: ToolDef[] = [
  {
    name: "list_files",
    description: "List every file in the project.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "read_file",
    description: "Read one file.",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "Relative path, e.g. src/range.js" } },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file with the full new content.",
    parameters: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
      additionalProperties: false,
    },
  },
  {
    name: "run_tests",
    description: "Run the project's tests and return the output.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "finish",
    description: "Call this when the bug is fixed. Ends the task.",
    parameters: {
      type: "object",
      properties: { summary: { type: "string", description: "One or two sentences on what you changed." } },
      required: ["summary"],
      additionalProperties: false,
    },
  },
];

function str(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== "string") throw new Error(`Argument "${key}" must be a string`);
  return v;
}

/** Runs one tool call. Errors come back as text so the model can react to them. */
export function executeTool(ws: Workspace, call: ToolCall): { ok: boolean; output: string } {
  try {
    switch (call.name) {
      case "list_files":
        return { ok: true, output: ws.list().join("\n") };
      case "read_file":
        return { ok: true, output: ws.read(str(call.args, "path")) };
      case "write_file":
        ws.write(str(call.args, "path"), str(call.args, "content"));
        return { ok: true, output: "Written." };
      case "run_tests": {
        const r = ws.runTests();
        return { ok: true, output: `${r.passed ? "PASS" : "FAIL"}\n${r.output}` };
      }
      case "finish":
        return { ok: true, output: "Done." };
      default:
        return { ok: false, output: `Error: unknown tool "${call.name}"` };
    }
  } catch (err) {
    return { ok: false, output: `Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
