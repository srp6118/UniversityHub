import {
  chooseProviderModel,
  listProviderModels,
} from "../_shared/assistant.ts";
import {
  createAdminClient,
  encryptTokenPayload,
  jsonResponse,
  preflightResponse,
  requireUser,
} from "../_shared/oauth.ts";

type Provider = "openai" | "anthropic";

Deno.serve(async (request) => {
  const preflight = preflightResponse(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed." }, 405);

  try {
    const user = await requireUser(request);
    if (Number(request.headers.get("content-length") ?? 0) > 4096) {
      return jsonResponse(request, { error: "Request is too large." }, 413);
    }
    const body: unknown = await request.json();
    const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const action = values.action;
    const provider = values.provider;
    if (provider !== "openai" && provider !== "anthropic") {
      return jsonResponse(request, { error: "Choose OpenAI or Anthropic." }, 400);
    }

    const admin = createAdminClient();
    if (action === "status") {
      const { data, error } = await admin
        .from("ai_provider_tokens")
        .select("provider")
        .eq("user_id", user.id);
      if (error) throw new Error("Could not load AI provider settings.");
      return jsonResponse(request, {
        providers: {
          openai: (data ?? []).some((entry) => entry.provider === "openai"),
          anthropic: (data ?? []).some((entry) => entry.provider === "anthropic"),
        },
        localConfigured: Boolean(
          Deno.env.get("AI_MODEL_URL")?.trim() && Deno.env.get("AI_MODEL_NAME")?.trim(),
        ),
      });
    }

    if (action === "disconnect") {
      const { error } = await admin
        .from("ai_provider_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);
      if (error) throw new Error("Could not disconnect the AI provider.");
      return jsonResponse(request, { disconnected: true, provider });
    }

    if (action !== "connect" || typeof values.apiKey !== "string") {
      return jsonResponse(request, { error: "Enter an API key to connect this provider." }, 400);
    }
    const apiKey = values.apiKey.trim();
    if (apiKey.length < 16 || apiKey.length > 512 || /[\r\n]/.test(apiKey)) {
      return jsonResponse(request, { error: "That API key does not look valid." }, 400);
    }

    const models = await listProviderModels(provider, apiKey);
    const model = chooseProviderModel(provider, models);
    const { error } = await admin.from("ai_provider_tokens").upsert({
      user_id: user.id,
      provider,
      encrypted_payload: await encryptTokenPayload({ api_key: apiKey, model }),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("Could not securely save this AI provider connection.");
    return jsonResponse(request, { connected: true, provider, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") return jsonResponse(request, { error: message }, 401);
    if (message.includes("AI provider request failed")) {
      return jsonResponse(request, {
        error: "Could not verify that API key. Check the key and its API access, then try again.",
      }, 400);
    }
    return jsonResponse(request, {
      error: message || "Could not update AI provider settings.",
    }, 500);
  }
});
