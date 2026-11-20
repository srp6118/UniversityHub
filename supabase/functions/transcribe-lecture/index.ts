import { jsonResponse, preflightResponse } from "../_shared/oauth.ts";

Deno.serve((request) => {
  const preflight = preflightResponse(request);
  if (preflight) return preflight;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, 405);
  }
  return jsonResponse(request, {
    error: "Server transcription is disabled. Use browser speech recognition in Lecture notes.",
  }, 410);
});
