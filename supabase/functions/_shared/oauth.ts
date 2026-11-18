import { createClient } from "npm:@supabase/supabase-js@2";

export function getEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function createAdminClient() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  const secretKey = secretKeys
    ? (JSON.parse(secretKeys) as Record<string, unknown>).default
    : undefined;
  const apiKey = typeof secretKey === "string" && secretKey.trim()
    ? secretKey.trim()
    : getEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(getEnv("SUPABASE_URL"), apiKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createPublicClient() {
  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const publishableKey = publishableKeys
    ? (JSON.parse(publishableKeys) as Record<string, unknown>).default
    : undefined;
  const apiKey = typeof publishableKey === "string" && publishableKey.trim()
    ? publishableKey.trim()
    : getEnv("SUPABASE_ANON_KEY");
  return createClient(getEnv("SUPABASE_URL"), apiKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function corsHeaders(request: Request): HeadersInit {
  const configuredSiteUrl = Deno.env.get("APP_URL");
  let configuredOrigin: string | undefined;
  if (configuredSiteUrl) {
    try {
      configuredOrigin = new URL(configuredSiteUrl).origin;
    } catch {
      configuredOrigin = undefined;
    }
  }
  const allowedOrigins = [
    configuredOrigin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ].filter((value): value is string => Boolean(value));
  const requestedOrigin = request.headers.get("origin");
  const allowedOrigin = requestedOrigin && allowedOrigins.includes(requestedOrigin)
    ? requestedOrigin
    : configuredOrigin ?? "http://localhost:5173";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders(request),
  });
}

export function preflightResponse(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;
  return new Response("ok", { headers: corsHeaders(request) });
}

export async function requireUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("Unauthorized");

  const client = createPublicClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

export async function requireModerator(request: Request) {
  const user = await requireUser(request);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "moderator")
    .maybeSingle();
  if (error) throw new Error("Could not verify moderator access.");
  if (!data) throw new Error("Forbidden");
  return { user, admin };
}

export function normalizeCanvasUrl(input: unknown): string {
  if (typeof input !== "string") throw new Error("Enter your school's Canvas URL.");
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid Canvas URL beginning with https://.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Use your school's Canvas home URL, beginning with https://.");
  }

  const allowedHosts = (Deno.env.get("CANVAS_ALLOWED_HOSTS") ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new Error("This Canvas domain is not enabled for this University Hub deployment.");
  }
  return url.origin;
}

export function createOAuthState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return encodeBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function encryptTokenPayload(payload: unknown): Promise<string> {
  const rawKey = decodeBase64(getEnv("OAUTH_ENCRYPTION_KEY"));
  if (rawKey.length !== 32) throw new Error("OAUTH_ENCRYPTION_KEY must decode to 32 bytes.");
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return `v1.${encodeBase64(iv)}.${encodeBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptTokenPayload(encrypted: string): Promise<Record<string, unknown>> {
  const [version, encodedIv, encodedCiphertext, extra] = encrypted.split(".");
  if (version !== "v1" || !encodedIv || !encodedCiphertext || extra) {
    throw new Error("Stored provider credentials have an unsupported format.");
  }
  const rawKey = decodeBase64(getEnv("OAUTH_ENCRYPTION_KEY"));
  if (rawKey.length !== 32) throw new Error("OAUTH_ENCRYPTION_KEY must decode to 32 bytes.");
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(encodedIv) },
    key,
    decodeBase64(encodedCiphertext),
  );
  const payload: unknown = JSON.parse(new TextDecoder().decode(plaintext));
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Stored provider credentials are invalid.");
  }
  return payload as Record<string, unknown>;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new Error("Stored provider credentials or OAUTH_ENCRYPTION_KEY are invalid.");
  }
}
