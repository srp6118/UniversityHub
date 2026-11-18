import {
  createAdminClient,
  createOAuthState,
  corsHeaders,
  getEnv,
  jsonResponse,
  normalizeCanvasUrl,
  preflightResponse,
  requireUser,
} from "../_shared/oauth.ts";

const providerScopes = {
  google: "openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar.readonly",
  microsoft: "openid profile offline_access User.Read Mail.Read Calendars.Read Files.Read Notes.Read",
};

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

    const instanceUrl = provider === "canvas" ? normalizeCanvasUrl(body?.instanceUrl) : null;
    const clientId = Deno.env.get(
      provider === "google" ? "GOOGLE_CLIENT_ID" : provider === "microsoft" ? "MICROSOFT_CLIENT_ID" : "CANVAS_CLIENT_ID",
    );
    const clientSecret = Deno.env.get(
      provider === "google" ? "GOOGLE_CLIENT_SECRET" : provider === "microsoft" ? "MICROSOFT_CLIENT_SECRET" : "CANVAS_CLIENT_SECRET",
    );
    if (!clientId || !clientSecret) {
      const credentials = provider === "google"
        ? "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
        : provider === "microsoft"
          ? "MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET"
          : "CANVAS_CLIENT_ID and CANVAS_CLIENT_SECRET";
      throw new Error(`Provider OAuth credentials are missing. Configure ${credentials} in Supabase Edge Function secrets.`);
    }
    const callbackUrl = new URL("/functions/v1/oauth-callback", getEnv("SUPABASE_URL")).toString();
    const state = createOAuthState();
    const admin = createAdminClient();
    const { error: insertError } = await admin.from("oauth_states").insert({
      state,
      user_id: user.id,
      provider,
      instance_url: instanceUrl,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (insertError) throw new Error("Could not prepare secure sign-in.");
    const { error: cleanupError } = await admin
      .from("oauth_states")
      .delete()
      .lt("expires_at", new Date().toISOString());
    if (cleanupError) throw new Error("Could not prepare secure sign-in.");

    let authorizationUrl: URL;
    if (provider === "google") {
      authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: "code",
        scope: providerScopes.google,
        state,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
      }).toString();
    } else if (provider === "microsoft") {
      authorizationUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
      authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: "code",
        response_mode: "query",
        scope: providerScopes.microsoft,
        state,
      }).toString();
    } else {
      if (!instanceUrl) throw new Error("Enter your school's Canvas URL.");
      authorizationUrl = new URL("/login/oauth2/auth", instanceUrl);
      authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: "code",
        state,
      }).toString();
    }

    return jsonResponse(request, { authorizationUrl: authorizationUrl.toString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized"
      ? 401
      : message.startsWith("Enter ") || message.startsWith("Use ") ||
          message.startsWith("This Canvas domain")
        ? 400
        : 503;
    const errorMessage = message === "Could not prepare secure sign-in."
      ? "OAuth state storage is unavailable. Apply the OAuth migrations and check the oauth-start function logs."
      : message || "Secure provider sign-in is not configured for this site yet.";
    return new Response(JSON.stringify({
      error: errorMessage,
    }), {
      status,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json",
      },
    });
  }
});
