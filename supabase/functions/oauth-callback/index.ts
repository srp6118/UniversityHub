import {
  createAdminClient,
  encryptTokenPayload,
  getEnv,
} from "../_shared/oauth.ts";

type Provider = "google" | "microsoft" | "canvas";

function returnToApp(connection: "success" | "cancelled" | "error", provider?: string): Response {
  const destination = new URL("/", getEnv("APP_URL"));
  destination.searchParams.set("connection", connection);
  if (provider) destination.searchParams.set("provider", provider);
  destination.hash = "connections";
  return Response.redirect(destination.toString(), 303);
}

async function exchangeCode(
  tokenUrl: string,
  form: URLSearchParams,
  clientSecret: string,
): Promise<Record<string, unknown>> {
  form.set("client_secret", clientSecret);
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const token = await response.json().catch(() => null);
  if (!response.ok || !token?.access_token) {
    throw new Error("Provider token exchange failed.");
  }
  return token;
}

async function getAccountLabel(provider: Provider, accessToken: string, instanceUrl: string | null) {
  let endpoint: string;
  if (provider === "google") {
    endpoint = "https://openidconnect.googleapis.com/v1/userinfo";
  } else if (provider === "microsoft") {
    endpoint = "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName";
  } else {
    if (!instanceUrl) throw new Error("Canvas instance was not saved.");
    endpoint = `${instanceUrl}/api/v1/users/self`;
  }

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const account = await response.json().catch(() => null);
  if (!response.ok || !account) throw new Error("Provider account check failed.");

  if (provider === "google") return account.email ?? account.name ?? null;
  if (provider === "microsoft") {
    return account.mail ?? account.userPrincipalName ?? account.displayName ?? null;
  }
  return account.email ?? account.short_name ?? account.name ?? null;
}

Deno.serve(async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed.", { status: 405 });
  const callback = new URL(request.url);
  const state = callback.searchParams.get("state");
  if (!state) return returnToApp("error");

  let usedProvider: Provider | undefined;
  try {
    const admin = createAdminClient();
    const { data: stateRow, error: stateError } = await admin
      .from("oauth_states")
      .delete()
      .select("user_id, provider, instance_url")
      .eq("state", state)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (stateError || !stateRow) return returnToApp("error");

    const provider = stateRow.provider as Provider;
    usedProvider = provider;
    if (callback.searchParams.has("error")) return returnToApp("cancelled", provider);
    const code = callback.searchParams.get("code");
    if (!code) return returnToApp("error", provider);

    const redirectUri = new URL(
      "/functions/v1/oauth-callback",
      getEnv("SUPABASE_URL"),
    ).toString();
    let token: Record<string, unknown>;

    if (provider === "google") {
      token = await exchangeCode(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          client_id: getEnv("GOOGLE_CLIENT_ID"),
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
        getEnv("GOOGLE_CLIENT_SECRET"),
      );
    } else if (provider === "microsoft") {
      token = await exchangeCode(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        new URLSearchParams({
          client_id: getEnv("MICROSOFT_CLIENT_ID"),
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          scope: "openid profile offline_access User.Read Mail.Read Calendars.Read Files.Read Notes.Read",
        }),
        getEnv("MICROSOFT_CLIENT_SECRET"),
      );
    } else {
      if (!stateRow.instance_url) throw new Error("Canvas instance was not saved.");
      token = await exchangeCode(
        `${stateRow.instance_url}/login/oauth2/token`,
        new URLSearchParams({
          client_id: getEnv("CANVAS_CLIENT_ID"),
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
        getEnv("CANVAS_CLIENT_SECRET"),
      );
    }

    const accessToken = token.access_token;
    if (typeof accessToken !== "string") throw new Error("Provider did not issue an access token.");
    const accountLabel = await getAccountLabel(provider, accessToken, stateRow.instance_url);
    const expiresIn = Number(token.expires_in);
    const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;
    const scopes = typeof token.scope === "string"
      ? token.scope.split(/\s+/).filter(Boolean)
      : [];
    const encryptedPayload = await encryptTokenPayload({
      ...token,
      instance_url: stateRow.instance_url,
      obtained_at: new Date().toISOString(),
    });

    const { error: saveError } = await admin.rpc("store_oauth_connection", {
      p_user_id: stateRow.user_id,
      p_provider: provider,
      p_encrypted_payload: encryptedPayload,
      p_scopes: scopes,
      p_expires_at: expiresAt,
      p_account_label: accountLabel,
    });
    if (saveError) throw new Error("Could not save provider connection.");
    return returnToApp("success", provider);
  } catch {
    return returnToApp("error", usedProvider);
  }
});
