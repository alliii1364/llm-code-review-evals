import type { ModelConfig } from "../providers.js";
import type { AgentModel, Message, ToolCall, ToolDef } from "./types.js";

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(raw || "{}");
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function post(url: string, headers: Record<string, string>, body: unknown, label: string): Promise<unknown> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${label} API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function openaiModel(cfg: ModelConfig): AgentModel {
  return {
    async step(system, messages, tools) {
      const apiMessages = [
        { role: "system", content: system },
        ...messages.map((m) => {
          if (m.role === "user") return { role: "user", content: m.content };
          if (m.role === "tool") return { role: "tool", tool_call_id: m.callId, content: m.content };
          return {
            role: "assistant",
            content: m.content || null,
            ...(m.toolCalls.length
              ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args) } })) }
              : {}),
          };
        }),
      ];
      const data = (await post(
        "https://api.openai.com/v1/chat/completions",
        { authorization: `Bearer ${cfg.apiKey}` },
        {
          model: cfg.model,
          messages: apiMessages,
          tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } })),
        },
        "OpenAI",
      )) as { choices: { message: { content: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[] };
      const msg = data.choices[0]?.message;
      return {
        content: msg?.content ?? "",
        toolCalls: (msg?.tool_calls ?? []).map((c): ToolCall => ({ id: c.id, name: c.function.name, args: parseArgs(c.function.arguments) })),
      };
    },
  };
}

/** Anthropic wants every tool result for one assistant turn in a single user message. */
export function toAnthropicMessages(messages: Message[]): { role: "user" | "assistant"; content: unknown }[] {
  const out: { role: "user" | "assistant"; content: unknown }[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const blocks: unknown[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const c of m.toolCalls) blocks.push({ type: "tool_use", id: c.id, name: c.name, input: c.args });
      out.push({ role: "assistant", content: blocks });
    } else {
      const block = { type: "tool_result", tool_use_id: m.callId, content: m.content };
      const last = out[out.length - 1];
      if (last && last.role === "user" && Array.isArray(last.content)) (last.content as unknown[]).push(block);
      else out.push({ role: "user", content: [block] });
    }
  }
  return out;
}

function anthropicModel(cfg: ModelConfig): AgentModel {
  return {
    async step(system, messages, tools: ToolDef[]) {
      const data = (await post(
        "https://api.anthropic.com/v1/messages",
        { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
        {
          model: cfg.model,
          max_tokens: 4096,
          system,
          messages: toAnthropicMessages(messages),
          tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })),
        },
        "Anthropic",
      )) as { content: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[] };
      return {
        content: data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n"),
        toolCalls: data.content
          .filter((b) => b.type === "tool_use")
          .map((b): ToolCall => ({ id: b.id ?? "", name: b.name ?? "", args: b.input ?? {} })),
      };
    },
  };
}

export function agentModelFor(cfg: ModelConfig): AgentModel {
  return cfg.provider === "openai" ? openaiModel(cfg) : anthropicModel(cfg);
}
