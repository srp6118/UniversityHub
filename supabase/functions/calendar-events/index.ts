import {
  createAdminClient,
  decryptTokenPayload,
  encryptTokenPayload,
  getEnv,
  jsonResponse,
  normalizeCanvasUrl,
  preflightResponse,
  requireUser,
} from "../_shared/oauth.ts";

type ProviderName = "google" | "microsoft" | "canvas";
type StoredToken = {
  user_id: string;
  provider: ProviderName;
  encrypted_payload: string;
  expires_at: string | null;
};
type OAuthPayload = Record<string, unknown> & {
  access_token?: string;
  refresh_token?: string;
  instance_url?: string;
};
type CalendarEvent = {
  id: string;
  provider: ProviderName;
  sourceLabel: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  kind: "event" | "deadline";
  url?: string;
};

const REQUEST_TIMEOUT_MS = 15_000;
const CALENDAR_LIMIT = 10;
const EVENT_LIMIT = 500;

function providerLabel(provider: ProviderName): string {
  return provider === "google" ? "Google Calendar" : provider === "microsoft" ? "Outlook Calendar" : "Canvas";
}

function secureLink(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function providerJson<T>(
  url: URL,
  accessToken: string,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, ...extraHeaders },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object") {
    const detail = response.status === 401 || response.status === 403
      ? "Reconnect this account and confirm calendar access is allowed."
      : `Provider request failed (${response.status}).`;
    throw new Error(detail);
  }
  return body as T;
}

async function refreshAccessToken(
  provider: ProviderName,
  token: OAuthPayload,
): Promise<OAuthPayload> {
  if (!token.refresh_token) throw new Error("Reconnect this account to continue.");
  let url: string;
  const form = new URLSearchParams({ grant_type: "refresh_token", refresh_token: token.refresh_token });
  if (provider === "google") {
    url = "https://oauth2.googleapis.com/token";
    form.set("client_id", getEnv("GOOGLE_CLIENT_ID"));
    form.set("client_secret", getEnv("GOOGLE_CLIENT_SECRET"));
  } else if (provider === "microsoft") {
    url = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    form.set("client_id", getEnv("MICROSOFT_CLIENT_ID"));
    form.set("client_secret", getEnv("MICROSOFT_CLIENT_SECRET"));
    form.set("scope", "openid profile offline_access User.Read Mail.Read Calendars.Read Files.Read Notes.Read");
  } else {
    url = `${normalizeCanvasUrl(token.instance_url)}/login/oauth2/token`;
    form.set("client_id", getEnv("CANVAS_CLIENT_ID"));
    form.set("client_secret", getEnv("CANVAS_CLIENT_SECRET"));
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const refreshed: unknown = await response.json().catch(() => null);
  if (
    !response.ok ||
    !refreshed ||
    typeof refreshed !== "object" ||
    Array.isArray(refreshed) ||
    typeof (refreshed as Record<string, unknown>).access_token !== "string"
  ) {
    throw new Error(`Could not refresh the ${providerLabel(provider)} connection.`);
  }
  const next = refreshed as Record<string, unknown>;
  const expiresIn = Number(next.expires_in);
  return {
    ...token,
    ...next,
    refresh_token: typeof next.refresh_token === "string" ? next.refresh_token : token.refresh_token,
    instance_url: token.instance_url,
    expires_at: Number.isFinite(expiresIn) && expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null,
  };
}

async function getValidToken(
  admin: ReturnType<typeof createAdminClient>,
  row: StoredToken,
): Promise<OAuthPayload> {
  let token = await decryptTokenPayload(row.encrypted_payload) as OAuthPayload;
  if (typeof token.access_token !== "string") {
    throw new Error(`${providerLabel(row.provider)} needs to be reconnected.`);
  }
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now() + 60_000) {
    token = await refreshAccessToken(row.provider, token);
    const { error } = await admin.from("oauth_tokens").update({
      encrypted_payload: await encryptTokenPayload(token),
      expires_at: typeof token.expires_at === "string" ? token.expires_at : null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", row.user_id).eq("provider", row.provider);
    if (error) throw new Error(`Could not update the ${providerLabel(row.provider)} connection.`);
  }
  return token;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function toGoogleEvent(value: unknown, calendarName: string): CalendarEvent | null {
  const event = asRecord(value);
  const start = asRecord(event?.start);
  const end = asRecord(event?.end);
  if (!event || event.status === "cancelled") return null;
  const startAt = typeof start?.dateTime === "string" ? start.dateTime : start?.date;
  const endAt = typeof end?.dateTime === "string" ? end.dateTime : end?.date;
  if (typeof event.id !== "string" || typeof startAt !== "string" || typeof endAt !== "string") return null;
  return {
    id: `google:${event.id}`,
    provider: "google",
    sourceLabel: calendarName ? `Google · ${calendarName}` : "Google Calendar",
    title: typeof event.summary === "string" && event.summary.trim() ? event.summary.slice(0, 240) : "Untitled event",
    startAt,
    endAt,
    allDay: typeof start?.date === "string",
    kind: "event",
    ...(secureLink(event.htmlLink) ? { url: secureLink(event.htmlLink) } : {}),
  };
}

async function getGoogleEvents(token: OAuthPayload, startAt: string, endAt: string): Promise<CalendarEvent[]> {
  const calendarListUrl = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
  calendarListUrl.searchParams.set("maxResults", "100");
  calendarListUrl.searchParams.set("fields", "items(id,summary,selected,primary)");
  const list = await providerJson<{ items?: unknown[] }>(calendarListUrl, token.access_token!);
  const calendars = (Array.isArray(list.items) ? list.items : [])
    .map(asRecord)
    .filter((calendar): calendar is Record<string, unknown> =>
      Boolean(calendar && typeof calendar.id === "string" && (calendar.primary === true || calendar.selected !== false))
    )
    .slice(0, CALENDAR_LIMIT);
  if (!calendars.length) throw new Error("No readable Google calendars were found.");

  const events: CalendarEvent[] = [];
  for (let index = 0; index < calendars.length; index += 3) {
    const batch = calendars.slice(index, index + 3);
    const batches = await Promise.all(batch.map(async (calendar) => {
      const name = typeof calendar.summary === "string" ? calendar.summary.slice(0, 80) : "";
      const calendarEvents: CalendarEvent[] = [];
      let pageToken: string | null = null;
      let pageCount = 0;
      do {
        pageCount += 1;
        const url = new URL(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(String(calendar.id))}/events`,
        );
        url.searchParams.set("timeMin", startAt);
        url.searchParams.set("timeMax", endAt);
        url.searchParams.set("singleEvents", "true");
        url.searchParams.set("orderBy", "startTime");
        url.searchParams.set("maxResults", "250");
        if (pageToken) url.searchParams.set("pageToken", pageToken);
        const response = await providerJson<{ items?: unknown[]; nextPageToken?: unknown }>(
          url,
          token.access_token!,
        );
        calendarEvents.push(...(Array.isArray(response.items) ? response.items : [])
          .map((item) => toGoogleEvent(item, name))
          .filter((event): event is CalendarEvent => event !== null));
        pageToken = typeof response.nextPageToken === "string" ? response.nextPageToken : null;
        if (pageToken && (calendarEvents.length >= EVENT_LIMIT || pageCount >= 3)) {
          throw new Error("This Google Calendar has too many events to sync safely for the selected range.");
        }
      } while (pageToken);
      return calendarEvents;
    }));
    for (const batchEvents of batches) {
      events.push(...batchEvents);
      if (events.length > EVENT_LIMIT) {
        throw new Error("There are too many Google Calendar events to sync safely for the selected range.");
      }
    }
  }
  return events;
}

function toMicrosoftEvent(value: unknown, calendarName: string): CalendarEvent | null {
  const event = asRecord(value);
  const start = asRecord(event?.start);
  const end = asRecord(event?.end);
  if (!event || event.isCancelled === true) return null;
  if (
    typeof event.id !== "string" ||
    typeof start?.dateTime !== "string" ||
    typeof end?.dateTime !== "string"
  ) return null;
  const normalizeDateTime = (date: Record<string, unknown>) => {
    let dateTime = String(date.dateTime).replace(/\.(\d{3})\d+$/, ".$1");
    if (date.timeZone === "UTC" && !/(?:Z|[+-]\d{2}:\d{2})$/i.test(dateTime)) {
      dateTime += "Z";
    }
    return dateTime;
  };
  return {
    id: `microsoft:${event.id}`,
    provider: "microsoft",
    sourceLabel: calendarName ? `Outlook · ${calendarName}` : "Outlook Calendar",
    title: typeof event.subject === "string" && event.subject.trim() ? event.subject.slice(0, 240) : "Untitled event",
    startAt: normalizeDateTime(start),
    endAt: normalizeDateTime(end),
    allDay: event.isAllDay === true,
    kind: "event",
    ...(secureLink(event.webLink) ? { url: secureLink(event.webLink) } : {}),
  };
}

async function getMicrosoftCalendarEvents(
  token: OAuthPayload,
  calendarId: string,
  calendarName: string,
  startAt: string,
  endAt: string,
): Promise<CalendarEvent[]> {
  let url: URL | null = new URL(
    `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/calendarView`,
  );
  url.searchParams.set("startDateTime", startAt);
  url.searchParams.set("endDateTime", endAt);
  url.searchParams.set("$top", "100");
  url.searchParams.set("$select", "id,subject,start,end,isAllDay,webLink,isCancelled");
  const events: CalendarEvent[] = [];
  let pageCount = 0;
  while (url && pageCount < 6) {
    pageCount += 1;
    const response = await providerJson<{ value?: unknown[]; "@odata.nextLink"?: unknown }>(
      url,
      token.access_token!,
      { Prefer: 'outlook.timezone="UTC"' },
    );
    events.push(...(Array.isArray(response.value) ? response.value : [])
      .map((item) => toMicrosoftEvent(item, calendarName))
      .filter((event): event is CalendarEvent => event !== null));
    const rawNextLink = response["@odata.nextLink"];
    if (rawNextLink === undefined) {
      url = null;
      continue;
    }
    const nextLink = secureLink(rawNextLink);
    if (!nextLink || new URL(nextLink).origin !== "https://graph.microsoft.com") {
      throw new Error("Outlook returned an unexpected calendar page address.");
    }
    url = new URL(nextLink);
  }
  if (url) throw new Error("This Outlook calendar has too many events to sync safely for the selected range.");
  return events;
}

async function getMicrosoftEvents(token: OAuthPayload, startAt: string, endAt: string): Promise<CalendarEvent[]> {
  const calendarsUrl = new URL("https://graph.microsoft.com/v1.0/me/calendars");
  calendarsUrl.searchParams.set("$select", "id,name");
  calendarsUrl.searchParams.set("$top", String(CALENDAR_LIMIT));
  const result = await providerJson<{ value?: unknown[] }>(calendarsUrl, token.access_token!);
  const calendars = (Array.isArray(result.value) ? result.value : [])
    .map(asRecord)
    .filter((calendar): calendar is Record<string, unknown> =>
      Boolean(calendar && typeof calendar.id === "string")
    )
    .slice(0, CALENDAR_LIMIT);
  if (!calendars.length) throw new Error("No readable Outlook calendars were found.");

  const events: CalendarEvent[] = [];
  for (let index = 0; index < calendars.length; index += 3) {
    const batch = calendars.slice(index, index + 3);
    const batches = await Promise.all(batch.map((calendar) =>
      getMicrosoftCalendarEvents(
        token,
        String(calendar.id),
        typeof calendar.name === "string" ? calendar.name.slice(0, 80) : "",
        startAt,
        endAt,
      )
    ));
    for (const batchEvents of batches) events.push(...batchEvents);
    if (events.length > EVENT_LIMIT ||
      (events.length === EVENT_LIMIT && index + batch.length < calendars.length)) {
      throw new Error("There are too many Outlook events to sync safely for the selected range.");
    }
  }
  return events;
}

async function getCanvasEvents(
  token: OAuthPayload,
  startAt: string,
  endAt: string,
): Promise<CalendarEvent[]> {
  const instanceUrl = normalizeCanvasUrl(token.instance_url);
  let url: URL | null = new URL(`${instanceUrl}/api/v1/users/self/upcoming_events`);
  url.searchParams.set("start_date", startAt);
  url.searchParams.set("end_date", endAt);
  url.searchParams.set("per_page", "100");
  const events: CalendarEvent[] = [];
  let pageCount = 0;
  while (url && pageCount < 5) {
    pageCount += 1;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token.access_token!}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(result)) {
      throw new Error(response.status === 401 || response.status === 403
        ? "Reconnect Canvas and confirm course-calendar access is allowed."
        : `Canvas calendar request failed (${response.status}).`);
    }
    events.push(...result.flatMap((value): CalendarEvent[] => {
      const event = asRecord(value);
      const assignment = asRecord(event?.assignment);
      const eventStart = typeof event?.start_at === "string"
        ? event.start_at
        : typeof assignment?.due_at === "string"
          ? assignment.due_at
          : null;
      if (!event || eventStart === null) return [];
      const title = typeof event.title === "string"
        ? event.title
        : typeof assignment?.name === "string"
          ? assignment.name
          : "Canvas item";
      const kind = event.type === "assignment" || assignment !== null ? "deadline" : "event";
      return [{
        id: `canvas:${String(event.id ?? `${eventStart}:${title}`)}`,
        provider: "canvas",
        sourceLabel: typeof event.context_name === "string" ? `Canvas · ${event.context_name.slice(0, 80)}` : "Canvas",
        title: title.slice(0, 240),
        startAt: eventStart,
        endAt: typeof event.end_at === "string" ? event.end_at : eventStart,
        allDay: event.all_day === true,
        kind,
        ...(secureLink(event.html_url) ? { url: secureLink(event.html_url) } : {}),
      }];
    }));
    const nextLink = response.headers.get("link")?.match(/<([^>]+)>\s*;\s*rel="?next"?/i)?.[1];
    if (!nextLink) {
      url = null;
      continue;
    }
    const next = new URL(nextLink, instanceUrl);
    if (next.origin !== instanceUrl || next.pathname !== "/api/v1/users/self/upcoming_events") {
      throw new Error("Canvas returned an unexpected calendar page address.");
    }
    url = next;
  }
  if (url) throw new Error("Too many Canvas events to sync safely for the selected range.");
  return events;
}

function parseRange(body: unknown): { startAt: string; endAt: string } {
  const input = asRecord(body);
  if (typeof input?.startAt !== "string" || typeof input.endAt !== "string") {
    throw new Error("A calendar date range is required.");
  }
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start >= end ||
    end.getTime() - start.getTime() > 31 * 24 * 60 * 60 * 1000
  ) {
    throw new Error("Choose a valid calendar range of 31 days or less.");
  }
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

Deno.serve(async (request) => {
  const preflight = preflightResponse(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed." }, 405);

  try {
    const user = await requireUser(request);
    const { startAt, endAt } = parseRange(await request.json());
    const admin = createAdminClient();
    const { data: tokens, error: tokenError } = await admin
      .from("oauth_tokens")
      .select("user_id, provider, encrypted_payload, expires_at")
      .eq("user_id", user.id)
      .in("provider", ["google", "microsoft", "canvas"]);
    if (tokenError) throw new Error("Could not load connected calendar sources.");

    const tokenByProvider = new Map(
      (tokens ?? []).map((token) => [token.provider as ProviderName, token as StoredToken]),
    );
    const sources: Record<ProviderName, { connected: boolean; error?: string; warning?: string }> = {
      google: { connected: tokenByProvider.has("google") },
      microsoft: { connected: tokenByProvider.has("microsoft") },
      canvas: { connected: tokenByProvider.has("canvas") },
    };
    const events: CalendarEvent[] = [];
    const results = await Promise.all((["google", "microsoft", "canvas"] as const).map(async (provider) => {
      const row = tokenByProvider.get(provider);
      if (!row) return;
      try {
        const token = await getValidToken(admin, row);
        const providerEvents = provider === "google"
          ? await getGoogleEvents(token, startAt, endAt)
          : provider === "microsoft"
            ? await getMicrosoftEvents(token, startAt, endAt)
            : await getCanvasEvents(token, startAt, endAt);
        const connectionProvider = provider === "google"
          ? "google_calendar"
          : provider === "microsoft"
            ? "outlook_calendar"
            : "canvas";
        const { error: syncError } = await admin.from("connections").update({
          last_synced_at: new Date().toISOString(),
          status: "connected",
        }).eq("user_id", row.user_id).eq("provider", connectionProvider);
        if (syncError) {
          sources[provider].warning = "Events loaded, but the last-sync status could not be saved.";
        }
        return providerEvents;
      } catch (error) {
        sources[provider].error = error instanceof Error ? error.message : `Could not sync ${providerLabel(provider)}.`;
        return [];
      }
    }));
    for (const providerEvents of results) {
      if (providerEvents) events.push(...providerEvents);
    }

    events.sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
    if (events.length > EVENT_LIMIT) {
      for (const source of Object.values(sources)) {
        if (source.connected && !source.error) {
          source.error = "Too many combined calendar entries to check planning suggestions safely.";
        }
      }
    }
    return jsonResponse(request, {
      events: events.slice(0, EVENT_LIMIT),
      sources,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar sync failed.";
    const status = message === "Unauthorized"
      ? 401
      : message.includes("date range") || message.startsWith("Choose a valid calendar range")
        ? 400
        : 503;
    return jsonResponse(request, { error: message }, status);
  }
});
