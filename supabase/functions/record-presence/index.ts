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
    const { error } = await createAdminClient()
      .from("user_presence")
      .upsert({ user_id: user.id, last_seen_at: new Date().toISOString() });
    if (error) throw new Error("Could not update online status.");
    return jsonResponse(request, { recorded: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : 500;
    return jsonResponse(
      request,
      { error: message === "Unauthorized" ? message : "Could not update online status." },
      status,
    );
  }
});
