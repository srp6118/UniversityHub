import {
  createAdminClient,
  getEnv,
  jsonResponse,
  preflightResponse,
  requireUser,
} from "../_shared/oauth.ts";

type PeriodType = "weekly" | "monthly";

function getPeriodEnd(type: PeriodType, start: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    throw new Error("Choose a valid budget period.");
  }
  const date = new Date(`${start}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== start) {
    throw new Error("Choose a valid budget period.");
  }
  if (
    (type === "weekly" && date.getUTCDay() !== 1) ||
    (type === "monthly" && date.getUTCDate() !== 1)
  ) {
    throw new Error("Choose a valid budget period.");
  }
  if (type === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  else date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(cents: bigint): string {
  const pounds = cents / 100n;
  const pence = String(cents % 100n).padStart(2, "0");
  return `£${new Intl.NumberFormat("en-GB").format(Number(pounds))}.${pence}`;
}

async function claimReminder(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  periodType: PeriodType,
  periodStart: string,
  threshold: number,
): Promise<string | null> {
  const { data: existing, error: existingError } = await admin
    .from("budget_email_reminders")
    .select("id, status, updated_at")
    .eq("user_id", userId)
    .eq("period_type", periodType)
    .eq("period_start", periodStart)
    .eq("threshold", threshold)
    .maybeSingle();
  if (existingError) throw new Error("Could not check the email reminder status.");
  if (existing) {
    if (existing.status === "sent") return null;
    const staleSending = existing.status === "sending" &&
      Date.now() - new Date(existing.updated_at).getTime() > 15 * 60 * 1000;
    if (existing.status !== "failed" && !staleSending) return null;
    const { data, error } = await admin
      .from("budget_email_reminders")
      .update({ status: "sending", updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("status", existing.status)
      .eq("updated_at", existing.updated_at)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("Could not claim the email reminder.");
    return data?.id ?? null;
  }

  const { data, error } = await admin
    .from("budget_email_reminders")
    .insert({
      user_id: userId,
      period_type: periodType,
      period_start: periodStart,
      threshold,
      status: "sending",
    })
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") return null;
  if (error) throw new Error("Could not claim the email reminder.");
  return data?.id ?? null;
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

Deno.serve(async (request) => {
  const preflight = preflightResponse(request);
  if (preflight) return preflight;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, 405);
  }

  try {
    const user = await requireUser(request);
    if (Number(request.headers.get("content-length") ?? 0) > 4096) {
      return jsonResponse(request, { error: "Request is too large." }, 413);
    }
    const body: unknown = await request.json();
    const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
    if (values.periodType !== "weekly" && values.periodType !== "monthly") {
      return jsonResponse(request, { error: "Choose a weekly or monthly budget period." }, 400);
    }
    const periodType: PeriodType = values.periodType;
    if (typeof values.periodStart !== "string") {
      return jsonResponse(request, { error: "Choose a valid budget period." }, 400);
    }
    const periodStart = values.periodStart;
    const periodEnd = getPeriodEnd(periodType, periodStart);
    const admin = createAdminClient();
    const [budgetResult, preferencesResult] = await Promise.all([
      admin.from("budget_periods")
        .select("limit_cents")
        .eq("user_id", user.id)
        .eq("period_type", periodType)
        .eq("period_start", periodStart)
        .maybeSingle(),
      admin.from("budget_reminder_preferences")
        .select("enabled, thresholds")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (budgetResult.error || preferencesResult.error) {
      throw new Error("Could not load budget reminder settings.");
    }
    const budget = budgetResult.data;
    const preferences = preferencesResult.data;
    if (!budget || Number(budget.limit_cents) <= 0 || !preferences?.enabled) {
      return jsonResponse(request, { sent: 0 });
    }

    const { data: dailyTotals, error: totalsError } = await admin
      .from("budget_expense_daily_totals")
      .select("amount_cents")
      .eq("user_id", user.id)
      .gte("spent_on", periodStart)
      .lt("spent_on", periodEnd);
    if (totalsError) throw new Error("Could not calculate budget spending.");
    const spentCents = (dailyTotals ?? []).reduce(
      (total, row) => total + BigInt(String(row.amount_cents || 0)),
      0n,
    );
    const limitCents = BigInt(String(budget.limit_cents));
    const reached = (preferences.thresholds as unknown[])
      .map(Number)
      .filter((threshold) => threshold === 80 || threshold === 100)
      .filter((threshold) => spentCents * 100n >= limitCents * BigInt(threshold));
    if (!reached.length) return jsonResponse(request, { sent: 0 });

    const { data: authData, error: authError } = await admin.auth.admin.getUserById(user.id);
    const email = authData.user?.email;
    if (authError || !email) {
      return jsonResponse(request, { error: "An email address is required for budget reminders." }, 400);
    }

    const from = Deno.env.get("BUDGET_REMINDER_FROM")?.trim() ||
      "University Hub <noreply@universityhub.org.uk>";
    const periodName = periodType === "weekly" ? "weekly" : "monthly";
    let sent = 0;
    for (const threshold of reached) {
      const reminderId = await claimReminder(admin, user.id, periodType, periodStart, threshold);
      if (!reminderId) continue;

      const amountLabel = formatCurrency(spentCents);
      const status = spentCents > limitCents
        ? `${formatCurrency(spentCents - limitCents)} over budget`
        : "at your budget limit";
      const subject = threshold === 100
        ? `Your ${periodName} budget has reached its limit`
        : `You have reached 80% of your ${periodName} budget`;
      const text = threshold === 100
        ? `You have spent ${amountLabel} of your ${periodName} budget (${status}). Review your Budget page in University Hub to see your spending and upcoming commitments.`
        : `You have spent ${amountLabel}, reaching at least 80% of your ${periodName} budget. Review your Budget page in University Hub to see your spending and upcoming commitments.`;
      const html = `<p>${escapeHtml(text)}</p><p><a href="https://www.universityhub.org.uk/#budget">Open your Budget page</a></p><p>You can change or turn off these emails in Budget → Spending thresholds.</p>`;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getEnv("RESEND_API_KEY")}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `budget-${user.id}-${periodType}-${periodStart}-${threshold}`,
          },
          body: JSON.stringify({ from, to: [email], subject, text, html }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error("Resend could not deliver the reminder.");
        const { error: sentError } = await admin.from("budget_email_reminders")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", reminderId);
        if (sentError) throw new Error("Could not record the email reminder.");
        sent += 1;
      } catch (error) {
        await admin.from("budget_email_reminders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", reminderId);
        throw error;
      }
    }
    return jsonResponse(request, { sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") return jsonResponse(request, { error: message }, 401);
    return jsonResponse(request, {
      error: message || "Could not send budget email reminders.",
    }, 500);
  }
});
