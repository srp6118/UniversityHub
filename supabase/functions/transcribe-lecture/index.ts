import { getProviderCredentials } from "../_shared/assistant.ts";
import {
  createAdminClient,
  jsonResponse,
  preflightResponse,
  requireUser,
} from "../_shared/oauth.ts";

const AUDIO_BUCKET = "lecture-audio-temp";
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_TRANSCRIPT_LENGTH = 200_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE_PATH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webm|m4a|ogg|mp3|wav|aac)$/i;

class RequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateStoragePath(value: unknown, userId: string): string {
  if (typeof value !== "string") {
    throw new RequestError("The temporary recording could not be found. Record it again and try once more.");
  }
  const [ownerId, fileName, ...extra] = value.split("/");
  if (
    ownerId !== userId ||
    !fileName ||
    extra.length ||
    !STORAGE_PATH_PATTERN.test(fileName) ||
    !UUID_PATTERN.test(userId)
  ) {
    throw new RequestError("The temporary recording path is invalid.");
  }
  return value;
}

async function getTranscript(audio: Blob, fileName: string, apiKey: string): Promise<string> {
  const contentType = (audio.type || "audio/webm").split(";")[0].toLowerCase();
  if (!contentType.startsWith("audio/")) {
    throw new RequestError("This recording is not in a supported audio format.");
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    throw new RequestError("This recording is empty or larger than the 20 MB limit.");
  }

  const file = new File([audio], fileName, { type: contentType });
  const body = new FormData();
  body.append("file", file);
  body.append("model", "gpt-4o-mini-transcribe");
  body.append("response_format", "json");

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new RequestError("Could not reach OpenAI to transcribe this lecture. Check your connection and try again.", 502);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new RequestError("OpenAI rejected your API key. Reconnect it in Connections and try again.", 502);
    }
    if (response.status === 429) {
      throw new RequestError("OpenAI's API quota or rate limit was reached. Check your OpenAI account and try again.", 502);
    }
    if (response.status === 413) {
      throw new RequestError("OpenAI could not accept this recording. Try a shorter lecture.", 413);
    }
    throw new RequestError(`OpenAI transcription failed (${response.status}). Please try again.`, 502);
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new RequestError("OpenAI returned an unreadable transcript. Please try again.", 502);
  }
  const text = result && typeof result === "object" && "text" in result
    ? (result as { text?: unknown }).text
    : undefined;
  if (typeof text !== "string" || !text.trim()) {
    throw new RequestError("OpenAI returned an empty transcript. Try a clearer or longer recording.", 502);
  }
  if (text.length > MAX_TRANSCRIPT_LENGTH) {
    throw new RequestError("This transcript is too long to save. Try recording a shorter section.", 413);
  }
  return text.trim();
}

Deno.serve(async (request) => {
  const preflight = preflightResponse(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed." }, 405);

  try {
    const user = await requireUser(request);
    if (Number(request.headers.get("content-length") ?? 0) > 4_096) {
      throw new RequestError("The transcription request is too large.", 413);
    }
    const body: unknown = await request.json();
    const values = body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
    const title = typeof values.title === "string" ? values.title.trim() : "";
    const recordedOn = values.recordedOn;
    const durationSeconds = values.durationSeconds;
    const storagePath = validateStoragePath(values.storagePath, user.id);

    if (!title || title.length > 120) {
      throw new RequestError("Enter a lecture title of 1–120 characters.");
    }
    if (typeof recordedOn !== "string" || !isValidDate(recordedOn)) {
      throw new RequestError("Choose a valid lecture date.");
    }
    if (
      typeof durationSeconds !== "number" ||
      !Number.isInteger(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > 10_800
    ) {
      throw new RequestError("The recording duration is invalid. Record up to three hours at a time.");
    }

    const admin = createAdminClient();
    let transcript = "";
    let processingError: unknown = null;
    try {
      const credentials = await getProviderCredentials(admin, user.id, "openai");
      if (!credentials) {
        throw new RequestError("Connect your OpenAI API key in Connections before transcribing.", 400);
      }

      const { data: audio, error: downloadError } = await admin.storage
        .from(AUDIO_BUCKET)
        .download(storagePath);
      if (downloadError || !audio) {
        throw new RequestError("Could not retrieve the temporary recording. Please record it again.", 400);
      }
      transcript = await getTranscript(audio, storagePath.split("/").at(-1) ?? "lecture.webm", credentials.apiKey);
    } catch (error) {
      processingError = error;
    }

    const { error: cleanupError } = await admin.storage.from(AUDIO_BUCKET).remove([storagePath]);
    if (cleanupError) {
      console.error("Could not remove temporary lecture audio.", cleanupError);
      throw new RequestError("The temporary recording could not be deleted. Please contact support before trying again.", 500);
    }
    if (processingError) throw processingError;

    const { data: note, error: insertError } = await admin
      .from("lecture_notes")
      .insert({
        user_id: user.id,
        title,
        recorded_on: recordedOn,
        duration_seconds: durationSeconds,
        transcript,
      })
      .select("id, title, recorded_on, duration_seconds, transcript, created_at")
      .single();
    if (insertError || !note) {
      throw new Error("Could not save your transcript. Please try recording again.");
    }
    return jsonResponse(request, { note });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = error instanceof RequestError
      ? error.status
      : message === "Unauthorized"
        ? 401
        : 500;
    return jsonResponse(request, {
      error: message || "The lecture could not be transcribed. Please try again.",
    }, status);
  }
});
