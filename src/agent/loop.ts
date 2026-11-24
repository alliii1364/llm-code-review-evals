import { executeTool, TOOLS, type Workspace } from "./tools.js";
import type { AgentModel, Message, Trace } from "./types.js";

export const SYSTEM_PROMPT = `You are a software engineer fixing a bug in a small JavaScript project.
Use the tools to look at the code, make the fix and check it. Fix the root cause, not just the example in the ticket.
Do not edit the existing tests. Call finish when you are done.`;

/** Runs the model in a tool loop until it calls finish, stops calling tools, or runs out of steps. */
export async function runAgent(model: AgentModel, ws: Workspace, ticket: string, maxSteps = 15): Promise<Trace> {
  const messages: Message[] = [{ role: "user", content: ticket }];
  const trace: Trace = { steps: 0, events: [], stopReason: "max_steps" };

  while (trace.steps < maxSteps) {
    trace.steps++;
    const reply = await model.step(SYSTEM_PROMPT, messages, TOOLS);
    messages.push({ role: "assistant", content: reply.content, toolCalls: reply.toolCalls });
    if (reply.toolCalls.length === 0) {
      trace.stopReason = "no_tool_call";
      return trace;
    }

    let finished = false;
    // Every tool call in a reply needs an answer, even the ones after finish.
    for (const call of reply.toolCalls) {
      const { ok, output } = executeTool(ws, call);
      trace.events.push({ name: call.name, ok });
      messages.push({ role: "tool", callId: call.id, name: call.name, content: output });
      if (call.name === "finish") finished = true;
    }
    if (finished) {
      trace.stopReason = "finish";
      return trace;
    }
  }
  return trace;
}
