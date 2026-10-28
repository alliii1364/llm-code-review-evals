/**
 * Minimal model clients using fetch, so there are no SDK dependencies.
 * Pick a provider with PROVIDER=openai or PROVIDER=anthropic, and a model with MODEL.
 */
export type Provider = "openai" | "anthropic";

export interface ModelConfig {
  provider: Provider;
  model: string;
  apiKey: string;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ModelConfig {
  const provider = (env.PROVIDER ?? "openai").toLowerCase();
  if (provider !== "openai" && provider !== "anthropic") {
    throw new Error(`PROVIDER must be "openai" or "anthropic", got "${provider}"`);
  }
  const apiKey = provider === "openai" ? env.OPENAI_API_KEY : env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(`Missing ${provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"}. Copy .env.example to .env and add your key.`);
  }
  const model = env.MODEL;
  if (!model) throw new Error("Missing MODEL, for example MODEL=gpt-4o-mini");
  return { provider, model, apiKey };
}

export async function complete(cfg: ModelConfig, prompt: string, maxTokens = 1200): Promise<string> {
  if (cfg.provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: maxTokens,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message.content ?? "";
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
}
