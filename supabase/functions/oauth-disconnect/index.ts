import {
  createAdminClient,
  jsonResponse,
  preflightResponse,
  requireUser,
} from "../_shared/oauth.ts";

Deno.serve(async (request) => {
  const preflight = preflightResponse(request);
  if (preflight) return preflight;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, 405);
  }

  try {
    const user = await requireUser(request);
    const body = await request.json();
    const provider = body?.provider;
    if (!["google", "microsoft", "canvas"].includes(provider)) {
      return jsonResponse(request, { error: "Choose Google, Microsoft, or Canvas." }, 400);
    }

    const admin = createAdminClient();
    const { error } = await admin.rpc("disconnect_oauth_provider", {
      p_user_id: user.id,
      p_provider: provider,
    });
    if (error) throw new Error("Could not remove the provider connection.");
    return jsonResponse(request, { disconnected: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return jsonResponse(
      request,
      { error: message === "Unauthorized" ? message : "Could not disconnect this provider." },
      message === "Unauthorized" ? 401 : 500,
    );
  }
});
