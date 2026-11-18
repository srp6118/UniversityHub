import { deleteUserAccount } from "../_shared/account.ts";
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
    if (body?.confirmation !== "DELETE") {
      return jsonResponse(request, { error: "Type DELETE to confirm account removal." }, 400);
    }

    await deleteUserAccount(createAdminClient(), user.id);
    return jsonResponse(request, { deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return jsonResponse(
      request,
      { error: message === "Unauthorized" ? message : "Account deletion failed. Please try again." },
      message === "Unauthorized" ? 401 : 500,
    );
  }
});
