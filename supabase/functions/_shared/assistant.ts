import {
  createAdminClient,
  decryptTokenPayload,
  getEnv,
} from "./oauth.ts";

export type AIProvider = "openai" | "anthropic" | "local";
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ProviderCredentials = { apiKey: string; model: string };

const REQUEST_TIMEOUT_MS = 30_000;

async function providerJson(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(`AI provider request failed (${response.status}).`);
  }
  return body as Record<string, unknown>;
}

export async function listProviderModels(provider: Exclude<AIProvider, "local">, apiKey: string) {
  if (provider === "openai") {
    const body = await providerJson("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const models = Array.isArray(body.data) ? body.data : [];
    return models.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const model = entry as Record<string, unknown>;
      if (typeof model.id !== "string") return [];
      const id = model.id.toLowerCase();
      if (
        !id.startsWith("gpt-") ||
        /audio|realtime|transcri|tts|embedding|moderation|image|search/.test(id)
      ) return [];
      return [{ id: model.id, createdAt: Number(model.created) || 0 }];
    }).sort((left, right) => right.createdAt - left.createdAt);
  }

  const body = await providerJson("https://api.anthropic.com/v1/models?limit=100", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  const models = Array.isArray(body.data) ? body.data : [];
  return models.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const model = entry as Record<string, unknown>;
    if (typeof model.id !== "string") return [];
    const createdAt = typeof model.created_at === "string"
      ? Date.parse(model.created_at)
      : 0;
    return [{ id: model.id, createdAt: Number.isFinite(createdAt) ? createdAt : 0 }];
  }).sort((left, right) => right.createdAt - left.createdAt);
}

export function chooseProviderModel(
  provider: Exclude<AIProvider, "local">,
  models: Array<{ id: string; createdAt: number }>,
): string {
  const preferred = provider === "openai"
    ? models.find((model) => /mini/i.test(model.id))
    : models.find((model) => /haiku/i.test(model.id));
  const selected = preferred ?? models[0];
  if (!selected) throw new Error(`No compatible ${provider} chat model is available for this API key.`);
  return selected.id;
}

export async function getProviderCredentials(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  provider: Exclude<AIProvider, "local">,
): Promise<ProviderCredentials | null> {
  const { data, error } = await admin
    .from("ai_provider_tokens")
    .select("encrypted_payload")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error("Could not load the AI provider connection.");
  if (!data) return null;

  const payload = await decryptTokenPayload(data.encrypted_payload);
  if (typeof payload.api_key !== "string" || typeof payload.model !== "string") {
    throw new Error("Reconnect this AI provider to continue.");
  }
  return { apiKey: payload.api_key, model: payload.model };
}

export async function callAssistantModel(
  provider: AIProvider,
  system: string,
  messages: ChatMessage[],
  credentials?: ProviderCredentials | null,
): Promise<string> {
  if (provider === "local") {
    const modelUrl = getEnv("AI_MODEL_URL");
    const model = getEnv("AI_MODEL_NAME");
    const url = new URL(modelUrl);
    if (url.protocol !== "https:") throw new Error("AI_MODEL_URL must use HTTPS.");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const key = Deno.env.get("AI_MODEL_API_KEY")?.trim();
    if (key) headers.Authorization = `Bearer ${key}`;
    const body = await providerJson(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 800,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    const choices = Array.isArray(body.choices) ? body.choices : [];
    const first = choices[0] && typeof choices[0] === "object"
      ? choices[0] as Record<string, unknown>
      : {};
    const message = first.message && typeof first.message === "object"
      ? first.message as Record<string, unknown>
      : {};
    if (typeof message.content !== "string" || !message.content.trim()) {
      throw new Error("The configured local model returned an empty answer.");
    }
    return message.content.trim().slice(0, 8000);
  }

  if (!credentials) throw new Error(`Connect your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key in Connections first.`);
  if (provider === "openai") {
    const body = await providerJson("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: credentials.model,
        temperature: 0.2,
        max_completion_tokens: 800,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    const choices = Array.isArray(body.choices) ? body.choices : [];
    const first = choices[0] && typeof choices[0] === "object"
      ? choices[0] as Record<string, unknown>
      : {};
    const message = first.message && typeof first.message === "object"
      ? first.message as Record<string, unknown>
      : {};
    if (typeof message.content !== "string" || !message.content.trim()) {
      throw new Error("OpenAI returned an empty answer.");
    }
    return message.content.trim().slice(0, 8000);
  }

  const body = await providerJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": credentials.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: credentials.model,
      max_tokens: 800,
      system,
      messages,
    }),
  });
  const content = Array.isArray(body.content) ? body.content : [];
  const answer = content.flatMap((item) =>
    item && typeof item === "object" &&
      (item as Record<string, unknown>).type === "text" &&
      typeof (item as Record<string, unknown>).text === "string"
      ? [(item as Record<string, unknown>).text as string]
      : []
  ).join("\n");
  if (!answer.trim()) throw new Error("Anthropic returned an empty answer.");
  return answer.trim().slice(0, 8000);
}
