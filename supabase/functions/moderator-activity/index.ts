import {
  jsonResponse,
  preflightResponse,
  requireModerator,
} from "../_shared/oauth.ts";

const PAGE_SIZE = 100;
const RECENT_MEMBER_LIMIT = 100;
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const WEEK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

Deno.serve(async (request) => {
  const preflight = preflightResponse(request);
  if (preflight) return preflight;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, 405);
  }

  try {
    const { admin } = await requireModerator(request);
    const body = await request.json();
    const requestedPage = Number(body?.page ?? 1);
    if (!Number.isInteger(requestedPage) || requestedPage < 1) {
      return jsonResponse(request, { error: "Select a valid member page." }, 400);
    }
    const accounts = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
      if (error) throw new Error("Could not load member accounts.");
      accounts.push(...data.users);
      if (data.users.length < PAGE_SIZE) break;
    }

    const { data: presence, error: presenceError } = await admin
      .from("user_presence")
      .select("user_id, last_seen_at");
    if (presenceError) throw new Error("Could not load online activity.");

    const now = Date.now();
    const lastSeenByUser = new Map(
      (presence ?? []).map((entry) => [entry.user_id, entry.last_seen_at]),
    );
    const activeNow = (presence ?? []).filter(
      (entry) => now - new Date(entry.last_seen_at).getTime() <= ACTIVE_WINDOW_MS,
    ).length;
    const activeLast7Days = (presence ?? []).filter(
      (entry) => now - new Date(entry.last_seen_at).getTime() <= WEEK_WINDOW_MS,
    ).length;
    accounts.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    const pageCount = Math.max(1, Math.ceil(accounts.length / RECENT_MEMBER_LIMIT));
    const page = Math.min(requestedPage, pageCount);
    const pageOffset = (page - 1) * RECENT_MEMBER_LIMIT;
    const pageAccounts = accounts.slice(pageOffset, pageOffset + RECENT_MEMBER_LIMIT);
    const userIds = pageAccounts.map((account) => account.id);
    const [profilesResult, rolesResult] = await Promise.all([
      admin.from("profiles").select("id, full_name").in("id", userIds),
      admin.from("user_roles").select("user_id").eq("role", "moderator").in("user_id", userIds),
    ]);
    if (profilesResult.error || rolesResult.error) {
      throw new Error("Could not load member details.");
    }

    const nameByUser = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]));
    const moderators = new Set((rolesResult.data ?? []).map((role) => role.user_id));
    const users = pageAccounts.map((account) => {
      const lastSeenAt = lastSeenByUser.get(account.id) ?? null;
      return {
        id: account.id,
        email: account.email ?? "",
        name: nameByUser.get(account.id) || account.user_metadata?.full_name || "",
        createdAt: account.created_at,
        lastSignInAt: account.last_sign_in_at ?? null,
        lastSeenAt,
        isActive: Boolean(lastSeenAt && now - new Date(lastSeenAt).getTime() <= ACTIVE_WINDOW_MS),
        isModerator: moderators.has(account.id),
      };
    });

    return jsonResponse(request, {
      totalUsers: accounts.length,
      activeNow,
      activeLast7Days,
      page,
      pageCount,
      users,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return jsonResponse(
      request,
      {
        error: status === 401 || status === 403
          ? message
          : "Could not load moderator activity. Check that the latest migrations and Edge Functions are deployed.",
      },
      status,
    );
  }
});
