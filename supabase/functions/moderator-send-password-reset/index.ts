import {
  createPublicClient,
  getEnv,
  jsonResponse,
  preflightResponse,
  requireModerator,
} from "../_shared/oauth.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  const preflight = preflightResponse(request);
  if (preflight) return preflight;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, 405);
  }

  try {
    const { user, admin } = await requireModerator(request);
    const body = await request.json();
    const targetUserId = body?.userId;
    if (typeof targetUserId !== "string" || !UUID_PATTERN.test(targetUserId)) {
      return jsonResponse(request, { error: "Select a valid member account." }, 400);
    }
    if (targetUserId === user.id) {
      return jsonResponse(request, { error: "Use Profile & settings to reset your own password." }, 400);
    }

    const { data: targetRole, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .eq("role", "moderator")
      .maybeSingle();
    if (roleError) throw new Error("Could not verify the selected member's role.");
    if (targetRole) {
      return jsonResponse(request, { error: "Password reset links cannot be sent to moderator accounts." }, 403);
    }

    const { data, error: userError } = await admin.auth.admin.getUserById(targetUserId);
    if (userError || !data.user) {
      return jsonResponse(request, { error: "Member account was not found." }, 404);
    }
    if (!data.user.email) {
      return jsonResponse(request, { error: "This account has no email address for a password reset link." }, 400);
    }

    const redirectTo = new URL("/?auth=recovery", getEnv("APP_URL")).toString();
    const { error } = await createPublicClient().auth.resetPasswordForEmail(data.user.email, { redirectTo });
    if (error) throw new Error("Supabase could not send the password reset email.");

    return jsonResponse(request, { sent: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return jsonResponse(
      request,
      {
        error: status === 401 || status === 403
          ? message
          : "Could not send the password reset email. Check the email setup and try again.",
      },
      status,
    );
  }
});
