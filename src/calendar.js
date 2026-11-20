const REQUEST_TIMEOUT_MS = 20_000;

function mondayOf(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  return monday;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function eventDateKey(event) {
  if (event.allDay && /^\d{4}-\d{2}-\d{2}$/.test(event.startAt)) return event.startAt;
  const date = new Date(event.startAt);
  return Number.isNaN(date.getTime()) ? "" : dateKey(date);
}

function formatDay(date, options) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function formatEventTime(event) {
  if (event.allDay) return "All day";
  const start = new Date(event.startAt);
  if (Number.isNaN(start.getTime())) return "Time not set";
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(start);
  const end = new Date(event.endAt);
  if (Number.isNaN(end.getTime()) || end.getTime() === start.getTime()) return time;
  return `${time}–${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(end)}`;
}

function eventConflictsWithWindow(event, start, end, day) {
  if (event.allDay) return eventDateKey(event) === dateKey(day);
  const eventStart = new Date(event.startAt).getTime();
  const eventEnd = new Date(event.endAt).getTime();
  return Number.isFinite(eventStart) && Number.isFinite(eventEnd) && eventStart < end && eventEnd > start;
}

function createText(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function getErrorMessage(error) {
  const message = error?.message || "The calendar sync could not be completed.";
  if (error?.context?.status === 404 || /404/.test(message)) {
    return "Calendar sync is not deployed yet. Ask the site administrator to deploy calendar-events.";
  }
  if (error?.context?.status === 401) return "Your session expired. Sign in again to sync your calendar.";
  return message;
}

export function initializeCalendar({ supabase, getCurrentUserId }) {
  const weekGrid = document.querySelector("#calendar-week-grid");
  const weekHeading = document.querySelector("#calendar-week-heading");
  const eventCount = document.querySelector("#calendar-event-count");
  const syncStatus = document.querySelector("#calendar-sync-status");
  const lastSynced = document.querySelector("#calendar-last-synced");
  const socialWindows = document.querySelector("#calendar-social-windows");
  const protectDays = document.querySelector("#calendar-protect-days");
  const refreshButton = document.querySelector("#calendar-refresh");
  const previousButton = document.querySelector("#calendar-previous-week");
  const nextButton = document.querySelector("#calendar-next-week");
  const currentButton = document.querySelector("#calendar-current-week");
  let weekStart = mondayOf(new Date());
  let events = [];
  let sources = {};
  let loaded = false;
  let loading = false;
  let loadVersion = 0;

  function setEmptyState(container, message, linkToConnections = false) {
    container.replaceChildren();
    const empty = createText("p", "calendar-empty-note", message);
    container.append(empty);
    if (linkToConnections) {
      const link = createText("a", "calendar-inline-link", "Connect a calendar or Canvas");
      link.href = "#connections";
      container.append(link);
    }
  }

  function renderWeek() {
    weekHeading.textContent = `${formatDay(weekStart, { month: "long", day: "numeric" })} – ${formatDay(addDays(weekStart, 6), { month: "long", day: "numeric", year: "numeric" })}`;
    const weekEvents = events.filter((event) => {
      const key = eventDateKey(event);
      return key >= dateKey(weekStart) && key <= dateKey(addDays(weekStart, 6));
    }).sort((left, right) => new Date(left.startAt) - new Date(right.startAt));
    eventCount.textContent = String(weekEvents.length);
    weekGrid.replaceChildren();

    for (let index = 0; index < 7; index += 1) {
      const day = addDays(weekStart, index);
      const key = dateKey(day);
      const dayEvents = weekEvents.filter((event) => eventDateKey(event) === key);
      const card = document.createElement("article");
      card.className = `calendar-day-card${key === dateKey(new Date()) ? " is-today" : ""}`;
      const heading = document.createElement("header");
      heading.className = "calendar-day-heading";
      const dayName = createText("span", "calendar-day-name", formatDay(day, { weekday: "short" }));
      const dayNumber = createText("strong", "calendar-day-number", String(day.getDate()));
      heading.append(dayName, dayNumber);
      const list = document.createElement("div");
      list.className = "calendar-day-events";

      if (!dayEvents.length) {
        list.append(createText("p", "calendar-day-empty", "Nothing scheduled"));
      } else {
        for (const event of dayEvents.slice(0, 4)) {
          const item = document.createElement("article");
          item.className = `calendar-event-card is-${event.provider}`;
          item.append(
            createText("span", "calendar-event-time", formatEventTime(event)),
            createText("strong", "calendar-event-title", event.title || "Untitled event"),
            createText("span", "calendar-event-source", event.sourceLabel || event.providerLabel || "Connected source"),
          );
          if (typeof event.url === "string" && event.url.startsWith("https://")) {
            const link = document.createElement("a");
            link.className = "calendar-event-link";
            link.href = event.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.setAttribute("aria-label", `Open ${event.title || "event"} in its source`);
            link.textContent = "↗";
            item.append(link);
          }
          list.append(item);
        }
        if (dayEvents.length > 4) {
          list.append(createText("p", "calendar-day-more", `+${dayEvents.length - 4} more`));
        }
      }

      card.append(heading, list);
      weekGrid.append(card);
    }
    renderPlanner();
  }

  function renderPlanner() {
    socialWindows.replaceChildren();
    protectDays.replaceChildren();
    const today = mondayOf(new Date());
    if (weekStart < today) {
      setEmptyState(socialWindows, "Choose this week or a future week to see planning suggestions.");
      setEmptyState(protectDays, "Your schedule is read-only. Move to an upcoming week to see potential conflicts.");
      return;
    }
    const connectedSources = Object.values(sources).filter((source) => source?.connected);
    if (!connectedSources.length) {
      setEmptyState(socialWindows, "Connect a calendar or Canvas to get planning suggestions.", true);
      setEmptyState(protectDays, "Connect a source to see which dates may need more breathing room.");
      return;
    }
    if (connectedSources.some((source) => source.error)) {
      setEmptyState(socialWindows, "A connected source could not sync. Resolve the source warning above before relying on suggestions.");
      setEmptyState(protectDays, "Resolve the sync warning above to check all available commitments.");
      return;
    }

    const suggestions = [];
    const conflicts = [];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const planningStart = weekStart < todayDate ? todayDate : weekStart;
    for (let index = 0; index < 21; index += 1) {
      const day = addDays(weekStart, index);
      if (day < planningStart || day >= addDays(planningStart, 14)) continue;
      const key = dateKey(day);
      const dayEvents = events.filter((event) => eventDateKey(event) === key);
      const windowStart = new Date(day);
      windowStart.setHours(day.getDay() === 0 || day.getDay() === 6 ? 16 : 17, 0, 0, 0);
      const windowEnd = new Date(day);
      windowEnd.setHours(20, 0, 0, 0);
      const deadline = dayEvents.find((event) => event.kind === "deadline");
      const tomorrowDeadline = events.find((event) =>
        event.kind === "deadline" && eventDateKey(event) === dateKey(addDays(day, 1))
      );
      const overlapping = dayEvents.some((event) =>
        event.kind !== "deadline" && eventConflictsWithWindow(event, windowStart.getTime(), windowEnd.getTime(), day)
      );

      if (overlapping || deadline || tomorrowDeadline) {
        const reason = overlapping
          ? "Your calendar is busy during the evening."
          : deadline
            ? "A Canvas deadline is due that day."
            : "A Canvas deadline is due the following day.";
        conflicts.push({ day, reason });
        continue;
      }

      const points = 100 - dayEvents.filter((event) => event.kind !== "deadline").length * 10;
      suggestions.push({
        day,
        time: day.getDay() === 0 || day.getDay() === 6 ? "4–8 pm" : "5–8 pm",
        reason: dayEvents.length
          ? "No events are scheduled during this window."
          : sources.canvas?.connected
            ? "No connected events or Canvas deadlines are listed."
            : "No connected calendar events are listed; Canvas deadlines aren't included.",
        points,
      });
    }

    suggestions.sort((left, right) => right.points - left.points || left.day - right.day);
    if (!suggestions.length) {
      setEmptyState(socialWindows, "No clear evening windows found in the next two weeks.");
    } else {
      for (const suggestion of suggestions.slice(0, 3)) {
        const item = document.createElement("article");
        item.className = "calendar-plan-card is-open";
        const date = createText("strong", "calendar-plan-date", formatDay(suggestion.day, { weekday: "short", month: "short", day: "numeric" }));
        const time = createText("span", "calendar-plan-time", suggestion.time);
        const reason = createText("p", "calendar-plan-reason", suggestion.reason);
        item.append(date, time, reason);
        socialWindows.append(item);
      }
    }

    if (!conflicts.length) {
      setEmptyState(protectDays, "No evening conflicts or near-term Canvas deadlines were found.");
    } else {
      for (const conflict of conflicts.slice(0, 3)) {
        const item = document.createElement("article");
        item.className = "calendar-plan-card is-protect";
        item.append(
          createText("strong", "calendar-plan-date", formatDay(conflict.day, { weekday: "short", month: "short", day: "numeric" })),
          createText("p", "calendar-plan-reason", conflict.reason),
        );
        protectDays.append(item);
      }
    }
  }

  function renderSourceStatus() {
    const labels = [
      ["google", "Google Calendar"],
      ["microsoft", "Outlook Calendar"],
      ["canvas", "Canvas"],
    ];
    const connected = labels.filter(([key]) => sources[key]?.connected);
    const errors = labels.filter(([key]) => sources[key]?.error || sources[key]?.warning);
    if (!connected.length) {
      syncStatus.textContent = "No calendar or Canvas sources connected.";
    } else if (errors.length) {
      syncStatus.textContent = `Some sync details need attention: ${errors.map(([, label]) => label).join(", ")}.`;
    } else {
      syncStatus.textContent = `${connected.map(([, label]) => label).join(" · ")} synced`;
    }
    if (loaded) lastSynced.textContent = `Last synced ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date())} · read-only`;
    for (const [key, label] of labels) {
      if (sources[key]?.error || sources[key]?.warning) {
        const error = createText(
          "span",
          "calendar-source-error",
          `${label}: ${sources[key].error || sources[key].warning}`,
        );
        syncStatus.append(document.createElement("br"), error);
      }
    }
  }

  async function load() {
    const userId = getCurrentUserId();
    if (!userId || !supabase || loading) return;
    loading = true;
    const requestVersion = ++loadVersion;
    refreshButton.disabled = true;
    previousButton.disabled = true;
    nextButton.disabled = true;
    currentButton.disabled = true;
    syncStatus.textContent = "Syncing your connected calendars…";
    try {
      const startAt = new Date(weekStart);
      const endAt = addDays(startAt, 21);
      startAt.setHours(0, 0, 0, 0);
      endAt.setHours(0, 0, 0, 0);
      const { data, error } = await supabase.functions.invoke("calendar-events", {
        body: { startAt: startAt.toISOString(), endAt: endAt.toISOString() },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (error) throw error;
      if (userId !== getCurrentUserId() || requestVersion !== loadVersion) return;
      events = Array.isArray(data?.events) ? data.events.filter((event) =>
        event && typeof event === "object" &&
        typeof event.startAt === "string" &&
        typeof event.title === "string"
      ) : [];
      sources = data?.sources && typeof data.sources === "object" ? data.sources : {};
      loaded = true;
      renderSourceStatus();
      renderWeek();
    } catch (error) {
      if (userId !== getCurrentUserId() || requestVersion !== loadVersion) return;
      syncStatus.textContent = `Calendar sync failed: ${getErrorMessage(error)}`;
      if (!loaded) {
        setEmptyState(weekGrid, "Connect a calendar or Canvas account to see your schedule.", true);
        setEmptyState(socialWindows, "Connect a calendar or Canvas account to get planning suggestions.", true);
        setEmptyState(protectDays, "Potential conflicts will appear here after syncing your schedule.");
      }
    } finally {
      if (requestVersion === loadVersion) {
        loading = false;
        refreshButton.disabled = false;
        previousButton.disabled = false;
        nextButton.disabled = false;
        currentButton.disabled = false;
      }
    }
  }

  function reset() {
    loadVersion += 1;
    loading = false;
    refreshButton.disabled = false;
    previousButton.disabled = false;
    nextButton.disabled = false;
    currentButton.disabled = false;
    events = [];
    sources = {};
    loaded = false;
    weekStart = mondayOf(new Date());
    eventCount.textContent = "0";
    weekHeading.textContent = "This week";
    syncStatus.textContent = "Sign in to sync your schedule.";
    lastSynced.textContent = "Your calendar data stays private.";
    setEmptyState(weekGrid, "Connect a calendar or Canvas account to see your schedule.");
    setEmptyState(socialWindows, "Your open windows will appear after a calendar sync.");
    setEmptyState(protectDays, "Nearby commitments and deadlines will appear here.");
  }

  previousButton.addEventListener("click", () => {
    weekStart = addDays(weekStart, -7);
    void load();
  });
  nextButton.addEventListener("click", () => {
    weekStart = addDays(weekStart, 7);
    void load();
  });
  currentButton.addEventListener("click", () => {
    weekStart = mondayOf(new Date());
    void load();
  });
  refreshButton.addEventListener("click", () => void load());

  return { load, refresh: load, reset };
}
