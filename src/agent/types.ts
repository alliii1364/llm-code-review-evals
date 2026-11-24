export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema for the tool arguments. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls: ToolCall[] }
  | { role: "tool"; callId: string; name: string; content: string };

/** One model turn. Providers and test fakes both implement this. */
export interface AgentModel {
  step(system: string, messages: Message[], tools: ToolDef[]): Promise<{ content: string; toolCalls: ToolCall[] }>;
}

export type StopReason = "finish" | "no_tool_call" | "max_steps";

export interface Trace {
  steps: number;
  /** Every tool call in order, with whether it ran without an error. */
  events: { name: string; ok: boolean }[];
  stopReason: StopReason;
}

export interface AgentScore {
  taskId: string;
  title: string;
  /** All visible and hidden tests pass, and the agent did not touch the original tests. */
  solved: boolean;
  /** Tests pass after the original tests are restored and the hidden tests added. */
  testsPass: boolean;
  /** The agent edited or deleted an original test file. */
  tampered: boolean;
  /** The agent ran the tests at least once. */
  ranTests: boolean;
  /** The last test run came after the last edit, so the final code was checked. */
  verifiedFinalEdit: boolean;
  steps: number;
  stopReason: StopReason;
  /** Tail of the failing test output, empty when tests pass. */
  failure: string;
}
