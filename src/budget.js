const MAX_AMOUNT_CENTS = 100_000_000;
const STUDENT_WEEKLY_GUIDE_CENTS = 20_000;
const SLIDER_SCALE_STEP_CENTS = 10_000;
const CATEGORY_NAMES = {
  food: "Food",
  transport: "Transport",
  study: "Study",
  social: "Social",
  other: "Other",
};
const CATEGORY_KEYS = Object.keys(CATEGORY_NAMES);

function localDateString(date = new Date()) {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateFromString(value) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date;
}

function periodFor(type, value = localDateString()) {
  const date = typeof value === "string" ? dateFromString(value) : new Date(value);
  if (type === "weekly") {
    const weekdayFromMonday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - weekdayFromMonday);
  } else {
    date.setDate(1);
  }
  const start = localDateString(date);
  const endDate = new Date(date);
  if (type === "weekly") endDate.setDate(endDate.getDate() + 7);
  else endDate.setMonth(endDate.getMonth() + 1);
  return { type, start, end: localDateString(endDate) };
}

function shiftPeriod(period, amount) {
  const date = dateFromString(period.start);
  if (period.type === "weekly") date.setDate(date.getDate() + amount * 7);
  else date.setMonth(date.getMonth() + amount);
  return periodFor(period.type, date);
}

function formatCurrency(cents) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(cents || 0) / 100);
}

function amountToCents(value) {
  const match = String(value).trim().match(/^(\d{1,7})(?:\.(\d{0,2}))?$/);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= MAX_AMOUNT_CENTS ? cents : null;
}

function centsToInput(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", options).format(dateFromString(value));
}

function periodLabel(period) {
  const current = periodFor(period.type);
  if (period.start === current.start) return period.type === "weekly" ? "This week" : "This month";
  if (period.type === "monthly") {
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" })
      .format(dateFromString(period.start));
  }
  return `Week of ${formatDate(period.start)}`;
}

function periodRange(period) {
  const lastDay = dateFromString(period.end);
  lastDay.setDate(lastDay.getDate() - 1);
  return `${formatDate(period.start)} – ${formatDate(localDateString(lastDay))}`;
}

function dateInPeriod(date, period) {
  return date >= period.start && date < period.end;
}

function addRecurrence(dateValue, recurrence) {
  const date = dateFromString(dateValue);
  if (recurrence === "weekly") date.setDate(date.getDate() + 7);
  else {
    const day = date.getDate();
    const month = recurrence === "monthly" ? date.getMonth() + 1 : date.getMonth();
    const year = recurrence === "yearly" ? date.getFullYear() + 1 : date.getFullYear();
    date.setDate(1);
    date.setFullYear(year, month, 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return localDateString(date);
}

function recurringOccurrences(cost, period) {
  const today = localDateString();
  if (period.end <= today) return [];
  let dueOn = cost.next_due_on;
  let advances = 0;
  while (dueOn < today && advances < 2400) {
    dueOn = addRecurrence(dueOn, cost.recurrence);
    advances += 1;
  }
  const occurrences = [];
  while (dueOn < period.end && advances < 2500) {
    if (dueOn >= period.start && dueOn >= today) occurrences.push(dueOn);
    dueOn = addRecurrence(dueOn, cost.recurrence);
    advances += 1;
  }
  return occurrences;
}

function overOrRemaining(cents, noun = "remaining") {
  return cents < 0
    ? `${formatCurrency(-cents)} over ${noun === "remaining" ? "budget" : "limit"}`
    : `${formatCurrency(cents)} ${noun}`;
}

export function initializeBudget({ supabase, getCurrentUserId, getCurrentUserEmail }) {
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    overviewEmpty: $("#overview-budget-empty"),
    overviewSummary: $("#overview-budget-summary"),
    overviewSpent: $("#overview-spent"),
    overviewLimit: $("#overview-limit"),
    overviewRemainingLabel: $("#overview-remaining-label"),
    overviewRemaining: $("#overview-remaining"),
    overviewProgress: $("#overview-progress"),
    overviewProgressFill: $("#overview-progress-fill"),
    overviewCategorySummary: $("#overview-category-summary"),
    overviewMessage: $("#overview-budget-message"),
    overviewAddExpense: $("#overview-add-expense"),
    budgetAddExpense: $("#budget-add-expense"),
    expenseDialog: $("#budget-expense-dialog"),
    expenseForm: $("#budget-expense-form"),
    expenseId: $("#budget-expense-id"),
    expenseAmount: $("#budget-expense-amount"),
    expenseDate: $("#budget-expense-date"),
    expenseCategory: $("#budget-expense-category"),
    expenseEvent: $("#budget-expense-event"),
    expenseNote: $("#budget-expense-note"),
    expenseHeading: $("#budget-expense-heading"),
    expenseMessage: $("#budget-expense-message"),
    expenseSave: $("#budget-expense-save"),
    expenseClose: $("#budget-expense-close"),
    expenseCancel: $("#budget-expense-cancel"),
    pageMessage: $("#budget-page-message"),
    periodType: $("#budget-period-type"),
    periodLabel: $("#budget-period-label"),
    periodDates: $("#budget-period-dates"),
    periodPrevious: $("#budget-period-previous"),
    periodCurrent: $("#budget-period-current"),
    periodNext: $("#budget-period-next"),
    spentTotal: $("#budget-spent-total"),
    spentCaption: $("#budget-spent-caption"),
    remainingLabel: $("#budget-remaining-label"),
    remainingTotal: $("#budget-remaining-total"),
    limitCaption: $("#budget-limit-caption"),
    committedTotal: $("#budget-committed-total"),
    safeTotal: $("#budget-safe-total"),
    safeCaption: $("#budget-safe-caption"),
    progress: $("#budget-progress"),
    progressFill: $("#budget-progress-fill"),
    progressCopy: $("#budget-summary-copy"),
    progressPercent: $("#budget-progress-percent"),
    limitHeading: $("#budget-limit-heading"),
    limitForm: $("#budget-limit-form"),
    limitSlider: $("#budget-limit-slider"),
    limitInput: $("#budget-limit-input"),
    limitSave: $("#budget-limit-save"),
    limitPreview: $("#budget-limit-preview"),
    limitPresets: $("#budget-limit-presets"),
    limitHelp: $("#budget-limit-help"),
    categoryLimits: $("#budget-category-limits"),
    categoryPreview: $("#budget-category-preview"),
    categorySave: $("#budget-category-save"),
    allocationCopy: $("#budget-allocation-copy"),
    unallocated: $("#budget-unallocated"),
    categoryBreakdown: $("#budget-category-breakdown"),
    noExpenses: $("#budget-no-expenses"),
    expenseList: $("#budget-expense-list"),
    noExpenseList: $("#budget-no-expense-list"),
    expenseCount: $("#budget-expense-count"),
    eventForm: $("#budget-event-form"),
    eventId: $("#budget-event-id"),
    eventName: $("#budget-event-name"),
    eventDate: $("#budget-event-date"),
    eventNote: $("#budget-event-note"),
    eventLimitSlider: $("#budget-event-limit-slider"),
    eventLimit: $("#budget-event-limit"),
    eventLimitPreview: $("#budget-event-limit-preview"),
    eventSave: $("#budget-event-save"),
    eventCancel: $("#budget-event-cancel"),
    eventList: $("#budget-event-list"),
    noEvents: $("#budget-no-events"),
    recurringForm: $("#budget-recurring-form"),
    recurringId: $("#budget-recurring-id"),
    recurringTitle: $("#budget-recurring-title"),
    recurringAmount: $("#budget-recurring-amount"),
    recurringCategory: $("#budget-recurring-category"),
    recurringInterval: $("#budget-recurring-interval"),
    recurringDue: $("#budget-recurring-due"),
    recurringNote: $("#budget-recurring-note"),
    recurringList: $("#budget-recurring-list"),
    noRecurring: $("#budget-no-recurring"),
    remindersEnabled: $("#budget-reminders-enabled"),
    reminder80: $("#budget-reminder-80"),
    reminder100: $("#budget-reminder-100"),
    reminderAddress: $("#budget-reminder-address"),
    reminderSave: $("#budget-reminder-save"),
    reminderMessage: $("#budget-reminder-message"),
  };

  const today = localDateString();
  for (const select of [elements.expenseCategory, elements.recurringCategory]) {
    for (const [value, label] of Object.entries(CATEGORY_NAMES)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
  }
  elements.expenseDate.max = today;
  elements.expenseDate.value = today;
  elements.recurringDue.min = today;
  elements.eventDate.value = today;
  elements.limitSlider.max = String(STUDENT_WEEKLY_GUIDE_CENTS);
  elements.limitSlider.step = "100";
  elements.eventLimitSlider.max = String(STUDENT_WEEKLY_GUIDE_CENTS);
  elements.eventLimitSlider.step = "100";

  let userId = null;
  let pagePeriod = periodFor("weekly");
  let overviewType = "weekly";
  let activeBudget = null;
  let draftLimitCents = 0;
  let savedCategoryLimits = {};
  let draftCategoryLimits = {};
  let pageData = null;
  let loadVersion = 0;
  let overviewVersion = 0;
  let saving = false;
  let eventInitialValues = null;

  function isCurrentSession(id = userId) {
    return Boolean(id && id === userId && id === getCurrentUserId());
  }

  function totalFromDailyTotals(rows) {
    return rows.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  }

  function countFromDailyTotals(rows) {
    return rows.reduce((sum, row) => sum + Number(row.expense_count || 0), 0);
  }

  function getExpensesInPeriod(expenses, period) {
    return expenses.filter((expense) => dateInPeriod(expense.spent_on, period));
  }

  function getCommitments(costs, period) {
    const result = [];
    for (const cost of costs) {
      for (const dueOn of recurringOccurrences(cost, period)) {
        result.push({ ...cost, occurrence_due_on: dueOn });
      }
    }
    return result;
  }

  function setProgress(track, fill, amount, limit) {
    const percent = limit > 0 ? Math.floor(amount * 100 / limit) : 0;
    const width = Math.max(0, Math.min(100, percent));
    track.setAttribute("aria-valuenow", String(Math.min(100, percent)));
    track.setAttribute("aria-valuetext", limit > 0 ? `${percent}% of budget spent` : "No budget limit set");
    track.classList.toggle("is-over", limit > 0 && amount > limit);
    fill.style.width = `${width}%`;
    return percent;
  }

  function renderOverview(snapshot) {
    if (!isCurrentSession()) return;
    const budget = snapshot.budget;
    elements.overviewEmpty.hidden = Boolean(budget);
    elements.overviewSummary.hidden = !budget;
    elements.overviewMessage.textContent = "";
    if (!budget) return;

    const totals = snapshot.expenseTotals.filter((row) => dateInPeriod(row.spent_on, snapshot.period));
    const spent = totalFromDailyTotals(totals);
    const limit = Number(budget.limit_cents);
    const left = limit - spent;
    elements.overviewSpent.textContent = formatCurrency(spent);
    elements.overviewLimit.textContent = formatCurrency(limit);
    elements.overviewRemainingLabel.textContent = left < 0 ? "Over budget" : "Remaining";
    elements.overviewRemaining.textContent = left < 0
      ? `${formatCurrency(-left)} over budget`
      : formatCurrency(left);
    elements.overviewRemaining.parentElement.classList.toggle("is-over", left < 0);
    setProgress(elements.overviewProgress, elements.overviewProgressFill, spent, limit);
    const byCategory = {};
    for (const item of totals) {
      byCategory[item.category] = (byCategory[item.category] || 0) + Number(item.amount_cents);
    }
    const largest = Object.entries(byCategory)
      .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
      .slice(0, 3)
      .map(([category, cents]) => `${CATEGORY_NAMES[category] || CATEGORY_NAMES.other} ${formatCurrency(cents)}`);
    elements.overviewCategorySummary.textContent = largest.length
      ? `Top categories · ${largest.join(" · ")}`
      : "No expenses recorded this period.";
  }

  async function fetchOverview(period, requestUserId) {
    if (!supabase || !isCurrentSession(requestUserId)) return;
    const requestVersion = ++overviewVersion;
    elements.overviewMessage.textContent = "Loading expenditure…";
    const end = period.end;
    const [budgetResult, expenseResult] = await Promise.all([
      supabase.from("budget_periods")
        .select("id, limit_cents")
        .eq("user_id", requestUserId)
        .eq("period_type", period.type)
        .eq("period_start", period.start)
        .maybeSingle(),
      supabase.from("budget_expense_daily_totals")
        .select("amount_cents, spent_on, category")
        .eq("user_id", requestUserId)
        .gte("spent_on", period.start)
        .lt("spent_on", end)
        .limit(1000),
    ]);
    if (!isCurrentSession(requestUserId) || requestVersion !== overviewVersion) return;
    const error = budgetResult.error || expenseResult.error;
    if (error) {
      elements.overviewMessage.textContent = "Expenditure could not be loaded. Open Budget to retry.";
      return;
    }
    renderOverview({
      period,
      budget: budgetResult.data,
      expenseTotals: expenseResult.data || [],
    });
  }

  function updatePeriodHeading() {
    elements.periodLabel.textContent = periodLabel(pagePeriod);
    elements.periodDates.textContent = periodRange(pagePeriod);
    elements.periodType.value = pagePeriod.type;
    elements.limitHeading.textContent = `Set your ${pagePeriod.type} limit`;
    elements.limitHelp.textContent = pagePeriod.type === "weekly"
      ? "The weekly guide starts at £0–£200 for day-to-day student spending, excluding rent. Choose a higher preset or enter your own amount; rent and fixed costs can be tracked separately under recurring costs."
      : "Monthly suggestions are based on the weekly student-spending guide, excluding rent. Choose a higher preset or enter your own amount; rent and fixed costs can be tracked separately under recurring costs.";
    const presetLabel = elements.limitPresets.querySelector("span");
    presetLabel.textContent = pagePeriod.type === "weekly"
      ? "Student guide & higher options"
      : "Monthly equivalents & higher options";
    updateBudgetPresetButtons();
  }

  function getBudgetSliderFloor() {
    return pagePeriod.type === "weekly"
      ? STUDENT_WEEKLY_GUIDE_CENTS
      : Math.ceil((STUDENT_WEEKLY_GUIDE_CENTS * 52 / 12) / 100) * 100;
  }

  function setSliderScale(slider, amount, floor = getBudgetSliderFloor()) {
    const scaledAmount = Math.ceil(Math.max(0, Number(amount) || 0) / SLIDER_SCALE_STEP_CENTS) *
      SLIDER_SCALE_STEP_CENTS;
    slider.max = String(Math.min(MAX_AMOUNT_CENTS, Math.max(floor, scaledAmount)));
    slider.step = "100";
  }

  function updateBudgetPresetButtons() {
    elements.limitPresets.querySelectorAll("[data-budget-preset]").forEach((button) => {
      const weeklyPounds = Number(button.dataset.budgetPreset);
      const amount = pagePeriod.type === "weekly"
        ? weeklyPounds * 100
        : Math.round(weeklyPounds * 52 / 12) * 100;
      const label = formatCurrency(amount).replace(/\.00$/, "");
      button.textContent = label;
      button.setAttribute("aria-label", `Set ${label} ${pagePeriod.type} budget`);
      button.setAttribute("aria-pressed", String(draftLimitCents === amount));
    });
  }

  function updateLimitPreview() {
    setSliderScale(elements.limitSlider, draftLimitCents);
    elements.limitSlider.value = String(draftLimitCents);
    elements.categoryLimits.querySelectorAll('input[type="range"]').forEach((slider) => {
      const category = slider.dataset.category;
      setSliderScale(slider, Math.max(draftLimitCents, Number(draftCategoryLimits[category] || 0)));
    });
    updateBudgetPresetButtons();
    const savedLimit = activeBudget ? Number(activeBudget.limit_cents) : 0;
    elements.limitPreview.hidden = draftLimitCents === savedLimit;
    const savedAllocations = Object.values(savedCategoryLimits).reduce((sum, cents) => sum + Number(cents || 0), 0);
    elements.limitSave.disabled = saving || savedAllocations > draftLimitCents;
    updateTotals();
    updateAllocationSummary();
    updateEventPlanOutputs();
  }

  function updateTotals() {
    if (!pageData) return;
    const periodTotals = pageData.expenseTotals.filter((row) => dateInPeriod(row.spent_on, pagePeriod));
    const spent = totalFromDailyTotals(periodTotals);
    const commitments = getCommitments(pageData.recurringCosts, pagePeriod);
    const committed = commitments.reduce((sum, cost) => sum + Number(cost.amount_cents), 0);
    const hasBudget = Boolean(activeBudget);
    const limit = hasBudget ? draftLimitCents : 0;
    const remaining = limit - spent;
    const safe = limit - spent - committed;

    elements.spentTotal.textContent = formatCurrency(spent);
    const expenseCount = countFromDailyTotals(periodTotals);
    elements.spentCaption.textContent = `${expenseCount} recorded ${expenseCount === 1 ? "expense" : "expenses"}`;
    elements.remainingLabel.textContent = remaining < 0 ? "Over budget" : "Remaining";
    elements.remainingTotal.textContent = !hasBudget
      ? "Set a budget"
      : remaining < 0
        ? `${formatCurrency(-remaining)} over budget`
        : formatCurrency(remaining);
    elements.remainingTotal.parentElement.classList.toggle("is-over", hasBudget && remaining < 0);
    elements.limitCaption.textContent = hasBudget
      ? `Limit ${formatCurrency(limit)}${elements.limitPreview.hidden ? "" : " · preview"}`
      : "Set a period limit below";
    elements.committedTotal.textContent = formatCurrency(committed);
    elements.safeTotal.textContent = !hasBudget
      ? "Set a budget"
      : safe < 0
        ? `${formatCurrency(-safe)} short`
        : formatCurrency(safe);
    elements.safeCaption.textContent = safe < 0 && hasBudget
      ? "Your planned commitments exceed what remains."
      : "Budget less actual spending and upcoming commitments";
    elements.remainingTotal.parentElement.classList.toggle("is-over", hasBudget && remaining < 0);
    elements.safeTotal.parentElement.classList.toggle("is-safe-negative", hasBudget && safe < 0);

    const percent = setProgress(elements.progress, elements.progressFill, spent, limit);
    elements.progressPercent.textContent = hasBudget ? `${percent}%${spent > limit ? "+" : ""}` : "No limit";
    elements.progressCopy.textContent = !hasBudget
      ? "Set a budget to begin planning."
      : remaining < 0
        ? `${formatCurrency(-remaining)} over the ${pagePeriod.type} limit.`
        : `${formatCurrency(remaining)} remains before upcoming commitments.`;
    elements.noExpenses.hidden = expenseCount > 0;
    elements.noExpenseList.hidden = expenseCount > 0;
    renderCategoryBreakdown(periodTotals, limit);
  }

  function updateAllocationSummary() {
    const allocated = Object.values(draftCategoryLimits).reduce((sum, cents) => sum + Number(cents || 0), 0);
    const difference = draftLimitCents - allocated;
    const overAllocated = difference < 0;
    elements.allocationCopy.textContent = overAllocated
      ? `${formatCurrency(-difference)} above the overall limit. Reduce allocations or raise the budget.`
      : `${formatCurrency(allocated)} allocated across categories.`;
    elements.unallocated.textContent = overAllocated
      ? `Over by ${formatCurrency(-difference)}`
      : `Unallocated: ${formatCurrency(difference)}`;
    elements.unallocated.classList.toggle("is-over", overAllocated);
    const allocationsUnchanged = CATEGORY_KEYS.every((category) =>
      Number(draftCategoryLimits[category] || 0) === Number(savedCategoryLimits[category] || 0)
    );
    elements.categoryPreview.hidden = allocationsUnchanged;
    elements.categorySave.disabled = !activeBudget ||
      overAllocated ||
      allocated > Number(activeBudget.limit_cents) ||
      allocationsUnchanged ||
      saving;
  }

  function renderCategoryControls() {
    elements.categoryLimits.replaceChildren();
    for (const [category, label] of Object.entries(CATEGORY_NAMES)) {
      const row = document.createElement("div");
      row.className = "budget-category-row";
      const name = document.createElement("span");
      name.className = "budget-category-name";
      name.textContent = label;
      const range = document.createElement("input");
      range.type = "range";
      range.min = "0";
      setSliderScale(range, Math.max(draftLimitCents, Number(draftCategoryLimits[category] || 0)));
      range.value = String(draftCategoryLimits[category] || 0);
      range.setAttribute("aria-label", `${label} category limit slider`);
      range.dataset.category = category;
      const field = document.createElement("label");
      field.className = "budget-money-field";
      const fieldLabel = document.createElement("span");
      fieldLabel.className = "visually-hidden";
      fieldLabel.textContent = `${label} category limit in pounds`;
      const currencySymbol = document.createElement("span");
      currencySymbol.textContent = "£";
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "1000000";
      input.step = "0.01";
      input.inputMode = "decimal";
      input.value = centsToInput(draftCategoryLimits[category] || 0);
      input.setAttribute("aria-label", `${label} category limit in pounds`);
      input.dataset.category = category;
      field.append(fieldLabel, currencySymbol, input);
      range.addEventListener("input", () => {
        const cents = Number(range.value);
        input.value = centsToInput(cents);
        draftCategoryLimits[category] = cents;
        updateAllocationSummary();
        renderCategoryBreakdown(pageData.expenseTotals, draftLimitCents);
      });
      input.addEventListener("input", () => {
        const cents = amountToCents(input.value);
        if (cents === null) return;
        setSliderScale(range, Math.max(draftLimitCents, cents));
        range.value = String(cents);
        draftCategoryLimits[category] = cents;
        updateAllocationSummary();
        renderCategoryBreakdown(pageData.expenseTotals, draftLimitCents);
      });
      row.append(name, range, field);
      elements.categoryLimits.append(row);
    }
    updateAllocationSummary();
  }

  function renderCategoryBreakdown(dailyTotals, limit) {
    const categoryTotals = Object.fromEntries(CATEGORY_KEYS.map((category) => [category, 0]));
    for (const item of dailyTotals) {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount_cents);
    }
    elements.categoryBreakdown.replaceChildren();
    for (const [category, label] of Object.entries(CATEGORY_NAMES)) {
      const amount = categoryTotals[category] || 0;
      const allocated = Number(draftCategoryLimits[category] || 0);
      if (amount === 0 && allocated === 0) continue;
      const row = document.createElement("div");
      row.className = "budget-category-bar";
      const name = document.createElement("span");
      name.textContent = label;
      const track = document.createElement("div");
      track.className = "budget-progress-track";
      const fill = document.createElement("span");
      fill.style.width = `${allocated > 0
        ? Math.min(100, Math.floor(amount * 100 / allocated))
        : limit > 0
          ? Math.min(100, Math.floor(amount * 100 / limit))
          : amount > 0 ? 100 : 0}%`;
      if (allocated > 0 && amount > allocated) track.classList.add("is-over");
      track.append(fill);
      const value = document.createElement("strong");
      value.textContent = allocated > 0
        ? `${formatCurrency(amount)} / ${formatCurrency(allocated)}`
        : formatCurrency(amount);
      row.append(name, track, value);
      elements.categoryBreakdown.append(row);
    }
  }

  function updateEventPlanOutputs() {
    for (const card of elements.eventList.querySelectorAll(".budget-event-card")) {
      const eventId = card.dataset.eventId;
      const event = pageData?.events.find((item) => item.id === eventId);
      if (!event) continue;
      const plannedInput = card.querySelector("[data-plan-amount]");
      const planned = amountToCents(plannedInput.value) ?? 0;
      const eventSpent = Number(pageData.eventTotals.find((item) => item.event_id === event.id)?.amount_cents || 0);
      const eventLimit = Number(event.limit_cents);
      const eventProjected = eventSpent + planned;
      const eventLeft = eventLimit - eventProjected;
      const periodSpent = totalFromDailyTotals(
        pageData.expenseTotals.filter((row) => dateInPeriod(row.spent_on, pagePeriod)),
      );
      const periodLimit = activeBudget ? draftLimitCents : 0;
      const periodProjected = periodSpent + planned;
      const overallLeft = periodLimit - periodProjected;
      const output = card.querySelector(".budget-event-plan-output");
      const eventProgress = card.querySelector("[data-event-plan-progress] .budget-progress-track");
      const periodProgress = card.querySelector("[data-period-plan-progress] .budget-progress-track");
      const eventPercent = eventLimit > 0 ? Math.floor(eventProjected * 100 / eventLimit) : 0;
      const periodPercent = periodLimit > 0 ? Math.floor(periodProjected * 100 / periodLimit) : 0;
      setProgress(eventProgress, eventProgress.querySelector("span"), eventProjected, eventLimit);
      eventProgress.setAttribute("aria-label", `Projected spending for ${event.name}`);
      eventProgress.setAttribute("aria-valuetext", eventLimit > 0
        ? `${eventPercent}% of the event limit after the planned expense`
        : "No event limit set");
      setProgress(periodProgress, periodProgress.querySelector("span"), periodProjected, periodLimit);
      periodProgress.setAttribute("aria-label", `Projected spending for the ${pagePeriod.type} budget`);
      periodProgress.setAttribute("aria-valuetext", periodLimit > 0
        ? `${periodPercent}% of the period limit after the planned expense`
        : "No period budget set");
      output.textContent = activeBudget
        ? `Preview — not saved: Event ${formatCurrency(eventProjected)} / ${formatCurrency(eventLimit)} (${eventPercent}%; ${overOrRemaining(eventLeft, "limit")}) · ${pagePeriod.type} ${formatCurrency(periodProjected)} / ${formatCurrency(periodLimit)} (${periodPercent}%; ${overOrRemaining(overallLeft)}).`
        : `Preview — not saved: Event ${formatCurrency(eventProjected)} / ${formatCurrency(eventLimit)} (${eventPercent}%; ${overOrRemaining(eventLeft, "limit")}) · set a period budget to preview the overall impact.`;
    }
  }

  function renderEvents() {
    elements.eventList.replaceChildren();
    elements.noEvents.hidden = pageData.events.length > 0;
    for (const event of pageData.events) {
      const actual = Number(pageData.eventTotals.find((item) => item.event_id === event.id)?.amount_cents || 0);
      const card = document.createElement("article");
      card.className = "budget-event-card";
      card.dataset.eventId = event.id;
      const heading = document.createElement("div");
      heading.className = "budget-event-heading";
      const info = document.createElement("div");
      const name = document.createElement("h3");
      name.textContent = event.name;
      const description = document.createElement("p");
      description.textContent = `${formatDate(event.event_on)}${event.note ? ` · ${event.note}` : ""}`;
      info.append(name, description);
      const actions = document.createElement("div");
      actions.className = "budget-row-actions";
      actions.append(
        createTextButton("Edit", () => editEvent(event)),
        createTextButton("Archive", () => void archiveEvent(event)),
      );
      heading.append(info, actions);

      const totals = document.createElement("div");
      totals.className = "budget-event-totals";
      const actualText = document.createElement("span");
      actualText.textContent = `Limit ${formatCurrency(Number(event.limit_cents))} · Spent ${formatCurrency(actual)}`;
      const remaining = document.createElement("strong");
      const left = Number(event.limit_cents) - actual;
      remaining.textContent = left < 0 ? `${formatCurrency(-left)} over event limit` : `${formatCurrency(left)} left`;
      if (left < 0) remaining.classList.add("is-over");
      totals.append(actualText, remaining);

      const plan = document.createElement("div");
      plan.className = "budget-event-plan";
      const label = document.createElement("label");
      label.textContent = "Preview a planned spend";
      const plannedInput = document.createElement("input");
      plannedInput.type = "number";
      plannedInput.min = "0";
      plannedInput.max = "1000000";
      plannedInput.step = "0.01";
      plannedInput.inputMode = "decimal";
      plannedInput.value = "0.00";
      plannedInput.dataset.planAmount = "";
      plannedInput.setAttribute("aria-label", `Planned spending for ${event.name} in pounds`);
      const plannedField = document.createElement("label");
      plannedField.className = "budget-money-field";
      const currencySymbol = document.createElement("span");
      currencySymbol.textContent = "£";
      plannedField.append(currencySymbol, plannedInput);
      const range = document.createElement("input");
      range.type = "range";
      range.min = "0";
      setSliderScale(range, Number(event.limit_cents), STUDENT_WEEKLY_GUIDE_CENTS);
      range.value = "0";
      range.setAttribute("aria-label", `Planned spending for ${event.name} slider`);
      range.addEventListener("input", () => {
        plannedInput.value = centsToInput(Number(range.value));
        updateEventPlanOutputs();
      });
      plannedInput.addEventListener("input", () => {
        const cents = amountToCents(plannedInput.value);
        if (cents !== null) {
          setSliderScale(range, cents, STUDENT_WEEKLY_GUIDE_CENTS);
          range.value = String(Math.min(Number(range.max), cents));
          updateEventPlanOutputs();
        }
      });
      const output = document.createElement("p");
      output.className = "budget-event-plan-output";
      const eventProgress = document.createElement("div");
      eventProgress.className = "budget-event-preview-meter";
      eventProgress.dataset.eventPlanProgress = "";
      const eventProgressLabel = document.createElement("span");
      eventProgressLabel.textContent = "Event after plan";
      const eventProgressTrack = document.createElement("div");
      eventProgressTrack.className = "budget-progress-track";
      eventProgressTrack.setAttribute("role", "progressbar");
      eventProgressTrack.setAttribute("aria-valuemin", "0");
      eventProgressTrack.setAttribute("aria-valuemax", "100");
      eventProgressTrack.append(document.createElement("span"));
      eventProgress.append(eventProgressLabel, eventProgressTrack);
      const periodProgress = document.createElement("div");
      periodProgress.className = "budget-event-preview-meter";
      periodProgress.dataset.periodPlanProgress = "";
      const periodProgressLabel = document.createElement("span");
      periodProgressLabel.textContent = "Period after plan";
      const periodProgressTrack = document.createElement("div");
      periodProgressTrack.className = "budget-progress-track";
      periodProgressTrack.setAttribute("role", "progressbar");
      periodProgressTrack.setAttribute("aria-valuemin", "0");
      periodProgressTrack.setAttribute("aria-valuemax", "100");
      periodProgressTrack.append(document.createElement("span"));
      periodProgress.append(periodProgressLabel, periodProgressTrack);
      plan.append(label, plannedField, range, output, eventProgress, periodProgress);
      card.append(heading, totals, plan);
      elements.eventList.append(card);
    }
    updateEventPlanOutputs();
  }

  function createTextButton(label, callback, danger = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `text-button${danger ? " is-danger" : ""}`;
    button.textContent = label;
    button.addEventListener("click", callback);
    return button;
  }

  function renderRecurringCosts() {
    elements.recurringList.replaceChildren();
    elements.noRecurring.hidden = pageData.recurringCosts.length > 0;
    const commitments = getCommitments(pageData.recurringCosts, pagePeriod);
    const byCost = new Map();
    for (const cost of commitments) {
      byCost.set(cost.id, (byCost.get(cost.id) || 0) + Number(cost.amount_cents));
    }
    for (const cost of pageData.recurringCosts) {
      const row = document.createElement("article");
      row.className = "budget-recurring-row";
      const heading = document.createElement("div");
      heading.className = "budget-row-heading";
      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = cost.title;
      const description = document.createElement("p");
      const pendingAmount = byCost.get(cost.id) || 0;
      description.textContent = `${CATEGORY_NAMES[cost.category] || "Other"} · ${cost.recurrence} · Next due ${formatDate(cost.next_due_on)}${pendingAmount ? ` · ${formatCurrency(pendingAmount)} committed this period` : ""}`;
      info.append(title, description);
      const amount = document.createElement("strong");
      amount.className = "budget-expense-amount";
      amount.textContent = formatCurrency(Number(cost.amount_cents));
      heading.append(info, amount);
      const actions = document.createElement("div");
      actions.className = "budget-row-actions";
      actions.append(
        createTextButton("Record payment", () => void recordRecurringPayment(cost)),
        createTextButton("Edit", () => editRecurringCost(cost)),
        createTextButton("Stop", () => void stopRecurringCost(cost), true),
      );
      row.append(heading, actions);
      elements.recurringList.append(row);
    }
  }

  function renderExpenses() {
    const expenses = getExpensesInPeriod(pageData.expenses, pagePeriod);
    elements.expenseList.replaceChildren();
    const expenseCount = countFromDailyTotals(
      pageData.expenseTotals.filter((row) => dateInPeriod(row.spent_on, pagePeriod)),
    );
    elements.expenseCount.textContent = `${expenseCount} ${expenseCount === 1 ? "expense" : "expenses"}`;
    elements.noExpenseList.hidden = expenseCount > 0;
    const eventNames = new Map(pageData.allEvents.map((event) => [event.id, event.name]));
    for (const expense of expenses) {
      const row = document.createElement("article");
      row.className = "budget-expense-row";
      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = expense.note || CATEGORY_NAMES[expense.category] || "Expense";
      const details = document.createElement("div");
      details.className = "budget-expense-details";
      const category = document.createElement("span");
      category.textContent = CATEGORY_NAMES[expense.category] || "Other";
      const date = document.createElement("span");
      date.textContent = formatDate(expense.spent_on);
      details.append(category, date);
      if (expense.event_id && eventNames.has(expense.event_id)) {
        const eventTag = document.createElement("span");
        eventTag.className = "budget-event-tag";
        eventTag.textContent = eventNames.get(expense.event_id);
        details.append(eventTag);
      }
      if (expense.recurring_cost_id) {
        const recurringTag = document.createElement("span");
        recurringTag.className = "budget-event-tag";
        recurringTag.textContent = "Recurring payment";
        details.append(recurringTag);
      }
      info.append(name, details);
      const right = document.createElement("div");
      right.className = "budget-row-actions";
      const amount = document.createElement("strong");
      amount.className = "budget-expense-amount";
      amount.textContent = formatCurrency(Number(expense.amount_cents));
      right.append(amount, createTextButton("Edit", () => openExpense(expense)));
      right.append(createTextButton("Delete", () => void deleteExpense(expense), true));
      row.append(info, right);
      elements.expenseList.append(row);
    }
  }

  function renderReminderPreferences(preferences) {
    const email = getCurrentUserEmail()?.trim() || "";
    elements.reminderAddress.textContent = email
      ? `Threshold alerts are sent to ${email}.`
      : "Add an email address to your account before enabling email reminders.";
    elements.remindersEnabled.checked = Boolean(preferences?.enabled);
    elements.remindersEnabled.disabled = !email;
    const thresholds = Array.isArray(preferences?.thresholds)
      ? preferences.thresholds.map(Number)
      : [80, 100];
    elements.reminder80.checked = thresholds.includes(80);
    elements.reminder100.checked = thresholds.includes(100);
    elements.reminder80.disabled = !email || !elements.remindersEnabled.checked;
    elements.reminder100.disabled = !email || !elements.remindersEnabled.checked;
  }

  function renderPage() {
    updatePeriodHeading();
    setSliderScale(elements.limitSlider, draftLimitCents);
    elements.limitInput.value = centsToInput(draftLimitCents);
    elements.limitSlider.value = String(draftLimitCents);
    elements.limitPreview.hidden = draftLimitCents === Number(activeBudget?.limit_cents || 0);
    const savedAllocations = Object.values(savedCategoryLimits).reduce((sum, cents) => sum + Number(cents || 0), 0);
    elements.limitSave.disabled = savedAllocations > draftLimitCents;
    renderCategoryControls();
    updateTotals();
    renderEvents();
    renderRecurringCosts();
    renderExpenses();
    renderReminderPreferences(pageData.reminderPreferences);
    populateExpenseEvents();
  }

  async function loadPageData() {
    const requestUserId = getCurrentUserId();
    if (!supabase || !requestUserId) return;
    userId = requestUserId;
    const requestVersion = ++loadVersion;
    elements.pageMessage.textContent = "Loading this budget period…";
    updatePeriodHeading();

    const budgetResult = await supabase.from("budget_periods")
      .select("id, user_id, period_type, period_start, limit_cents")
      .eq("user_id", requestUserId)
      .eq("period_type", pagePeriod.type)
      .eq("period_start", pagePeriod.start)
      .maybeSingle();
    if (!isCurrentSession(requestUserId) || requestVersion !== loadVersion) return;
    if (budgetResult.error) {
      elements.pageMessage.textContent = `Budget could not be loaded: ${budgetResult.error.message}`;
      return;
    }
    const budget = budgetResult.data;
    const [expenseResult, expenseTotalsResult, eventTotalsResult, categoryResult, recurringResult, eventsResult, preferenceResult] = await Promise.all([
      supabase.from("budget_expenses")
        .select("id, user_id, amount_cents, spent_on, category, note, event_id, recurring_cost_id, recurring_due_on, created_at")
        .eq("user_id", requestUserId)
        .gte("spent_on", pagePeriod.start)
        .lt("spent_on", pagePeriod.end)
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("budget_expense_daily_totals")
        .select("amount_cents, spent_on, category, expense_count")
        .eq("user_id", requestUserId)
        .gte("spent_on", pagePeriod.start)
        .lt("spent_on", pagePeriod.end),
      supabase.from("budget_social_event_totals")
        .select("event_id, amount_cents")
        .eq("user_id", requestUserId),
      budget
        ? supabase.from("budget_category_limits")
          .select("category, limit_cents")
          .eq("user_id", requestUserId)
          .eq("budget_id", budget.id)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("budget_recurring_costs")
        .select("id, user_id, title, amount_cents, category, recurrence, next_due_on, note, active")
        .eq("user_id", requestUserId)
        .eq("active", true)
        .order("next_due_on", { ascending: true })
        .limit(200),
      supabase.from("budget_social_events")
        .select("id, user_id, name, event_on, limit_cents, note, archived_at")
        .eq("user_id", requestUserId)
        .order("event_on", { ascending: true })
        .limit(500),
      supabase.from("budget_reminder_preferences")
        .select("enabled, thresholds")
        .eq("user_id", requestUserId)
        .maybeSingle(),
    ]);
    if (!isCurrentSession(requestUserId) || requestVersion !== loadVersion) return;
    const error = expenseResult.error || expenseTotalsResult.error || eventTotalsResult.error ||
      categoryResult.error || recurringResult.error || eventsResult.error || preferenceResult.error;
    if (error) {
      elements.pageMessage.textContent = `Budget data could not be loaded: ${error.message}`;
      return;
    }
    activeBudget = budget;
    draftLimitCents = budget ? Number(budget.limit_cents) : 0;
    savedCategoryLimits = Object.fromEntries((categoryResult.data || []).map((item) => [
      item.category,
      Number(item.limit_cents),
    ]));
    draftCategoryLimits = { ...savedCategoryLimits };
    const expenses = expenseResult.data || [];
    const allEvents = eventsResult.data || [];
    pageData = {
      period: pagePeriod,
      budget,
      expenses,
      expenseTotals: expenseTotalsResult.data || [],
      eventTotals: eventTotalsResult.data || [],
      recurringCosts: recurringResult.data || [],
      allEvents,
      events: allEvents.filter((event) => !event.archived_at && dateInPeriod(event.event_on, pagePeriod)),
      reminderPreferences: preferenceResult.data,
    };
    elements.pageMessage.textContent = "";
    renderPage();
  }

  async function loadOverviewData() {
    const requestUserId = getCurrentUserId();
    if (!supabase || !requestUserId) return;
    const period = periodFor(overviewType);
    await fetchOverview(period, requestUserId);
  }

  async function refresh() {
    await Promise.all([loadPageData(), loadOverviewData()]);
  }

  function populateExpenseEvents() {
    const selected = elements.expenseEvent.value;
    elements.expenseEvent.replaceChildren();
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "No event";
    elements.expenseEvent.append(none);
    for (const event of (pageData?.allEvents || []).filter((item) => !item.archived_at)) {
      const option = document.createElement("option");
      option.value = event.id;
      option.textContent = `${event.name} · ${formatDate(event.event_on)}`;
      elements.expenseEvent.append(option);
    }
    if ([...elements.expenseEvent.options].some((option) => option.value === selected)) {
      elements.expenseEvent.value = selected;
    }
  }

  function openExpense(expense = null) {
    if (!isCurrentSession()) return;
    elements.expenseForm.reset();
    elements.expenseId.value = expense?.id || "";
    elements.expenseHeading.textContent = expense ? "Edit expense" : "Add expense";
    elements.expenseSave.textContent = expense ? "Save changes" : "Save expense";
    elements.expenseAmount.value = expense ? centsToInput(Number(expense.amount_cents)) : "";
    elements.expenseDate.value = expense?.spent_on || localDateString();
    elements.expenseCategory.value = expense?.category || "other";
    elements.expenseNote.value = expense?.note || "";
    elements.expenseMessage.textContent = "";
    populateExpenseEvents();
    elements.expenseEvent.value = expense?.event_id || "";
    if (!elements.expenseDialog.open) elements.expenseDialog.showModal();
    elements.expenseAmount.focus();
  }

  function resetExpenseForm() {
    elements.expenseForm.reset();
    elements.expenseId.value = "";
    elements.expenseDate.value = localDateString();
    elements.expenseHeading.textContent = "Add expense";
    elements.expenseSave.textContent = "Save expense";
    elements.expenseMessage.textContent = "";
  }

  async function sendThresholdReminders(requestUserId, expenseDate) {
    if (!supabase || !isCurrentSession(requestUserId)) return;
    for (const type of ["weekly", "monthly"]) {
      await invokeThresholdReminder(requestUserId, periodFor(type, expenseDate));
    }
  }

  async function invokeThresholdReminder(requestUserId, period) {
    if (!supabase || !isCurrentSession(requestUserId)) return;
    try {
      const { error } = await supabase.functions.invoke("budget-email-reminders", {
        body: { periodType: period.type, periodStart: period.start },
      });
      if (error) throw error;
    } catch {
      if (isCurrentSession(requestUserId)) {
        elements.reminderMessage.textContent = "Your budget was saved, but an email reminder could not be sent. Check the email setup.";
      }
    }
  }

  async function saveExpense(event) {
    event.preventDefault();
    if (saving || !supabase || !isCurrentSession()) return;
    const requestUserId = userId;
    const amount = amountToCents(elements.expenseAmount.value);
    const spentOn = elements.expenseDate.value;
    if (!amount || !spentOn || spentOn > localDateString()) {
      elements.expenseMessage.textContent = "Enter an amount up to £1,000,000 and a valid date that is not in the future.";
      return;
    }
    const expenseId = elements.expenseId.value;
    const payload = {
      amount_cents: amount,
      spent_on: spentOn,
      category: elements.expenseCategory.value,
      note: elements.expenseNote.value.trim(),
      event_id: elements.expenseEvent.value || null,
    };
    saving = true;
    elements.expenseSave.disabled = true;
    elements.expenseMessage.textContent = expenseId ? "Saving changes…" : "Saving expense…";
    const query = expenseId
      ? supabase.from("budget_expenses").update(payload).eq("id", expenseId).eq("user_id", requestUserId)
      : supabase.from("budget_expenses").insert({ ...payload, user_id: requestUserId });
    const { error } = await query;
    if (!isCurrentSession(requestUserId)) {
      saving = false;
      elements.expenseSave.disabled = false;
      return;
    }
    if (error) {
      elements.expenseMessage.textContent = `Expense could not be saved: ${error.message}`;
      saving = false;
      elements.expenseSave.disabled = false;
      return;
    }
    const message = expenseId ? "Expense updated." : "Expense saved.";
    elements.expenseMessage.textContent = message;
    elements.expenseDialog.close();
    elements.pageMessage.textContent = message;
    resetExpenseForm();
    await Promise.all([loadPageData(), loadOverviewData(), sendThresholdReminders(requestUserId, spentOn)]);
    saving = false;
    elements.expenseSave.disabled = false;
  }

  async function deleteExpense(expense) {
    if (!supabase || !isCurrentSession()) return;
    if (!window.confirm(`Delete the ${formatCurrency(Number(expense.amount_cents))} expense?`)) return;
    elements.pageMessage.textContent = "Deleting expense…";
    const requestUserId = userId;
    const { error } = expense.recurring_cost_id
      ? await supabase.rpc("delete_recurring_cost_payment", { p_expense_id: expense.id })
      : await supabase.from("budget_expenses")
        .delete()
        .eq("id", expense.id)
        .eq("user_id", requestUserId);
    if (!isCurrentSession(requestUserId)) return;
    if (error) {
      elements.pageMessage.textContent = `Expense could not be deleted: ${error.message}`;
      return;
    }
    elements.pageMessage.textContent = "Expense deleted.";
    await Promise.all([loadPageData(), loadOverviewData()]);
  }

  async function saveBudgetLimit(event) {
    event.preventDefault();
    if (saving || !supabase || !isCurrentSession()) return;
    const limit = amountToCents(elements.limitInput.value);
    if (limit === null) {
      elements.pageMessage.textContent = "Enter a budget from £0.00 to £1,000,000.00.";
      return;
    }
    const requestUserId = userId;
    saving = true;
    elements.limitSave.disabled = true;
    elements.pageMessage.textContent = "Saving budget limit…";
    const { error } = await supabase.from("budget_periods").upsert({
      user_id: requestUserId,
      period_type: pagePeriod.type,
      period_start: pagePeriod.start,
      limit_cents: limit,
    }, { onConflict: "user_id,period_type,period_start" });
    saving = false;
    elements.limitSave.disabled = false;
    if (!isCurrentSession(requestUserId)) return;
    if (error) {
      elements.pageMessage.textContent = `Budget limit could not be saved: ${error.message}`;
      return;
    }
    elements.pageMessage.textContent = "Budget limit saved.";
    await Promise.all([
      loadPageData(),
      loadOverviewData(),
      invokeThresholdReminder(requestUserId, pagePeriod),
    ]);
  }

  async function saveCategoryLimits() {
    if (saving || !supabase || !activeBudget || !isCurrentSession()) return;
    const total = Object.values(draftCategoryLimits).reduce((sum, cents) => sum + Number(cents || 0), 0);
    if (total > draftLimitCents) {
      elements.pageMessage.textContent = "Category limits exceed the overall budget. Adjust them before saving.";
      return;
    }
    const requestUserId = userId;
    saving = true;
    updateAllocationSummary();
    elements.pageMessage.textContent = "Saving category limits…";
    const allocations = CATEGORY_KEYS
      .filter((category) => Number(draftCategoryLimits[category] || 0) > 0)
      .map((category) => ({ category, limit_cents: Number(draftCategoryLimits[category]) }));
    const { error } = await supabase.rpc("save_budget_category_limits", {
      p_budget_id: activeBudget.id,
      p_allocations: allocations,
    });
    saving = false;
    if (!isCurrentSession(requestUserId)) return;
    updateAllocationSummary();
    if (error) {
      elements.pageMessage.textContent = `Category limits could not be saved: ${error.message}`;
      return;
    }
    savedCategoryLimits = { ...draftCategoryLimits };
    elements.pageMessage.textContent = "Category limits saved.";
    renderCategoryBreakdown(pageData.expenseTotals, draftLimitCents);
    updateLimitPreview();
  }

  function wireAmountPair(slider, input, onUpdate) {
    slider.addEventListener("input", () => {
      const cents = Number(slider.value);
      input.value = centsToInput(cents);
      onUpdate(cents);
    });
    input.addEventListener("input", () => {
      const cents = amountToCents(input.value);
      if (cents === null) return;
      setSliderScale(slider, cents, STUDENT_WEEKLY_GUIDE_CENTS);
      slider.value = String(cents);
      onUpdate(cents);
    });
  }

  function resetEventForm() {
    elements.eventForm.reset();
    elements.eventId.value = "";
    elements.eventDate.value = localDateString();
    elements.eventLimit.value = "50.00";
    setSliderScale(elements.eventLimitSlider, 5000, STUDENT_WEEKLY_GUIDE_CENTS);
    elements.eventLimitSlider.value = "5000";
    elements.eventSave.textContent = "Add event";
    elements.eventCancel.hidden = true;
    eventInitialValues = getEventFormValues();
    updateEventLimitPreview();
  }

  function getEventFormValues() {
    return JSON.stringify({
      name: elements.eventName.value,
      date: elements.eventDate.value,
      note: elements.eventNote.value,
      limit: elements.eventLimit.value,
    });
  }

  function updateEventLimitPreview() {
    const changed = eventInitialValues !== null && getEventFormValues() !== eventInitialValues;
    elements.eventLimitPreview.hidden = !changed;
    elements.eventLimitPreview.textContent = elements.eventId.value
      ? "Preview — not saved"
      : "New event — not saved";
  }

  function editEvent(event) {
    elements.eventId.value = event.id;
    elements.eventName.value = event.name;
    elements.eventDate.value = event.event_on;
    elements.eventNote.value = event.note || "";
    elements.eventLimit.value = centsToInput(Number(event.limit_cents));
    setSliderScale(elements.eventLimitSlider, Number(event.limit_cents), STUDENT_WEEKLY_GUIDE_CENTS);
    elements.eventLimitSlider.value = String(event.limit_cents);
    elements.eventSave.textContent = "Save event";
    elements.eventCancel.hidden = false;
    eventInitialValues = getEventFormValues();
    updateEventLimitPreview();
    elements.eventName.focus();
  }

  async function saveEvent(event) {
    event.preventDefault();
    if (saving || !supabase || !isCurrentSession()) return;
    const limit = amountToCents(elements.eventLimit.value);
    if (!limit || !elements.eventName.value.trim() || !elements.eventDate.value) {
      elements.pageMessage.textContent = "Enter an event name, date, and limit greater than £0.";
      return;
    }
    const requestUserId = userId;
    const id = elements.eventId.value;
    const payload = {
      name: elements.eventName.value.trim(),
      event_on: elements.eventDate.value,
      note: elements.eventNote.value.trim(),
      limit_cents: limit,
    };
    saving = true;
    elements.eventSave.disabled = true;
    const query = id
      ? supabase.from("budget_social_events").update(payload).eq("id", id).eq("user_id", requestUserId)
      : supabase.from("budget_social_events").insert({ ...payload, user_id: requestUserId });
    const { error } = await query;
    saving = false;
    elements.eventSave.disabled = false;
    if (!isCurrentSession(requestUserId)) return;
    if (error) {
      elements.pageMessage.textContent = `Event could not be saved: ${error.message}`;
      return;
    }
    elements.pageMessage.textContent = id ? "Event updated." : "Event added.";
    resetEventForm();
    await Promise.all([loadPageData(), loadOverviewData()]);
  }

  async function archiveEvent(event) {
    if (!supabase || !isCurrentSession()) return;
    if (!window.confirm(`Archive “${event.name}”? Existing expenses will remain in your records.`)) return;
    const requestUserId = userId;
    const { error } = await supabase.from("budget_social_events")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", event.id)
      .eq("user_id", requestUserId);
    if (!isCurrentSession(requestUserId)) return;
    if (error) {
      elements.pageMessage.textContent = `Event could not be archived: ${error.message}`;
      return;
    }
    elements.pageMessage.textContent = "Event archived. Existing expenses were kept.";
    await loadPageData();
  }

  function resetRecurringForm() {
    elements.recurringForm.reset();
    elements.recurringId.value = "";
    elements.recurringInterval.value = "monthly";
    elements.recurringDue.value = localDateString();
  }

  function editRecurringCost(cost) {
    elements.recurringId.value = cost.id;
    elements.recurringTitle.value = cost.title;
    elements.recurringAmount.value = centsToInput(Number(cost.amount_cents));
    elements.recurringCategory.value = cost.category;
    elements.recurringInterval.value = cost.recurrence;
    elements.recurringDue.value = cost.next_due_on;
    elements.recurringNote.value = cost.note || "";
    elements.recurringTitle.focus();
  }

  async function saveRecurringCost(event) {
    event.preventDefault();
    if (saving || !supabase || !isCurrentSession()) return;
    const amount = amountToCents(elements.recurringAmount.value);
    const due = elements.recurringDue.value;
    if (!amount || !elements.recurringTitle.value.trim() || !due) {
      elements.pageMessage.textContent = "Enter a cost name, valid amount, category, interval, and next due date.";
      return;
    }
    const requestUserId = userId;
    const id = elements.recurringId.value;
    const payload = {
      title: elements.recurringTitle.value.trim(),
      amount_cents: amount,
      category: elements.recurringCategory.value,
      recurrence: elements.recurringInterval.value,
      next_due_on: due,
      note: elements.recurringNote.value.trim(),
    };
    saving = true;
    const query = id
      ? supabase.from("budget_recurring_costs").update(payload).eq("id", id).eq("user_id", requestUserId)
      : supabase.from("budget_recurring_costs").insert({ ...payload, user_id: requestUserId });
    const { error } = await query;
    saving = false;
    if (!isCurrentSession(requestUserId)) return;
    if (error) {
      elements.pageMessage.textContent = `Recurring cost could not be saved: ${error.message}`;
      return;
    }
    elements.pageMessage.textContent = id ? "Recurring cost updated." : "Recurring cost saved.";
    resetRecurringForm();
    await loadPageData();
  }

  async function stopRecurringCost(cost) {
    if (!supabase || !isCurrentSession()) return;
    if (!window.confirm(`Stop tracking “${cost.title}”? Past expenses will stay in your records.`)) return;
    const requestUserId = userId;
    const { error } = await supabase.from("budget_recurring_costs")
      .update({ active: false })
      .eq("id", cost.id)
      .eq("user_id", requestUserId);
    if (!isCurrentSession(requestUserId)) return;
    if (error) {
      elements.pageMessage.textContent = `Recurring cost could not be stopped: ${error.message}`;
      return;
    }
    elements.pageMessage.textContent = "Recurring cost stopped. Existing payment records were kept.";
    await loadPageData();
  }

  async function recordRecurringPayment(cost) {
    if (!supabase || !isCurrentSession()) return;
    const requestUserId = userId;
    elements.pageMessage.textContent = `Recording ${cost.title} payment…`;
    const { error } = await supabase.rpc("record_recurring_cost_payment", {
      p_recurring_cost_id: cost.id,
      p_paid_on: localDateString(),
      p_note: "",
    });
    if (!isCurrentSession(requestUserId)) return;
    if (error) {
      elements.pageMessage.textContent = `Payment could not be recorded: ${error.message}`;
      return;
    }
    elements.pageMessage.textContent = `${cost.title} payment recorded as an expense.`;
    const paidOn = localDateString();
    await Promise.all([loadPageData(), loadOverviewData(), sendThresholdReminders(requestUserId, paidOn)]);
  }

  async function saveReminderPreferences() {
    if (saving || !supabase || !isCurrentSession()) return;
    const email = getCurrentUserEmail()?.trim() || "";
    const enabled = elements.remindersEnabled.checked;
    const thresholds = [
      ...(elements.reminder80.checked ? [80] : []),
      ...(elements.reminder100.checked ? [100] : []),
    ];
    if (enabled && !email) {
      elements.reminderMessage.textContent = "Add an email address to your account before enabling reminders.";
      return;
    }
    if (enabled && !thresholds.length) {
      elements.reminderMessage.textContent = "Choose at least one spending threshold.";
      return;
    }
    const requestUserId = userId;
    saving = true;
    elements.reminderSave.disabled = true;
    elements.reminderMessage.textContent = "Saving email reminder settings…";
    const { error } = await supabase.from("budget_reminder_preferences").upsert({
      user_id: requestUserId,
      enabled,
      thresholds: thresholds.length ? thresholds : [80, 100],
    }, { onConflict: "user_id" });
    saving = false;
    elements.reminderSave.disabled = false;
    if (!isCurrentSession(requestUserId)) return;
    if (error) {
      elements.reminderMessage.textContent = `Reminder settings could not be saved: ${error.message}`;
      return;
    }
    elements.reminderMessage.textContent = enabled
      ? "Email reminders saved. Thresholds already reached in the current week or month will be checked now."
      : "Email reminders are off.";
    elements.reminder80.disabled = !enabled || !email;
    elements.reminder100.disabled = !enabled || !email;
    if (enabled) {
      await Promise.all([
        sendThresholdReminders(requestUserId, localDateString()),
        loadOverviewData(),
      ]);
    }
  }

  elements.limitForm.addEventListener("submit", (event) => void saveBudgetLimit(event));
  elements.limitSlider.addEventListener("input", () => {
    draftLimitCents = Number(elements.limitSlider.value);
    elements.limitInput.value = centsToInput(draftLimitCents);
    updateLimitPreview();
  });
  elements.limitInput.addEventListener("input", () => {
    const cents = amountToCents(elements.limitInput.value);
    if (cents === null) return;
    draftLimitCents = cents;
    elements.limitSlider.value = String(cents);
    updateLimitPreview();
  });
  elements.limitPresets.querySelectorAll("[data-budget-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const weeklyPounds = Number(button.dataset.budgetPreset);
      draftLimitCents = pagePeriod.type === "weekly"
        ? weeklyPounds * 100
        : Math.round(weeklyPounds * 52 / 12) * 100;
      elements.limitInput.value = centsToInput(draftLimitCents);
      setSliderScale(elements.limitSlider, draftLimitCents);
      elements.limitSlider.value = String(draftLimitCents);
      updateLimitPreview();
    });
  });
  elements.categorySave.addEventListener("click", () => void saveCategoryLimits());
  elements.periodType.addEventListener("change", () => {
    pagePeriod = periodFor(elements.periodType.value);
    void loadPageData();
  });
  elements.periodPrevious.addEventListener("click", () => {
    pagePeriod = shiftPeriod(pagePeriod, -1);
    void loadPageData();
  });
  elements.periodNext.addEventListener("click", () => {
    pagePeriod = shiftPeriod(pagePeriod, 1);
    void loadPageData();
  });
  elements.periodCurrent.addEventListener("click", () => {
    pagePeriod = periodFor(pagePeriod.type);
    void loadPageData();
  });
  document.querySelectorAll("[data-overview-period]").forEach((button) => {
    button.addEventListener("click", () => {
      overviewType = button.dataset.overviewPeriod;
      document.querySelectorAll("[data-overview-period]").forEach((periodButton) => {
        const selected = periodButton === button;
        periodButton.classList.toggle("is-selected", selected);
        periodButton.setAttribute("aria-pressed", String(selected));
      });
      void loadOverviewData();
    });
  });
  elements.overviewAddExpense.addEventListener("click", () => openExpense());
  elements.budgetAddExpense.addEventListener("click", () => openExpense());
  elements.expenseForm.addEventListener("submit", (event) => void saveExpense(event));
  elements.expenseClose.addEventListener("click", () => elements.expenseDialog.close());
  elements.expenseCancel.addEventListener("click", () => elements.expenseDialog.close());
  elements.expenseDialog.addEventListener("close", resetExpenseForm);
  elements.eventForm.addEventListener("submit", (event) => void saveEvent(event));
  elements.eventCancel.addEventListener("click", resetEventForm);
  elements.recurringForm.addEventListener("submit", (event) => void saveRecurringCost(event));
  elements.reminderSave.addEventListener("click", () => void saveReminderPreferences());
  elements.remindersEnabled.addEventListener("change", () => {
    const enabled = elements.remindersEnabled.checked;
    const email = Boolean(getCurrentUserEmail()?.trim());
    elements.reminder80.disabled = !enabled || !email;
    elements.reminder100.disabled = !enabled || !email;
  });
  wireAmountPair(elements.eventLimitSlider, elements.eventLimit, updateEventLimitPreview);
  elements.eventForm.addEventListener("input", updateEventLimitPreview);

  return {
    async load(requestUserId) {
      userId = requestUserId;
      pagePeriod = periodFor("weekly");
      overviewType = "weekly";
      document.querySelectorAll("[data-overview-period]").forEach((button) => {
        const selected = button.dataset.overviewPeriod === overviewType;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      elements.reminderMessage.textContent = "";
      resetEventForm();
      resetRecurringForm();
      await refresh();
    },
    reset() {
      userId = null;
      loadVersion += 1;
      overviewVersion += 1;
      activeBudget = null;
      pageData = null;
      savedCategoryLimits = {};
      draftCategoryLimits = {};
      elements.pageMessage.textContent = "";
      elements.overviewMessage.textContent = "";
      elements.overviewEmpty.hidden = false;
      elements.overviewSummary.hidden = true;
      elements.spentTotal.textContent = formatCurrency(0);
      elements.remainingTotal.textContent = "Set a budget";
      elements.committedTotal.textContent = formatCurrency(0);
      elements.safeTotal.textContent = "Set a budget";
      elements.categoryLimits.replaceChildren();
      elements.categoryBreakdown.replaceChildren();
      elements.eventList.replaceChildren();
      elements.recurringList.replaceChildren();
      elements.expenseList.replaceChildren();
      elements.eventList.replaceChildren();
      elements.expenseDialog.close();
      resetExpenseForm();
    },
    refresh,
  };
}
