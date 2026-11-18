import { isSupabaseConfigured, supabase } from "./src/supabase.js";
import { initializeBudget } from "./src/budget.js";

const authScreen = document.querySelector("#auth-screen");
const workspaceShell = document.querySelector("#workspace-shell");
const authForm = document.querySelector("#auth-form");
const authMessage = document.querySelector("#auth-message");
const authHeading = document.querySelector("#auth-heading");
const authDescription = document.querySelector("#auth-description");
const authTabs = document.querySelector("#auth-tabs");
const authMethodTabs = document.querySelector("#auth-method-tabs");
const emailMethodTab = document.querySelector("#email-method-tab");
const phoneMethodTab = document.querySelector("#phone-method-tab");
const fullNameField = document.querySelector("#full-name-field");
const emailField = document.querySelector("#email-field");
const fullNameInput = document.querySelector("#auth-name");
const emailInput = document.querySelector("#auth-email");
const signupEmailNote = document.querySelector("#signup-email-note");
const phoneField = document.querySelector("#phone-field");
const phoneInput = document.querySelector("#auth-phone");
const phoneNote = document.querySelector("#phone-note");
const phoneCodeField = document.querySelector("#phone-code-field");
const phoneCodeInput = document.querySelector("#auth-phone-code");
const changePhoneButton = document.querySelector("#change-phone-button");
const passwordField = document.querySelector("#password-field");
const passwordInput = document.querySelector("#auth-password");
const submitButton = document.querySelector("#auth-submit");
const phoneLinkButton = document.querySelector("#phone-link-button");
const phoneLinkDialog = document.querySelector("#phone-link-dialog");
const phoneLinkForm = document.querySelector("#phone-link-form");
const phoneLinkNumber = document.querySelector("#phone-link-number");
const phoneLinkCodeField = document.querySelector("#phone-link-code-field");
const phoneLinkCode = document.querySelector("#phone-link-code");
const phoneLinkMessage = document.querySelector("#phone-link-message");
const phoneLinkCancel = document.querySelector("#phone-link-cancel");
const phoneLinkSubmit = document.querySelector("#phone-link-submit");
const profileForm = document.querySelector("#profile-form");
const profileFullNameInput = document.querySelector("#profile-full-name");
const profileEmailInput = document.querySelector("#profile-email");
const profileMessage = document.querySelector("#profile-message");
const profileSaveButton = document.querySelector("#profile-save-button");
const passwordPinRequestButton = document.querySelector("#password-pin-request");
const passwordChangeForm = document.querySelector("#password-change-form");
const passwordVerificationCode = document.querySelector("#password-verification-code");
const newAccountPassword = document.querySelector("#new-account-password");
const confirmAccountPassword = document.querySelector("#confirm-account-password");
const passwordChangeMessage = document.querySelector("#password-change-message");
const passwordChangeSubmit = document.querySelector("#password-change-submit");
const deleteAccountForm = document.querySelector("#delete-account-form");
const deleteAccountConfirmation = document.querySelector("#delete-account-confirmation");
const deleteAccountMessage = document.querySelector("#delete-account-message");
const deleteAccountSubmit = document.querySelector("#delete-account-submit");
const onboardingScreen = document.querySelector("#onboarding-screen");
const onboardingChoosePage = document.querySelector("#onboarding-choose-page");
const onboardingHowPage = document.querySelector("#onboarding-how-page");
const onboardingProgress = document.querySelector("#onboarding-progress");
const platformChoiceForm = document.querySelector("#platform-choice-form");
const platformChoiceMessage = document.querySelector("#platform-choice-message");
const platformChoiceSkip = document.querySelector("#platform-choice-skip");
const onboardingUserName = document.querySelector("#onboarding-user-name");
const onboardingFinishMessage = document.querySelector("#onboarding-finish-message");
const onboardingBackButton = document.querySelector("#onboarding-back-button");
const onboardingFinishButton = document.querySelector("#onboarding-finish-button");
const forgotPasswordButton = document.querySelector("#forgot-password-button");
const signInTab = document.querySelector("#signin-tab");
const signUpTab = document.querySelector("#signup-tab");
const passwordHint = document.querySelector("#password-hint");
const signOutButton = document.querySelector("#sign-out-button");
const accountEmail = document.querySelector("#account-email");
const searchInput = document.querySelector("#workspace-search");
const searchForm = document.querySelector("#workspace-search-form");
const searchSubmit = document.querySelector("#workspace-search-submit");
const searchResultsPanel = document.querySelector("#workspace-search-results");
const searchConversation = document.querySelector("#workspace-search-conversation");
const sourceCards = [...document.querySelectorAll(".source-card")];
const emptySearch = document.querySelector("#search-empty");
const refreshButton = document.querySelector("#refresh-button");
const refreshMeta = document.querySelector("#refresh-meta");
const assistantForm = document.querySelector("#assistant-form");
const assistantPrompt = document.querySelector("#assistant-prompt");
const assistantFeedback = document.querySelector("#assistant-feedback");
const assistantSubmit = document.querySelector("#assistant-submit");
const assistantConversation = document.querySelector("#assistant-conversation");
const assistantProviderSelect = document.querySelector("#provider-select");
const assistantProviderStatus = document.querySelector("#assistant-provider-status");
const aiProviderFeedback = document.querySelector("#ai-provider-feedback");
const aiProviderControls = {
  openai: {
    input: document.querySelector("#openai-api-key"),
    connect: document.querySelector("#openai-connect-button"),
    disconnect: document.querySelector("#openai-disconnect-button"),
    status: document.querySelector("#openai-provider-status"),
  },
  anthropic: {
    input: document.querySelector("#anthropic-api-key"),
    connect: document.querySelector("#anthropic-connect-button"),
    disconnect: document.querySelector("#anthropic-disconnect-button"),
    status: document.querySelector("#anthropic-provider-status"),
  },
};
const viewPages = [...document.querySelectorAll(".view-page")];
const navLinks = [...document.querySelectorAll(".primary-nav .nav-link")];
const moderatorNavLink = document.querySelector(".moderator-nav-link");
const moderatorUsersNavLink = document.querySelector(".moderator-users-nav-link");
const announcementFeedSection = document.querySelector("#announcement-feed-section");
const announcementFeed = document.querySelector("#announcement-feed");
const announcementForm = document.querySelector("#announcement-form");
const announcementIdInput = document.querySelector("#announcement-id");
const announcementTitleInput = document.querySelector("#announcement-title");
const announcementBodyInput = document.querySelector("#announcement-body");
const announcementPublishedInput = document.querySelector("#announcement-published");
const announcementSubmit = document.querySelector("#announcement-submit");
const announcementCancel = document.querySelector("#announcement-cancel");
const announcementMessage = document.querySelector("#announcement-message");
const moderatorAnnouncementList = document.querySelector("#moderator-announcement-list");
const moderatorActivityRefresh = document.querySelector("#moderator-activity-refresh");
const moderatorTotalUsers = document.querySelector("#moderator-total-users");
const moderatorActiveNow = document.querySelector("#moderator-active-now");
const moderatorActiveWeek = document.querySelector("#moderator-active-week");
const moderatorMemberCount = document.querySelector("#moderator-member-count");
const moderatorMemberSearch = document.querySelector("#moderator-member-search");
const moderatorMemberList = document.querySelector("#moderator-member-list");
const moderatorPageCount = document.querySelector("#moderator-page-count");
const moderatorPagePrevious = document.querySelector("#moderator-page-previous");
const moderatorPageNext = document.querySelector("#moderator-page-next");
const moderatorActivityMessage = document.querySelector("#moderator-activity-message");
const connectionFeedback = document.querySelector("#connection-feedback");
const canvasInstanceUrl = document.querySelector("#canvas-instance-url");
const mainPlatformSelect = document.querySelector("#main-platform-select");
const mainPlatformSave = document.querySelector("#main-platform-save");
const mainPlatformSettingsMessage = document.querySelector("#main-platform-settings-message");
const mainPlatformFocus = document.querySelector("#main-platform-focus");
const mainPlatformFocusName = document.querySelector("#main-platform-focus-name");
const mainPlatformFocusDescription = document.querySelector("#main-platform-focus-description");
const mainPlatformOpen = document.querySelector("#main-platform-open");
const dashboardSettingsGrid = document.querySelector("#dashboard-settings-grid");
const dashboardSettingsSave = document.querySelector("#dashboard-settings-save");
const dashboardSettingsMessage = document.querySelector("#dashboard-settings-message");
const additionalPlatformShortcuts = document.querySelector("#additional-platform-shortcuts");
const platformChoiceNames = {
  canvas: "Canvas",
  minerva: "Minerva",
  blackboard: "Blackboard",
  teams: "Microsoft Teams",
};
const platformUrls = {
  canvas: "",
  minerva: "",
  blackboard: "",
  teams: "https://teams.microsoft.com/",
};
const pageTitles = {
  overview: "Your day, in focus",
  budget: "Budget",
  deadlines: "Deadlines",
  calendar: "Calendar",
  files: "Files",
  outlook: "Outlook",
  onenote: "OneNote",
  connections: "Connections",
  profile: "Profile & settings",
  moderator: "Moderator",
  "moderator-users": "Manage users",
};

let authMode = "signin";
let authMethod = "email";
let phoneCodePending = false;
let phoneLinkPending = false;
let currentUserId = null;
let currentUserEmail = "";
let isModerator = false;
let moderatorUsers = [];
let moderatorPage = 1;
let moderatorPages = 1;
let presenceInterval = null;
let presenceErrorLogged = false;
let presenceVisibilityHandler = null;
let currentUserName = "";
let mainPlatform = null;
let savedPlatformUrls = {};
let onboardingCompleted = false;
let onboardingVersion = 0;
let dashboardSources = [];
let pendingDashboardSources = [];
let pendingMainPlatform = null;
let assistantMessages = [];
let assistantProviderConnections = { openai: false, anthropic: false, local: false };
let recoveryFlowPending =
  new URLSearchParams(window.location.search).get("auth") === "recovery" ||
  window.location.hash.includes("type=recovery");
const budget = initializeBudget({
  supabase,
  getCurrentUserId: () => currentUserId,
  getCurrentUserEmail: () => currentUserEmail,
});

function resetPrivateWorkspace() {
  budget.reset();
  document.querySelector("#deadline-count").textContent = "0";
  document.querySelector("#file-count").textContent = "0";
  document.querySelector("#connected-count").textContent = "0";
  const syncStatus = document.querySelector("#sync-status");
  syncStatus.replaceChildren();
  const pulse = document.createElement("span");
  pulse.className = "status-pulse";
  syncStatus.append(pulse, document.createTextNode("No sources connected"));
  isModerator = false;
  moderatorNavLink.hidden = true;
  moderatorUsersNavLink.hidden = true;
  announcementFeedSection.hidden = true;
  announcementFeed.replaceChildren();
  moderatorAnnouncementList.replaceChildren();
  document.querySelector("#moderator-announcement-count").textContent = "0 announcements";
  moderatorUsers = [];
  moderatorPage = 1;
  moderatorPages = 1;
  moderatorMemberList.replaceChildren();
  moderatorTotalUsers.textContent = "—";
  moderatorActiveNow.textContent = "—";
  moderatorActiveWeek.textContent = "—";
  moderatorMemberCount.textContent = "Showing recent accounts";
  moderatorPageCount.textContent = "Page 1 of 1";
  moderatorPagePrevious.disabled = true;
  moderatorPageNext.disabled = true;
  moderatorActivityMessage.textContent = "";

  for (const card of sourceCards) {
    card.classList.remove("is-connected");
    const description = card.querySelector("p");
    const status = card.querySelector(".source-status");
    description.textContent = card.dataset.provider === "uploads" ? "Your private file space" : "Waiting for first sync";
    status.classList.remove("connected");
    status.classList.add("disconnected");
    status.textContent = card.dataset.provider === "uploads" ? "No files yet" : "Not connected";
  }
}

function setAuthMessage(message, kind = "info") {
  authMessage.textContent = message;
  authMessage.dataset.kind = kind;
}

function setAuthMode(mode) {
  authMode = mode;
  if (mode === "recovery" || mode === "update-password") authMethod = "email";
  const isSignUp = mode === "signup";
  const isRecovery = mode === "recovery";
  const isPasswordUpdate = mode === "update-password";
  const isStandardMode = !isRecovery && !isPasswordUpdate;
  const isPhoneSignIn = authMethod === "phone" && mode === "signin";
  const isEmailMode = !isPhoneSignIn;

  fullNameField.hidden = !isSignUp || !isEmailMode;
  fullNameInput.required = isSignUp && isEmailMode;
  emailField.hidden = isPasswordUpdate || !isEmailMode;
  emailInput.required = isEmailMode && !isPasswordUpdate;
  signupEmailNote.hidden = !isSignUp || !isEmailMode;
  phoneField.hidden = !isPhoneSignIn;
  phoneInput.required = isPhoneSignIn;
  phoneNote.hidden = !isPhoneSignIn;
  phoneCodeField.hidden = !isPhoneSignIn || !phoneCodePending;
  phoneCodeInput.required = isPhoneSignIn && phoneCodePending;
  changePhoneButton.hidden = !isPhoneSignIn || !phoneCodePending;
  passwordField.hidden = isRecovery || isPhoneSignIn;
  passwordInput.required = !isRecovery && !isPhoneSignIn;
  passwordInput.autocomplete = isSignUp || isPasswordUpdate ? "new-password" : "current-password";
  passwordHint.textContent = isSignUp
    ? "Use at least 8 characters."
    : isPasswordUpdate
      ? "Choose a new password with at least 8 characters."
      : "Use the password for your University Hub account.";
  authHeading.textContent = isRecovery
    ? "Reset your password."
    : isPasswordUpdate
      ? "Choose a new password."
      : isPhoneSignIn
        ? "Sign in with your phone."
        : "A little more space to think.";
  authDescription.textContent = isRecovery
    ? "We’ll email you a secure link to reset your password."
    : isPasswordUpdate
      ? "Choose a new password for your University Hub account."
      : isPhoneSignIn
        ? "Get a one-time text message code to access your private workspace."
      : "Sign in to your private workspace, or create an account to get started.";
  submitButton.textContent = isSignUp
    ? "Create your account"
    : isPhoneSignIn
      ? phoneCodePending ? "Verify code and sign in" : "Text me a sign-in code"
    : isRecovery
      ? "Send reset link"
      : isPasswordUpdate
        ? "Update password"
        : "Sign in";
  authMethodTabs.hidden = !isStandardMode;
  authTabs.hidden = !isStandardMode || !isEmailMode;
  forgotPasswordButton.hidden = mode !== "signin" || !isEmailMode;
  emailMethodTab.classList.toggle("is-active", isEmailMode);
  phoneMethodTab.classList.toggle("is-active", isPhoneSignIn);
  emailMethodTab.setAttribute("aria-selected", String(isEmailMode));
  phoneMethodTab.setAttribute("aria-selected", String(isPhoneSignIn));
  signInTab.classList.toggle("is-active", mode === "signin");
  signUpTab.classList.toggle("is-active", isSignUp);
  signInTab.setAttribute("aria-selected", String(mode === "signin"));
  signUpTab.setAttribute("aria-selected", String(isSignUp));
  if (isRecovery || isPasswordUpdate || isPhoneSignIn) passwordInput.value = "";
  if (!isSupabaseConfigured) {
    setAuthMessage(
      isSignUp
        ? "Create account needs a configured Supabase project. Follow the setup steps in README.md."
        : isRecovery
          ? "Password reset needs a configured Supabase project. Follow the setup steps in README.md."
          : "Account sign-in isn't configured yet. Follow the Supabase setup steps in README.md.",
      "error",
    );
  } else {
    setAuthMessage("");
  }
}

function resetAssistantState(providerStatus) {
  assistantMessages = [];
  assistantConversation.replaceChildren();
  assistantFeedback.hidden = true;
  assistantFeedback.textContent = "";
  assistantProviderConnections = { openai: false, anthropic: false, local: false };
  assistantProviderStatus.textContent = providerStatus;
  aiProviderFeedback.textContent = "";
  for (const controls of Object.values(aiProviderControls)) {
    controls.input.value = "";
    controls.connect.disabled = false;
    controls.disconnect.disabled = false;
    controls.status.textContent = "Not connected";
    controls.status.classList.remove("is-connected");
    controls.disconnect.hidden = true;
  }
  assistantSubmit.disabled = false;
}

function showSignedOut(message = "") {
  stopPresenceTracking();
  currentUserId = null;
  currentUserEmail = "";
  currentUserName = "";
  mainPlatform = null;
  savedPlatformUrls = {};
  onboardingCompleted = false;
  onboardingVersion = 0;
  dashboardSources = [];
  pendingDashboardSources = [];
  resetAssistantState("Sign in to connect an AI provider.");
  searchInput.value = "";
  searchSubmit.disabled = false;
  searchConversation.replaceChildren();
  searchResultsPanel.hidden = true;
  onboardingScreen.hidden = true;
  mainPlatformFocus.hidden = true;
  additionalPlatformShortcuts.hidden = true;
  profileFullNameInput.value = "";
  profileEmailInput.value = "";
  profileMessage.textContent = "";
  passwordChangeForm.reset();
  passwordChangeMessage.textContent = "";
  deleteAccountForm.reset();
  deleteAccountMessage.textContent = "";
  for (const platform of ["canvas", "minerva", "blackboard"]) {
    document.querySelector(`#platform-url-${platform}`).value = "";
  }
  workspaceShell.hidden = true;
  authScreen.hidden = false;
  accountEmail.textContent = "";
  resetPrivateWorkspace();
  if (message) setAuthMessage(message);
}

async function showSignedIn(user) {
  const isNewSession = currentUserId !== user.id;
  if (isNewSession) {
    resetPrivateWorkspace();
    resetAssistantState("Loading your AI provider settings…");
  }
  currentUserId = user.id;
  currentUserEmail = user.email || "";
  if (isNewSession) startPresenceTracking(user.id);
  currentUserName = user.user_metadata?.full_name?.trim() || user.email?.split("@")[0] || "there";
  profileFullNameInput.value = user.user_metadata?.full_name?.trim() || "";
  profileEmailInput.value = user.email ?? "";
  passwordPinRequestButton.disabled = !user.email;
  passwordChangeMessage.textContent = user.email
    ? ""
    : "This phone-only account has no email address for password verification codes.";
  const welcomeHeading = document.querySelector("#welcome-heading");
  welcomeHeading.replaceChildren(
    document.createTextNode(`Welcome, ${currentUserName}`),
    welcomeHeading.querySelector(".heading-period"),
  );
  authScreen.hidden = true;
  onboardingScreen.hidden = true;
  workspaceShell.hidden = true;
  accountEmail.textContent = user.email || user.phone || "";
  phoneLinkButton.hidden = Boolean(user.phone);
  setAuthMessage("");
  if (isNewSession) {
    await Promise.all([
      loadPrivateWorkspaceData(user.id),
      loadUserPreferences(user.id),
      budget.load(user.id),
    ]);
    assistantMessages = [];
    assistantConversation.replaceChildren();
    void loadAssistantProviderStatus(user.id);
  }
}

function stopPresenceTracking() {
  if (presenceInterval !== null) window.clearInterval(presenceInterval);
  presenceInterval = null;
  if (presenceVisibilityHandler) {
    document.removeEventListener("visibilitychange", presenceVisibilityHandler);
    presenceVisibilityHandler = null;
  }
}

function startPresenceTracking(userId) {
  stopPresenceTracking();
  const recordPresence = async () => {
    if (!supabase || userId !== currentUserId || document.visibilityState !== "visible") return;
    try {
      const { error } = await supabase.functions.invoke("record-presence");
      if (error) throw error;
      presenceErrorLogged = false;
    } catch (error) {
      if (!presenceErrorLogged) {
        console.error("University Hub could not update recent presence.", error);
        presenceErrorLogged = true;
      }
    }
  };
  presenceVisibilityHandler = () => {
    if (document.visibilityState === "visible") void recordPresence();
  };
  document.addEventListener("visibilitychange", presenceVisibilityHandler);
  presenceInterval = window.setInterval(() => void recordPresence(), 60_000);
  void recordPresence();
}

function validPlatformUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function renderMainPlatformFocus() {
  mainPlatformFocus.hidden = !mainPlatform;
  mainPlatformSelect.value = mainPlatform ?? "";
  if (mainPlatform) {
    mainPlatformFocusName.textContent = platformChoiceNames[mainPlatform];
    mainPlatformFocusDescription.textContent = mainPlatform === "teams"
      ? "Open your university Teams workspace."
      : savedPlatformUrls[mainPlatform]
        ? "Your saved university portal is ready."
        : `Add your school's ${platformChoiceNames[mainPlatform]} link in Connections to open it from here.`;
  }

  additionalPlatformShortcuts.replaceChildren();
  const additionalPlatforms = dashboardSources.filter(
    (platform) => Object.hasOwn(platformChoiceNames, platform) && platform !== mainPlatform,
  );
  additionalPlatformShortcuts.hidden = additionalPlatforms.length === 0;
  for (const platform of additionalPlatforms) {
    const button = document.createElement("button");
    button.className = "additional-platform-shortcut";
    button.type = "button";
    button.textContent = `Open ${platformChoiceNames[platform]} ↗`;
    button.addEventListener("click", () => openPlatform(platform));
    additionalPlatformShortcuts.append(button);
  }
}

const dashboardSourceChoices = [
  ["canvas", "Canvas portal & deadlines"],
  ["minerva", "Minerva shortcut"],
  ["blackboard", "Blackboard shortcut"],
  ["teams", "Microsoft Teams shortcut"],
  ["google_drive", "Google Drive"],
  ["google_calendar", "Google Calendar"],
  ["outlook_mail", "Outlook email"],
  ["outlook_calendar", "Outlook Calendar"],
  ["onedrive", "OneDrive"],
  ["onenote", "OneNote"],
  ["uploads", "My files"],
];

function renderDashboardSettings(selectedSources = dashboardSources) {
  dashboardSettingsGrid.replaceChildren();
  for (const [provider, label] of dashboardSourceChoices) {
    const choice = document.createElement("label");
    choice.className = "dashboard-setting-option";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = provider;
    input.checked = selectedSources.includes(provider);
    const text = document.createElement("span");
    text.textContent = label;
    choice.append(input, text);
    dashboardSettingsGrid.append(choice);
  }
}

function renderDashboardSources() {
  filterSources();
  renderMainPlatformFocus();
}

function showOnboardingPage(step) {
  const choose = step === "choose";
  onboardingChoosePage.hidden = !choose;
  onboardingHowPage.hidden = choose;
  onboardingChoosePage.classList.toggle("is-active", choose);
  onboardingHowPage.classList.toggle("is-active", !choose);
  onboardingProgress.textContent = choose ? "Step 1 of 2" : "Step 2 of 2";
  if (choose) {
    onboardingUserName.textContent = currentUserName;
  }
}

async function loadUserPreferences(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, main_platform, platform_urls, onboarding_completed, onboarding_version, dashboard_sources")
    .eq("id", userId)
    .maybeSingle();
  if (userId !== currentUserId) return;
  if (error || !data) {
    document.querySelector("#sync-status").textContent =
      `Could not load your home preferences: ${error?.message ?? "Profile not found"}.`;
    onboardingScreen.hidden = true;
    workspaceShell.hidden = false;
    return;
  }

  currentUserName = data.full_name?.trim() || currentUserName;
  profileFullNameInput.value = currentUserName;
  const welcomeHeading = document.querySelector("#welcome-heading");
  welcomeHeading.replaceChildren(
    document.createTextNode(`Welcome, ${currentUserName}`),
    welcomeHeading.querySelector(".heading-period"),
  );
  mainPlatform = data.main_platform ?? null;
  savedPlatformUrls = data.platform_urls && typeof data.platform_urls === "object"
    ? data.platform_urls
    : {};
  onboardingVersion = data.onboarding_version ?? (data.onboarding_completed ? 1 : 0);
  onboardingCompleted = onboardingVersion >= 2;
  dashboardSources = onboardingVersion >= 1 && Array.isArray(data.dashboard_sources)
    ? data.dashboard_sources
    : [];
  for (const platform of ["canvas", "minerva", "blackboard"]) {
    const urlField = document.querySelector(`#platform-url-${platform}`);
    urlField.value = typeof savedPlatformUrls[platform] === "string" ? savedPlatformUrls[platform] : "";
  }
  renderDashboardSettings();
  renderDashboardSources();
  renderMainPlatformFocus();

  if (onboardingCompleted) {
    onboardingScreen.hidden = true;
    workspaceShell.hidden = false;
  } else {
    platformChoiceForm.reset();
    if (onboardingVersion === 1 && mainPlatform) {
      const radio = platformChoiceForm.querySelector(`input[name="main-platform"][value="${mainPlatform}"]`);
      if (radio) radio.checked = true;
      for (const checkbox of platformChoiceForm.querySelectorAll('input[name="dashboard-source"]')) {
        checkbox.checked = dashboardSources.includes(checkbox.value);
      }
    }
    platformChoiceMessage.textContent = "";
    onboardingFinishMessage.textContent = "";
    showOnboardingPage("choose");
    workspaceShell.hidden = true;
    onboardingScreen.hidden = false;
  }
}

async function savePlatformPreferences({
  nextPlatform = mainPlatform,
  nextSources = dashboardSources,
  completed = true,
} = {}) {
  if (!currentUserId || !supabase) return false;
  const { error } = await supabase
    .from("profiles")
    .update({
      main_platform: nextPlatform,
      onboarding_completed: completed,
      onboarding_version: 2,
      dashboard_sources: nextSources,
    })
    .eq("id", currentUserId);
  if (error) throw error;
  mainPlatform = nextPlatform;
  onboardingCompleted = completed;
  onboardingVersion = 2;
  dashboardSources = nextSources;
  renderDashboardSettings();
  renderDashboardSources();
  renderMainPlatformFocus();
  return true;
}

function openPlatform(platform) {
  if (platform === "teams") {
    window.open(platformUrls.teams, "_blank", "noopener,noreferrer");
    return;
  }
  const url = validPlatformUrl(savedPlatformUrls[platform] ?? "");
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  window.location.hash = "connections";
  mainPlatformSettingsMessage.textContent = `Add and save your school's ${platformChoiceNames[platform]} portal URL below, then select Open.`;
}

function filterSources() {
  let visibleCount = 0;

  for (const card of sourceCards) {
    const matches = dashboardSources.includes(card.dataset.provider);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  }

  emptySearch.textContent = "No service cards selected yet. Add them from Connections whenever you're ready.";
  emptySearch.hidden = visibleCount > 0;
}

function addSearchTurn(query) {
  const turn = document.createElement("article");
  turn.className = "search-turn";
  const prompt = document.createElement("p");
  prompt.className = "search-user-message";
  prompt.textContent = query;
  const response = document.createElement("div");
  response.className = "search-assistant-response";
  const status = document.createElement("p");
  status.className = "search-meta";
  status.textContent = "Searching your connected services…";
  response.append(status);
  turn.append(prompt, response);
  searchConversation.append(turn);
  while (searchConversation.children.length > 5) searchConversation.firstElementChild.remove();
  searchResultsPanel.hidden = false;
  return response;
}

function renderSearchResultList(container, results) {
  const list = document.createElement("div");
  list.className = "search-result-list";
  for (const result of results) {
    if (!result || typeof result.title !== "string" || typeof result.provider !== "string") continue;
    let url;
    try {
      url = new URL(result.url);
    } catch {
      continue;
    }
    if (url.protocol !== "https:") continue;

    const card = document.createElement("article");
    card.className = "search-result-card";
    const source = document.createElement("p");
    source.className = "search-result-source";
    source.textContent = result.provider;
    const link = document.createElement("a");
    link.href = url.toString();
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = result.title;
    card.append(source, link);
    if (typeof result.description === "string" && result.description) {
      const description = document.createElement("p");
      description.className = "search-result-description";
      description.textContent = result.description;
      card.append(description);
    }
    if (typeof result.modifiedAt === "string") {
      const date = new Date(result.modifiedAt);
      if (!Number.isNaN(date.getTime())) {
        const time = document.createElement("time");
        time.className = "search-result-date";
        time.dateTime = date.toISOString();
        time.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
        card.append(time);
      }
    }
    list.append(card);
  }
  if (list.childElementCount) container.append(list);
}

function renderWorkspaceSearchResponse(container, data) {
  const answer = document.createElement("p");
  answer.className = "search-answer";
  answer.textContent = typeof data.answer === "string"
    ? data.answer
    : data.results.length
      ? `I found ${data.results.length} matching item${data.results.length === 1 ? "" : "s"}. Select a result to open it.`
      : Array.isArray(data.providerErrors) && data.providerErrors.length
        ? "Some connected services couldn't be searched. Check the messages below; any results that were found are still shown."
      : data.searched.length
        ? "I couldn't find a matching file or message in the connected services."
        : "Connect Google, Microsoft, or Canvas in Connections to search those accounts. Minerva, Blackboard, and Teams are currently portal shortcuts and cannot be searched.";
  container.replaceChildren(answer);

  if (data.results.length) renderSearchResultList(container, data.results);
  if (!data.aiConfigured) {
    const modelNote = document.createElement("p");
    modelNote.className = "search-meta";
    modelNote.textContent = "File search is available. Connect an AI provider in Connections to get a summary of the matches.";
    container.append(modelNote);
  } else {
    const modelNote = document.createElement("p");
    modelNote.className = "search-meta";
    modelNote.textContent = "Your selected AI provider received the query and matching result titles and dates only, not file contents.";
    container.append(modelNote);
  }
  if (Array.isArray(data.searched) && data.searched.length) {
    const searched = document.createElement("p");
    searched.className = "search-meta";
    searched.textContent = `Searched: ${[...new Set(data.searched)].join(" · ")}`;
    container.append(searched);
  }
  if (Array.isArray(data.providerErrors)) {
    for (const message of data.providerErrors) {
      if (typeof message !== "string") continue;
      const error = document.createElement("p");
      error.className = "search-error";
      error.textContent = message;
      container.append(error);
    }
  }
  if (typeof data.answerError === "string" && data.answerError) {
    const error = document.createElement("p");
    error.className = "search-error";
    error.textContent = `Search worked, but the AI summary failed: ${data.answerError}`;
    container.append(error);
  }
}

async function submitWorkspaceSearch(query) {
  const response = addSearchTurn(query);
  const userId = currentUserId;
  if (!supabase || !isSupabaseConfigured || !userId) {
    response.firstElementChild.textContent = "Sign in to search your connected services.";
    return;
  }

  searchSubmit.disabled = true;
  try {
    const { data, error } = await supabase.functions.invoke("workspace-search", {
      body: { query, assistantProvider: assistantProviderSelect.value },
    });
    if (currentUserId !== userId) return;
    if (error) throw error;
    if (!data || !Array.isArray(data.results) || !Array.isArray(data.searched)) {
      throw new Error("The search service returned an unexpected response.");
    }
    renderWorkspaceSearchResponse(response, data);
  } catch (error) {
    if (currentUserId !== userId) return;
    const message = document.createElement("p");
    message.className = "search-error";
    message.textContent = `Couldn't search your workspace: ${error.message}`;
    response.replaceChildren(message);
  } finally {
    if (currentUserId === userId) searchSubmit.disabled = false;
  }
}

function showView(viewName) {
  const activeView = ["moderator", "moderator-users"].includes(viewName) && !isModerator
    ? "overview"
    : viewName;
  for (const page of viewPages) {
    page.hidden = page.dataset.view !== activeView;
  }

  for (const link of navLinks) {
    const linkView = link.hash.slice(1);
    const active = linkView === activeView;
    link.classList.toggle("is-active", active);
    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }

  document.title = `University Hub — ${pageTitles[activeView]}.`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function routeFromHash() {
  if (recoveryFlowPending || /(?:access_token|refresh_token|error|type)=/.test(window.location.hash)) return;
  const viewName = window.location.hash.slice(1) || "overview";
  if (!Object.hasOwn(pageTitles, viewName)) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#overview`);
    showView("overview");
    return;
  }
  if (["moderator", "moderator-users"].includes(viewName) && !isModerator) {
    showView("overview");
    if (currentUserId) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#overview`);
    }
    return;
  }
  showView(viewName);
}

function clearRecoveryCallbackUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("auth");
  url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function updateConnectionCards(connections) {
  const byProvider = new Map(connections.map((connection) => [connection.provider, connection]));
  let connectedCount = 0;
  let lastSyncedAt = null;

  for (const card of sourceCards) {
    const connection = byProvider.get(card.dataset.provider);
    const description = card.querySelector("p");
    const status = card.querySelector(".source-status");
    const isConnected = connection?.status === "connected";

    card.classList.toggle("is-connected", Boolean(isConnected));
    status.classList.toggle("connected", Boolean(isConnected));
    status.classList.toggle("disconnected", !isConnected);

    if (isConnected) {
      connectedCount += 1;
      status.textContent = connection.account_label || "Connected";
      description.textContent = connection.last_synced_at
        ? `Synced ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(connection.last_synced_at))}`
        : "Connected · awaiting first sync";
      if (connection.last_synced_at && (!lastSyncedAt || connection.last_synced_at > lastSyncedAt)) {
        lastSyncedAt = connection.last_synced_at;
      }
    } else {
      status.textContent = connection ? "Reconnect required" : card.dataset.provider === "uploads" ? "No files yet" : "Not connected";
      description.textContent = connection
        ? "Connection needs attention"
        : card.dataset.provider === "uploads" ? "Your private file space" : "Waiting for first sync";
    }
  }

  document.querySelector("#connected-count").textContent = String(connectedCount);
  const syncStatus = document.querySelector("#sync-status");
  syncStatus.innerHTML = '<span class="status-pulse"></span>';
  syncStatus.append(
    document.createTextNode(
      lastSyncedAt
        ? `Last successful sync · ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastSyncedAt))}`
        : connectedCount
          ? "Connected · awaiting first sync"
          : "No sources connected",
    ),
  );
}

function formatRecordDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(date.getHours() || date.getMinutes() ? { timeStyle: "short" } : {}),
  }).format(date);
}

function renderRecordList(elementId, records, emptyTitle, emptyDescription, metaForRecord) {
  const list = document.querySelector(`#${elementId}`);
  list.replaceChildren();

  if (!records.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "data-empty";
    const icon = document.createElement("span");
    icon.className = "data-empty-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✳";
    const title = document.createElement("h3");
    title.textContent = emptyTitle;
    const description = document.createElement("p");
    description.textContent = emptyDescription;
    emptyState.append(icon, title, description);
    list.append(emptyState);
    return;
  }

  for (const record of records) {
    const row = document.createElement("article");
    row.className = "record-row";
    const content = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = record.title;
    content.append(title);
    if (record.summary) {
      const summary = document.createElement("p");
      summary.textContent = record.summary;
      content.append(summary);
    }

    const meta = document.createElement("span");
    meta.className = "record-row-meta";
    meta.textContent = metaForRecord(record);
    if (record.due_at && new Date(record.due_at) < new Date()) {
      meta.classList.add("is-overdue");
    }
    row.append(content, meta);
    list.append(row);
  }
}

function renderConnectionDetails(connections) {
  const providers = [
    ["canvas", "Canvas", "Course pages, assignments, and due dates"],
    ["google_drive", "Google Drive", "Documents and study materials"],
    ["google_calendar", "Google Calendar", "Classes, events, and study time"],
    ["outlook_mail", "Outlook email", "Messages and university updates"],
    ["outlook_calendar", "Outlook Calendar", "Meetings and key dates"],
    ["onedrive", "OneDrive", "Cloud files and course documents"],
    ["onenote", "OneNote", "Lecture and class notes"],
  ];
  const byProvider = new Map(connections.map((connection) => [connection.provider, connection]));
  const list = document.querySelector("#connections-detail-list");
  let connectedCount = 0;
  list.replaceChildren();

  for (const [provider, name, description] of providers) {
    const connection = byProvider.get(provider);
    const connected = connection?.status === "connected";
    if (connected) connectedCount += 1;
    const item = document.createElement("article");
    item.className = "connection-detail-item";
    const content = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = name;
    const detail = document.createElement("p");
    detail.textContent = connected && connection.account_label
      ? `${description} · ${connection.account_label}`
      : description;
    content.append(title, detail);
    const status = document.createElement("span");
    status.className = `connection-detail-status${connected ? " is-connected" : ""}`;
    status.textContent = connected
      ? connection.last_synced_at
        ? `Connected · synced ${formatRecordDate(connection.last_synced_at)}`
        : "Connected · first sync pending"
      : connection ? "Reconnect required" : "Not connected";
    item.append(content, status);
    list.append(item);
  }

  document.querySelector("#connections-page-count").textContent = `${connectedCount} of 7 linked`;
  const providerGroups = {
    google: ["google_drive", "google_calendar"],
    microsoft: ["outlook_mail", "outlook_calendar", "onedrive", "onenote"],
    canvas: ["canvas"],
  };
  for (const [provider, relatedProviders] of Object.entries(providerGroups)) {
    const linked = relatedProviders
      .map((relatedProvider) => byProvider.get(relatedProvider))
      .filter((connection) => connection?.status === "connected");
    const card = document.querySelector(`[data-oauth-provider="${provider}"]`);
    const status = card.querySelector("[data-provider-status]");
    const connectButton = card.querySelector("[data-connect-provider]");
    const disconnectButton = card.querySelector("[data-disconnect-provider]");
    const fullyConnected = linked.length === relatedProviders.length;
    status.classList.toggle("is-connected", fullyConnected);
    status.textContent = fullyConnected
      ? `Connected${linked[0]?.account_label ? ` · ${linked[0].account_label}` : ""}`
      : linked.length
        ? "Partially connected"
        : "Not connected";
    connectButton.textContent = fullyConnected ? "Reconnect account" : `Connect ${provider === "google" ? "Google" : provider === "microsoft" ? "Microsoft" : "Canvas"}`;
    disconnectButton.hidden = linked.length === 0;
  }

  const canvas = byProvider.get("canvas");
  document.querySelector("#deadline-connection-status").textContent = canvas?.status === "connected"
    ? "Connected"
    : "Not connected";
  const calendarConnections = ["google_calendar", "outlook_calendar"]
    .filter((provider) => byProvider.get(provider)?.status === "connected").length;
  const calendarSourceCount = document.querySelector("#calendar-source-count");
  const calendarDetail = document.createElement("small");
  calendarDetail.textContent = "connected";
  calendarSourceCount.replaceChildren(
    document.createTextNode(`${calendarConnections} `),
    calendarDetail,
  );
  const outlookConnections = ["outlook_mail", "outlook_calendar"]
    .filter((provider) => byProvider.get(provider)?.status === "connected").length;
  const outlookConnectionCount = document.querySelector("#outlook-connection-count");
  const outlookDetail = document.createElement("small");
  outlookDetail.textContent = "connected";
  outlookConnectionCount.replaceChildren(
    document.createTextNode(`${outlookConnections} `),
    outlookDetail,
  );
  document.querySelector("#onenote-connection-status").textContent =
    byProvider.get("onenote")?.status === "connected" ? "Connected" : "Not connected";
}

function showConnectionFeedback(message, kind = "info") {
  connectionFeedback.textContent = message;
  connectionFeedback.dataset.kind = kind;
}

function updateAssistantProviderStatus() {
  const provider = assistantProviderSelect.value;
  if (provider === "local") {
    assistantProviderStatus.textContent = assistantProviderConnections.local
      ? "Site model is ready."
      : "The site administrator has not configured a model.";
    return;
  }
  const label = provider === "openai" ? "OpenAI" : "Anthropic";
  assistantProviderStatus.textContent = assistantProviderConnections[provider]
    ? `${label} API connected.`
    : `${label} API not connected. Add its API key in Connections.`;
}

async function loadAssistantProviderStatus(userId = currentUserId) {
  if (!supabase || !isSupabaseConfigured || !userId) return;
  try {
    const { data, error } = await supabase.functions.invoke("assistant-provider", {
      body: { action: "status", provider: "openai" },
    });
    if (error) throw error;
    if (currentUserId !== userId || !data?.providers) return;
    assistantProviderConnections = {
      openai: Boolean(data.providers.openai),
      anthropic: Boolean(data.providers.anthropic),
      local: Boolean(data.localConfigured),
    };
    for (const provider of ["openai", "anthropic"]) {
      const controls = aiProviderControls[provider];
      const connected = assistantProviderConnections[provider];
      controls.status.textContent = connected ? "Connected" : "Not connected";
      controls.status.classList.toggle("is-connected", connected);
      controls.disconnect.hidden = !connected;
    }
    if (
      assistantProviderSelect.value === "openai" &&
      !assistantProviderConnections.openai
    ) {
      assistantProviderSelect.value = assistantProviderConnections.anthropic
        ? "anthropic"
        : assistantProviderConnections.local
          ? "local"
          : "openai";
    }
    updateAssistantProviderStatus();
  } catch (error) {
    if (currentUserId === userId) {
      aiProviderFeedback.textContent =
        `Couldn't load AI provider settings: ${error.message || "Deploy the assistant functions and migration first."}`;
    }
  }
}

async function connectAssistantProvider(provider) {
  if (!supabase || !currentUserId) return;
  const userId = currentUserId;
  const controls = aiProviderControls[provider];
  const apiKey = controls.input.value.trim();
  if (!apiKey) {
    controls.input.focus();
    aiProviderFeedback.textContent = `Enter your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key.`;
    return;
  }

  controls.connect.disabled = true;
  aiProviderFeedback.textContent = `Verifying ${provider === "openai" ? "OpenAI" : "Anthropic"} API key…`;
  try {
    const { data, error } = await supabase.functions.invoke("assistant-provider", {
      body: { action: "connect", provider, apiKey },
    });
    if (currentUserId !== userId) return;
    if (error) throw error;
    controls.input.value = "";
    assistantProviderConnections[provider] = true;
    controls.status.textContent = `Connected · ${data.model}`;
    controls.status.classList.add("is-connected");
    controls.disconnect.hidden = false;
    assistantProviderSelect.value = provider;
    updateAssistantProviderStatus();
    aiProviderFeedback.textContent = `${provider === "openai" ? "OpenAI" : "Anthropic"} connected. API requests may incur usage charges.`;
  } catch (error) {
    if (currentUserId !== userId) return;
    aiProviderFeedback.textContent =
      `Couldn't connect ${provider === "openai" ? "OpenAI" : "Anthropic"}: ${error.message || "Check the API key and try again."}`;
  } finally {
    if (currentUserId === userId) controls.connect.disabled = false;
  }
}

async function disconnectAssistantProvider(provider) {
  if (!supabase || !currentUserId) return;
  const userId = currentUserId;
  const controls = aiProviderControls[provider];
  controls.disconnect.disabled = true;
  aiProviderFeedback.textContent = `Disconnecting ${provider === "openai" ? "OpenAI" : "Anthropic"}…`;
  try {
    const { error } = await supabase.functions.invoke("assistant-provider", {
      body: { action: "disconnect", provider },
    });
    if (currentUserId !== userId) return;
    if (error) throw error;
    assistantProviderConnections[provider] = false;
    controls.status.textContent = "Not connected";
    controls.status.classList.remove("is-connected");
    controls.disconnect.hidden = true;
    if (assistantProviderSelect.value === provider) {
      const alternate = provider === "openai" ? "anthropic" : "openai";
      assistantProviderSelect.value = assistantProviderConnections[alternate]
        ? alternate
        : assistantProviderConnections.local
          ? "local"
          : provider;
    }
    updateAssistantProviderStatus();
    aiProviderFeedback.textContent = `${provider === "openai" ? "OpenAI" : "Anthropic"} disconnected.`;
  } catch (error) {
    if (currentUserId !== userId) return;
    aiProviderFeedback.textContent = `Couldn't disconnect the provider: ${error.message || "Try again."}`;
  } finally {
    if (currentUserId === userId) controls.disconnect.disabled = false;
  }
}

function handleOAuthReturn() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get("connection");
  if (!result) return;
  const providerNames = { google: "Google", microsoft: "Microsoft", canvas: "Canvas" };
  const provider = providerNames[params.get("provider")] ?? "service";
  if (result === "success") {
    showConnectionFeedback(`${provider} account connected. You can disconnect it here at any time.`, "success");
  } else if (result === "cancelled") {
    showConnectionFeedback(`${provider} connection was cancelled. No account was linked.`);
  } else {
    showConnectionFeedback(`${provider} could not be connected. Check its OAuth setup and try again.`, "error");
  }
  params.delete("connection");
  params.delete("provider");
  const query = params.toString();
  history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
}

async function getOAuthStartErrorMessage(error) {
  const response = error?.context;
  if (response && typeof response.status === "number") {
    if (response.status === 404) {
      return "The secure provider sign-in function is not deployed. Ask the site administrator to deploy oauth-start.";
    }
    if (response.status === 401) {
      return "Your session has expired. Sign in again, then reconnect the provider.";
    }
    try {
      const body = await response.clone().json();
      if (typeof body?.error === "string" && body.error.trim()) return body.error;
    } catch {
      // The response may not contain JSON.
    }
  }
  if (error?.name === "FunctionsFetchError") {
    return "Could not reach secure provider sign-in. Check the deployed function and its APP_URL/CORS configuration.";
  }
  return error?.message || "Could not start provider sign-in. Check the setup and try again.";
}

async function beginProviderConnection(provider, button) {
  if (!supabase || !isSupabaseConfigured || !currentUserId) {
    showConnectionFeedback("Sign in to your University Hub account before connecting an external service.", "error");
    return;
  }

  const body = { provider };
  if (provider === "canvas") {
    const instanceUrl = canvasInstanceUrl.value.trim();
    if (!instanceUrl) {
      canvasInstanceUrl.focus();
      showConnectionFeedback("Enter your school's Canvas URL to continue.", "error");
      return;
    }
    body.instanceUrl = instanceUrl;
  }

  button.disabled = true;
  showConnectionFeedback(`Opening ${provider === "google" ? "Google" : provider === "microsoft" ? "Microsoft" : "Canvas"} sign-in…`);
  try {
    const { data, error } = await supabase.functions.invoke("oauth-start", { body });
    if (error) throw error;
    const authorizationUrl = new URL(data?.authorizationUrl ?? "");
    const allowedHosts = provider === "google"
      ? ["accounts.google.com"]
      : provider === "microsoft"
        ? ["login.microsoftonline.com"]
        : [new URL(canvasInstanceUrl.value.trim()).hostname];
    if (authorizationUrl.protocol !== "https:" || !allowedHosts.includes(authorizationUrl.hostname)) {
      throw new Error("The OAuth service returned an unexpected sign-in address.");
    }
    window.location.assign(authorizationUrl.href);
  } catch (error) {
    showConnectionFeedback(await getOAuthStartErrorMessage(error), "error");
    button.disabled = false;
  }
}

async function disconnectProvider(provider, button) {
  if (!supabase || !isSupabaseConfigured || !currentUserId) return;
  button.disabled = true;
  showConnectionFeedback("Disconnecting account…");
  try {
    const { error } = await supabase.functions.invoke("oauth-disconnect", { body: { provider } });
    if (error) throw error;
    showConnectionFeedback("University Hub removed the stored authorization. Revoke its provider grant in your account security settings to fully invalidate access.", "success");
    await Promise.all([loadPrivateWorkspaceData(currentUserId), budget.refresh()]);
  } catch (error) {
    showConnectionFeedback(error.message || "Could not disconnect this account. Try again.", "error");
  } finally {
    button.disabled = false;
  }
}

function renderAnnouncements(announcements) {
  const published = announcements.filter((announcement) => announcement.is_published);
  announcementFeedSection.hidden = published.length === 0;
  announcementFeed.replaceChildren();

  for (const announcement of published) {
    const item = document.createElement("article");
    item.className = "announcement-item";
    const title = document.createElement("h2");
    title.textContent = announcement.title;
    const body = document.createElement("p");
    body.textContent = announcement.body;
    const date = document.createElement("span");
    date.textContent = formatRecordDate(announcement.updated_at);
    item.append(title, body, date);
    announcementFeed.append(item);
  }

  moderatorAnnouncementList.replaceChildren();
  document.querySelector("#moderator-announcement-count").textContent =
    `${announcements.length} announcement${announcements.length === 1 ? "" : "s"}`;

  if (!announcements.length) {
    const empty = document.createElement("p");
    empty.className = "moderator-empty";
    empty.textContent = "There are no announcements yet.";
    moderatorAnnouncementList.append(empty);
    return;
  }

  for (const announcement of announcements) {
    const item = document.createElement("article");
    item.className = "moderator-announcement-item";
    const content = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = announcement.title;
    const body = document.createElement("p");
    body.textContent = announcement.body;
    const state = document.createElement("span");
    state.className = `announcement-state${announcement.is_published ? " is-published" : ""}`;
    state.textContent = announcement.is_published ? "Published" : "Draft";
    content.append(title, body, state);

    const actions = document.createElement("div");
    actions.className = "moderator-announcement-actions";
    const edit = document.createElement("button");
    edit.className = "text-button";
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => {
      announcementIdInput.value = announcement.id;
      announcementTitleInput.value = announcement.title;
      announcementBodyInput.value = announcement.body;
      announcementPublishedInput.checked = announcement.is_published;
      document.querySelector("#announcement-form-heading").textContent = "Edit announcement";
      announcementSubmit.textContent = "Save changes";
      announcementCancel.hidden = false;
      announcementMessage.textContent = "";
      announcementTitleInput.focus();
    });

    const remove = document.createElement("button");
    remove.className = "text-button is-danger";
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => {
      void deleteAnnouncement(announcement.id);
    });
    actions.append(edit, remove);
    item.append(content, actions);
    moderatorAnnouncementList.append(item);
  }
}

function renderModeratorMembers() {
  const query = moderatorMemberSearch.value.trim().toLowerCase();
  const visibleUsers = moderatorUsers.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(query),
  );
  moderatorMemberList.replaceChildren();
  moderatorMemberCount.textContent =
    `Showing ${visibleUsers.length} of ${moderatorUsers.length} accounts on this page`;

  if (!visibleUsers.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "moderator-table-empty";
    cell.textContent = query ? "No accounts match your search." : "No member accounts to show.";
    row.append(cell);
    moderatorMemberList.append(row);
    return;
  }

  for (const user of visibleUsers) {
    const row = document.createElement("tr");
    const memberCell = document.createElement("td");
    memberCell.className = "moderator-member-identity";
    const name = document.createElement("strong");
    name.textContent = user.name || "University Hub member";
    const email = document.createElement("span");
    email.textContent = user.email || "No email address";
    memberCell.append(name, email);

    const joinedCell = document.createElement("td");
    joinedCell.textContent = formatRecordDate(user.createdAt);
    const signInCell = document.createElement("td");
    signInCell.textContent = user.lastSignInAt ? formatRecordDate(user.lastSignInAt) : "Never";
    const activeCell = document.createElement("td");
    activeCell.textContent = user.lastSeenAt ? formatRecordDate(user.lastSeenAt) : "Not yet seen";

    const accessCell = document.createElement("td");
    const access = document.createElement("span");
    access.className = `member-access${user.isActive ? " is-active" : ""}`;
    access.textContent = user.isModerator ? "Moderator" : user.isActive ? "Active" : "Member";
    accessCell.append(access);

    const actionsCell = document.createElement("td");
    if (!user.isModerator && user.id !== currentUserId) {
      const actions = document.createElement("div");
      actions.className = "moderator-member-actions";
      if (user.email) {
        const resetButton = document.createElement("button");
        resetButton.type = "button";
        resetButton.className = "text-button";
        resetButton.textContent = "Send reset link";
        resetButton.addEventListener("click", () => void sendMemberPasswordReset(user, resetButton));
        actions.append(resetButton);
      }
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "text-button is-danger";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => void removeMember(user, removeButton));
      actions.append(removeButton);
      actionsCell.append(actions);
    } else {
      actionsCell.textContent = "Protected";
    }

    row.append(memberCell, joinedCell, signInCell, activeCell, accessCell, actionsCell);
    moderatorMemberList.append(row);
  }
}

async function loadModeratorActivity() {
  if (!isModerator || !currentUserId || moderatorActivityRefresh.disabled) return;
  const requestedByUserId = currentUserId;
  moderatorActivityRefresh.disabled = true;
  moderatorActivityMessage.textContent = "Loading account activity…";
  try {
    const { data, error } = await supabase.functions.invoke("moderator-activity", {
      body: { page: moderatorPage },
    });
    if (error) throw error;
    if (currentUserId !== requestedByUserId || !isModerator) return;
    moderatorTotalUsers.textContent = String(data.totalUsers);
    moderatorActiveNow.textContent = String(data.activeNow);
    moderatorActiveWeek.textContent = String(data.activeLast7Days);
    moderatorPage = data.page;
    moderatorPages = data.pageCount;
    moderatorUsers = data.users ?? [];
    moderatorPageCount.textContent = `Page ${moderatorPage} of ${moderatorPages}`;
    moderatorPagePrevious.disabled = moderatorPage <= 1;
    moderatorPageNext.disabled = moderatorPage >= moderatorPages;
    moderatorActivityMessage.textContent = "Member activity is refreshed on demand and while people use the app.";
    renderModeratorMembers();
  } catch (error) {
    moderatorActivityMessage.textContent =
      `Couldn't load member activity: ${error.message || "Check the moderator function deployment."}`;
  } finally {
    moderatorActivityRefresh.disabled = false;
  }
}

async function removeMember(user, button) {
  if (!isModerator || !currentUserId || button.disabled) return;
  const confirmed = window.confirm(
    `Permanently remove ${user.email || "this member"} and their University Hub account data? This cannot be undone.`,
  );
  if (!confirmed || window.prompt('Type DELETE to confirm account removal.') !== "DELETE") return;

  button.disabled = true;
  moderatorActivityMessage.textContent = `Removing ${user.email || "member"}…`;
  try {
    const { error } = await supabase.functions.invoke("moderator-delete-user", {
      body: { userId: user.id, confirmation: "DELETE" },
    });
    if (error) throw error;
    moderatorActivityMessage.textContent = `${user.email || "The member"} and their account data were removed.`;
    await loadPrivateWorkspaceData(currentUserId);
  } catch (error) {
    moderatorActivityMessage.textContent =
      `Couldn't remove this account: ${error.message || "Check the moderator function deployment."}`;
    button.disabled = false;
  }
}

async function sendMemberPasswordReset(user, button) {
  if (!isModerator || !currentUserId || button.disabled || !user.email) return;
  if (!window.confirm(`Send a password reset email to ${user.email}?`)) return;

  button.disabled = true;
  moderatorActivityMessage.textContent = `Sending a password reset email to ${user.email}…`;
  try {
    const { error } = await supabase.functions.invoke("moderator-send-password-reset", {
      body: { userId: user.id },
    });
    if (error) throw error;
    moderatorActivityMessage.textContent = `Password reset email sent to ${user.email}.`;
  } catch (error) {
    moderatorActivityMessage.textContent =
      `Couldn't send a password reset email: ${error.message || "Check the function deployment and email setup."}`;
  } finally {
    button.disabled = false;
  }
}

function resetAnnouncementEditor() {
  announcementForm.reset();
  announcementIdInput.value = "";
  document.querySelector("#announcement-form-heading").textContent = "Create an announcement";
  announcementSubmit.textContent = "Publish announcement";
  announcementCancel.hidden = true;
  announcementMessage.textContent = "";
}

async function deleteAnnouncement(id) {
  if (!isModerator || !currentUserId || !window.confirm("Delete this announcement for everyone?")) return;
  announcementMessage.textContent = "Deleting announcement…";

  try {
    const { error } = await supabase.from("shared_announcements").delete().eq("id", id);
    if (error) throw error;
    announcementMessage.textContent = "Announcement deleted.";
    await loadPrivateWorkspaceData(currentUserId);
  } catch (error) {
    announcementMessage.textContent = `Couldn't delete announcement: ${error.message}`;
  }
}

function renderWorkspaceViews(records, connections) {
  const now = new Date();
  const upcoming = records.filter((record) => record.due_at && new Date(record.due_at) >= now);
  const canvasDeadlines = upcoming
    .filter((record) => record.provider === "canvas")
    .sort((left, right) => new Date(left.due_at) - new Date(right.due_at));
  const calendarEvents = upcoming
    .filter((record) => ["google_calendar", "outlook_calendar"].includes(record.provider))
    .sort((left, right) => new Date(left.due_at) - new Date(right.due_at));
  const files = records.filter((record) =>
    ["google_drive", "onedrive", "uploads"].includes(record.provider),
  );
  const messages = records.filter((record) => record.provider === "outlook_mail");
  const notes = records.filter((record) => record.provider === "onenote");

  document.querySelector("#calendar-event-count").textContent = String(calendarEvents.length);
  document.querySelector("#outlook-message-count").textContent = String(messages.length);
  document.querySelector("#onenote-count").textContent = String(notes.length);
  document.querySelector("#files-page-count").textContent = String(files.length);

  renderRecordList(
    "deadlines-list",
    canvasDeadlines,
    "No upcoming deadlines",
    "Canvas assignments will appear here after your account is connected and synced.",
    (record) => `Due ${formatRecordDate(record.due_at)}`,
  );
  renderRecordList(
    "calendar-list",
    calendarEvents,
    "Your calendar is clear",
    "Events from Google Calendar and Outlook will appear here after you connect a calendar.",
    (record) => formatRecordDate(record.due_at),
  );
  renderRecordList(
    "files-list",
    files,
    "No files here yet",
    "Files from Drive, OneDrive, and your private uploads will be collected here.",
    (record) => record.provider.replaceAll("_", " "),
  );
  renderRecordList(
    "outlook-list",
    messages,
    "No messages saved",
    "Important Outlook messages will appear here once your account is connected.",
    (record) => formatRecordDate(record.created_at),
  );
  renderRecordList(
    "onenote-list",
    notes,
    "No notes synced yet",
    "Your recent OneNote pages will appear here after your account is connected.",
    (record) => formatRecordDate(record.updated_at ?? record.created_at),
  );
  renderConnectionDetails(connections);
}

async function loadPrivateWorkspaceData(userId) {
  const thisWeek = new Date();
  const endOfWeek = new Date(thisWeek);
  endOfWeek.setDate(thisWeek.getDate() + 7);
  try {
    const [connectionsResult, deadlinesResult, filesResult, recordsResult, roleResult, announcementsResult] = await Promise.all([
      supabase.from("connections").select("provider, account_label, status, last_synced_at"),
      supabase
        .from("workspace_records")
        .select("id", { count: "exact", head: true })
        .eq("provider", "canvas")
        .not("due_at", "is", null)
        .gte("due_at", thisWeek.toISOString())
        .lte("due_at", endOfWeek.toISOString()),
      supabase
        .from("workspace_records")
        .select("id", { count: "exact", head: true })
        .in("record_type", ["file", "document", "upload"]),
      supabase
        .from("workspace_records")
        .select("id, provider, record_type, title, summary, due_at, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "moderator")
        .maybeSingle(),
      supabase
        .from("shared_announcements")
        .select("id, title, body, is_published, created_by, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

    if (userId !== currentUserId) return;

    if (
      connectionsResult.error ||
      deadlinesResult.error ||
      filesResult.error ||
      recordsResult.error ||
      roleResult.error ||
      announcementsResult.error
    ) {
      const error =
        connectionsResult.error ??
        deadlinesResult.error ??
        filesResult.error ??
        recordsResult.error ??
        roleResult.error ??
        announcementsResult.error;
      document.querySelector("#sync-status").textContent = `Couldn't load workspace data: ${error.message}`;
      return;
    }

    isModerator = roleResult.data?.role === "moderator";
    moderatorNavLink.hidden = !isModerator;
    moderatorUsersNavLink.hidden = !isModerator;
    updateConnectionCards(connectionsResult.data ?? []);
    document.querySelector("#deadline-count").textContent = String(deadlinesResult.count ?? 0);
    document.querySelector("#file-count").textContent = String(filesResult.count ?? 0);
    renderWorkspaceViews(recordsResult.data ?? [], connectionsResult.data ?? []);
    renderAnnouncements(announcementsResult.data ?? []);
    if (isModerator) {
      void loadModeratorActivity();
    } else {
      moderatorUsers = [];
      moderatorMemberList.replaceChildren();
    }
    routeFromHash();
  } catch (error) {
    if (userId === currentUserId) {
      document.querySelector("#sync-status").textContent = `Couldn't load workspace data: ${error.message}`;
    }
  }
}

signInTab.addEventListener("click", () => setAuthMode("signin"));
signUpTab.addEventListener("click", () => setAuthMode("signup"));
emailMethodTab.addEventListener("click", () => {
  authMethod = "email";
  phoneCodePending = false;
  phoneCodeInput.value = "";
  setAuthMode("signin");
});
phoneMethodTab.addEventListener("click", () => {
  authMethod = "phone";
  phoneCodePending = false;
  phoneCodeInput.value = "";
  setAuthMode("signin");
});
changePhoneButton.addEventListener("click", () => {
  phoneCodePending = false;
  phoneCodeInput.value = "";
  setAuthMode("signin");
  phoneInput.focus();
});
forgotPasswordButton.addEventListener("click", () => {
  setAuthMode("recovery");
  emailInput.focus();
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  if (!isSupabaseConfigured || !supabase) {
    setAuthMessage(
      authMode === "signup"
        ? "Your account cannot be created yet: connect a Supabase project first. See README.md for setup."
        : authMode === "recovery"
          ? "Password reset is unavailable until a Supabase project is connected. See README.md for setup."
          : "Sign-in is unavailable until a Supabase project is connected. See README.md for setup.",
      "error",
    );
    return;
  }

  submitButton.disabled = true;
  setAuthMessage(
    authMode === "signup"
      ? "Creating your account…"
      : authMethod === "phone"
        ? phoneCodePending ? "Verifying your code…" : "Sending your sign-in code…"
      : authMode === "recovery"
        ? "Sending your reset link…"
        : authMode === "update-password"
          ? "Updating your password…"
          : "Signing in…",
  );

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (authMethod === "phone" && authMode === "signin") {
      const phone = phoneInput.value.trim();
      if (phoneCodePending) {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token: phoneCodeInput.value.trim(),
          type: "sms",
        });
        if (error) throw error;
        if (!data.session || !data.user) throw new Error("That code did not sign you in. Request a new code and try again.");
        phoneCodePending = false;
        phoneCodeInput.value = "";
        await showSignedIn(data.user);
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone,
          options: { shouldCreateUser: false },
        });
        if (error) throw error;
        phoneCodePending = true;
        phoneCodeInput.value = "";
        setAuthMode("signin");
        setAuthMessage("If this number is registered, a one-time code has been sent by text.", "success");
        phoneCodeInput.focus();
      }
      return;
    }
    if (authMode === "recovery") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?auth=recovery`,
      });
      if (error) throw error;
      setAuthMessage(
        "If an account exists for that email, a secure password reset link is on its way. Check your inbox.",
        "success",
      );
      return;
    }

    if (authMode === "update-password") {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      recoveryFlowPending = false;
      clearRecoveryCallbackUrl();
      await showSignedIn(data.user);
      refreshMeta.textContent = "Your password was updated.";
      return;
    }

    const result = authMode === "signup"
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullNameInput.value.trim() },
            emailRedirectTo: window.location.origin,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) throw result.error;

    if (authMode === "signup" && result.data.session) {
      await supabase.auth.signOut();
      setAuthMessage(
        "Email confirmation is disabled in this Supabase project. Enable email confirmations in Authentication settings before allowing sign-up.",
        "error",
      );
    } else if (authMode === "signup") {
      setAuthMessage("Account created. Check your email, including spam, and confirm it before signing in.", "success");
    } else if (result.data.session) {
      await showSignedIn(result.data.user);
    } else {
      setAuthMessage("Your account is ready. Sign in to continue.", "success");
      setAuthMode("signin");
    }
  } catch (error) {
    setAuthMessage(error.message || "We couldn't complete that request. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

phoneLinkButton.addEventListener("click", () => {
  phoneLinkMessage.textContent = "";
  phoneLinkMessage.dataset.kind = "info";
  phoneLinkDialog.showModal();
  phoneLinkNumber.focus();
});

phoneLinkCancel.addEventListener("click", () => phoneLinkDialog.close());

phoneLinkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase || !currentUserId || phoneLinkSubmit.disabled) return;

  const phone = phoneLinkNumber.value.trim();
  phoneLinkSubmit.disabled = true;
  phoneLinkMessage.textContent = phoneLinkPending ? "Verifying your code…" : "Sending your verification code…";
  phoneLinkMessage.dataset.kind = "info";

  try {
    if (phoneLinkPending) {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: phoneLinkCode.value.trim(),
        type: "phone_change",
      });
      if (error) throw error;
      if (data.user?.id !== currentUserId) throw new Error("The phone number was not attached to the current account.");
      phoneLinkPending = false;
      phoneLinkButton.hidden = true;
      accountEmail.textContent = data.user.email || data.user.phone || "";
      phoneLinkNumber.disabled = true;
      phoneLinkCodeField.hidden = true;
      phoneLinkCode.required = false;
      phoneLinkSubmit.hidden = true;
      phoneLinkCancel.textContent = "Done";
      phoneLinkMessage.textContent = "Your mobile number is verified and linked to this account. You can now use phone sign-in.";
      phoneLinkMessage.dataset.kind = "success";
    } else {
      const { error } = await supabase.auth.updateUser({ phone });
      if (error) throw error;
      phoneLinkPending = true;
      phoneLinkCodeField.hidden = false;
      phoneLinkCode.required = true;
      phoneLinkSubmit.textContent = "Verify mobile number";
      phoneLinkMessage.textContent = "Enter the code sent to your phone to finish linking it to this account.";
      phoneLinkMessage.dataset.kind = "success";
      phoneLinkCode.focus();
    }
  } catch (error) {
    phoneLinkMessage.textContent = error.message || "We couldn't update your mobile number. Please try again.";
    phoneLinkMessage.dataset.kind = "error";
  } finally {
    phoneLinkSubmit.disabled = false;
  }
});

document.querySelectorAll("[data-connect-provider]").forEach((button) => {
  button.addEventListener("click", () => {
    void beginProviderConnection(button.dataset.connectProvider, button);
  });
});

document.querySelectorAll("[data-disconnect-provider]").forEach((button) => {
  button.addEventListener("click", () => {
    void disconnectProvider(button.dataset.disconnectProvider, button);
  });
});

for (const provider of ["openai", "anthropic"]) {
  aiProviderControls[provider].connect.addEventListener("click", () => {
    void connectAssistantProvider(provider);
  });
  aiProviderControls[provider].disconnect.addEventListener("click", () => {
    void disconnectAssistantProvider(provider);
  });
}

assistantProviderSelect.addEventListener("change", updateAssistantProviderStatus);

platformChoiceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selected = platformChoiceForm.querySelector('input[name="main-platform"]:checked');
  if (!selected) return;
  pendingMainPlatform = selected.value;
  pendingDashboardSources = [
    ...new Set([
      ...[...platformChoiceForm.querySelectorAll('input[name="dashboard-source"]:checked')]
        .map((input) => input.value),
      selected.value,
    ]),
  ];
  platformChoiceMessage.textContent = "";
  onboardingFinishMessage.textContent = "";
  showOnboardingPage("how");
});

platformChoiceSkip.addEventListener("click", () => {
  pendingMainPlatform = null;
  pendingDashboardSources = [];
  onboardingFinishMessage.textContent = "";
  showOnboardingPage("how");
});

onboardingBackButton.addEventListener("click", () => showOnboardingPage("choose"));

onboardingFinishButton.addEventListener("click", async () => {
  onboardingFinishButton.disabled = true;
  onboardingFinishMessage.textContent = "Getting your space ready…";
  try {
    await savePlatformPreferences({
      nextPlatform: pendingMainPlatform,
      nextSources: pendingDashboardSources,
      completed: true,
    });
    onboardingScreen.hidden = true;
    workspaceShell.hidden = false;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#overview`);
    routeFromHash();
  } catch (error) {
    onboardingFinishMessage.textContent = `Couldn't finish setup: ${error.message}`;
  } finally {
    onboardingFinishButton.disabled = false;
  }
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase || !currentUserId || profileSaveButton.disabled) return;
  const fullName = profileFullNameInput.value.trim();
  if (!fullName) {
    profileMessage.textContent = "Enter your name before saving.";
    return;
  }
  profileSaveButton.disabled = true;
  profileMessage.textContent = "Saving your profile…";
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", currentUserId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error("Your profile record is missing. Apply the latest Supabase migrations, then sign in again.");
    }
    currentUserName = fullName;
    const welcomeHeading = document.querySelector("#welcome-heading");
    welcomeHeading.replaceChildren(
      document.createTextNode(`Welcome, ${currentUserName}`),
      welcomeHeading.querySelector(".heading-period"),
    );
    onboardingUserName.textContent = currentUserName;
    profileMessage.textContent = "Your profile has been updated.";
  } catch (error) {
    profileMessage.textContent = `Couldn't save your profile: ${error.message}`;
  } finally {
    profileSaveButton.disabled = false;
  }
});

passwordPinRequestButton.addEventListener("click", async () => {
  const email = profileEmailInput.value.trim();
  if (!supabase || !email || passwordPinRequestButton.disabled) {
    passwordChangeMessage.textContent = "A verified email address is required to change your password.";
    return;
  }
  passwordPinRequestButton.disabled = true;
  passwordChangeMessage.textContent = "Sending your verification code…";
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?auth=recovery`,
    });
    if (error) throw error;
    passwordChangeMessage.textContent = "Check your inbox and spam folder for a password recovery email. Enter its one-time code below.";
  } catch (error) {
    passwordChangeMessage.textContent = error.message || "Couldn't send the verification email. Try again.";
  } finally {
    passwordPinRequestButton.disabled = false;
  }
});

passwordChangeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase || !currentUserId || passwordChangeSubmit.disabled) return;
  const email = profileEmailInput.value.trim();
  const code = passwordVerificationCode.value.trim();
  const password = newAccountPassword.value;
  if (!email) {
    passwordChangeMessage.textContent = "A verified email address is required to change your password.";
    return;
  }
  if (password !== confirmAccountPassword.value) {
    passwordChangeMessage.textContent = "The new passwords don't match.";
    return;
  }

  passwordChangeSubmit.disabled = true;
  passwordChangeMessage.textContent = "Verifying your code…";
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });
    if (error) throw error;
    if (!data.session || data.user?.id !== currentUserId) {
      throw new Error("That code didn't verify this account. Request a new code and try again.");
    }

    passwordChangeMessage.textContent = "Changing your password…";
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) throw updateError;
    recoveryFlowPending = false;
    setAuthMode("signin");
    passwordChangeForm.reset();
    passwordChangeMessage.textContent = "Your password has been changed.";
  } catch (error) {
    passwordChangeMessage.textContent = error.message || "Couldn't change your password. Request a new code and try again.";
  } finally {
    passwordChangeSubmit.disabled = false;
  }
});

deleteAccountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase || !currentUserId || deleteAccountSubmit.disabled) return;
  if (deleteAccountConfirmation.value.trim() !== "DELETE") {
    deleteAccountMessage.textContent = "Type DELETE exactly to confirm permanent account removal.";
    return;
  }
  deleteAccountSubmit.disabled = true;
  deleteAccountMessage.textContent = "Deleting your account and private data…";
  try {
    const { error } = await supabase.functions.invoke("account-delete", {
      body: { confirmation: "DELETE" },
    });
    if (error) throw error;
    showSignedOut("Your University Hub account has been permanently deleted.");
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) {
      console.error("University Hub could not clear the local session after account deletion.", signOutError);
      setAuthMessage("Your account was deleted, but this browser could not clear its saved sign-in. Please reload the page.", "error");
    }
  } catch (error) {
    deleteAccountMessage.textContent = error.message || "Couldn't delete your account. Please try again.";
  } finally {
    deleteAccountSubmit.disabled = false;
  }
});

mainPlatformSave.addEventListener("click", async () => {
  mainPlatformSave.disabled = true;
  mainPlatformSettingsMessage.textContent = "Saving your home page focus…";
  try {
    await savePlatformPreferences({
      nextPlatform: mainPlatformSelect.value || null,
      completed: true,
    });
    mainPlatformSettingsMessage.textContent = mainPlatform
      ? `${platformChoiceNames[mainPlatform]} is now shown on your Overview. All platform shortcuts remain available below.`
      : "Your Overview no longer has a main platform. All platform shortcuts remain available below.";
  } catch (error) {
    mainPlatformSettingsMessage.textContent = `Couldn't save your home focus: ${error.message}`;
  } finally {
    mainPlatformSave.disabled = false;
  }
});

mainPlatformOpen.addEventListener("click", () => {
  if (mainPlatform) openPlatform(mainPlatform);
});

dashboardSettingsSave.addEventListener("click", async () => {
  dashboardSettingsSave.disabled = true;
  dashboardSettingsMessage.textContent = "Saving dashboard cards…";
  try {
    const nextSources = [...dashboardSettingsGrid.querySelectorAll("input:checked")]
      .map((input) => input.value);
    const { error } = await supabase
      .from("profiles")
      .update({ dashboard_sources: nextSources })
      .eq("id", currentUserId);
    if (error) throw error;
    dashboardSources = nextSources;
    renderDashboardSources();
    dashboardSettingsMessage.textContent = "Dashboard cards saved. Hidden items are still available in Connections.";
  } catch (error) {
    dashboardSettingsMessage.textContent = `Couldn't save dashboard cards: ${error.message}`;
  } finally {
    dashboardSettingsSave.disabled = false;
  }
});

document.querySelectorAll("[data-save-platform-url]").forEach((button) => {
  button.addEventListener("click", async () => {
    const platform = button.dataset.savePlatformUrl;
    const input = document.querySelector(`#platform-url-${platform}`);
    const value = input.value.trim();
    const safeUrl = validPlatformUrl(value);
    if (!safeUrl) {
      input.focus();
      mainPlatformSettingsMessage.textContent = "Use a valid HTTPS portal URL without a username, password, query, or fragment.";
      return;
    }

    button.disabled = true;
    mainPlatformSettingsMessage.textContent = `Saving your ${platformChoiceNames[platform]} portal link…`;
    try {
      const nextUrls = { ...savedPlatformUrls, [platform]: safeUrl };
      const { error } = await supabase
        .from("profiles")
        .update({ platform_urls: nextUrls })
        .eq("id", currentUserId);
      if (error) throw error;
      savedPlatformUrls = nextUrls;
      input.value = safeUrl;
      renderMainPlatformFocus();
      mainPlatformSettingsMessage.textContent = `${platformChoiceNames[platform]} link saved to your private account.`;
    } catch (error) {
      mainPlatformSettingsMessage.textContent = `Couldn't save your portal link: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  });
});

document.querySelectorAll("[data-open-platform]").forEach((button) => {
  button.addEventListener("click", () => openPlatform(button.dataset.openPlatform));
});

signOutButton.addEventListener("click", async () => {
  if (!supabase) return;
  signOutButton.disabled = true;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    showSignedOut("You've signed out.");
  } catch (error) {
    document.querySelector("#sync-status").textContent = `Couldn't sign out: ${error.message}`;
  } finally {
    signOutButton.disabled = false;
  }
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) {
    searchInput.focus();
    return;
  }
  void submitWorkspaceSearch(query);
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }

  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    searchConversation.replaceChildren();
    searchResultsPanel.hidden = true;
    searchInput.blur();
  }
});

refreshButton.addEventListener("click", async () => {
  if (!currentUserId) return;
  refreshButton.classList.add("is-refreshing");
  refreshButton.disabled = true;
  refreshMeta.textContent = "Refreshing your private workspace…";
  try {
    await Promise.all([loadPrivateWorkspaceData(currentUserId), budget.refresh()]);
    refreshMeta.textContent = `View refreshed at ${new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date())}`;
  } finally {
    refreshButton.classList.remove("is-refreshing");
    refreshButton.disabled = false;
  }
});

function appendAssistantMessage(role, content) {
  const message = document.createElement("article");
  message.className = `assistant-message is-${role}`;
  const label = document.createElement("span");
  label.className = "assistant-message-label";
  label.textContent = role === "user" ? "You" : "Study assistant";
  const text = document.createElement("p");
  text.textContent = content;
  message.append(label, text);
  assistantConversation.append(message);
  while (assistantConversation.children.length > 12) {
    assistantConversation.firstElementChild.remove();
  }
  assistantConversation.scrollTop = assistantConversation.scrollHeight;
}

function constrainAssistantHistory(messages) {
  const recent = [];
  let totalLength = 0;
  for (const message of messages.slice(-12).reverse()) {
    if (totalLength + message.content.length > 16_000) break;
    recent.unshift(message);
    totalLength += message.content.length;
  }
  return recent;
}

assistantForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase || !currentUserId || assistantSubmit.disabled) return;
  const question = assistantPrompt.value.trim();
  if (!question) {
    assistantFeedback.hidden = false;
    assistantFeedback.textContent = "Add a question before sending.";
    assistantPrompt.focus();
    return;
  }
  if (question.length > 4000) {
    assistantFeedback.hidden = false;
    assistantFeedback.textContent = "Keep your question to 4,000 characters or fewer.";
    assistantPrompt.focus();
    return;
  }

  const userId = currentUserId;
  assistantMessages = constrainAssistantHistory([
    ...assistantMessages,
    { role: "user", content: question },
  ]);
  appendAssistantMessage("user", question);
  assistantPrompt.value = "";
  assistantFeedback.hidden = false;
  assistantFeedback.textContent = "Thinking…";
  assistantSubmit.disabled = true;
  try {
    const { data, error } = await supabase.functions.invoke("assistant-chat", {
      body: {
        provider: assistantProviderSelect.value,
        messages: assistantMessages,
      },
    });
    if (currentUserId !== userId) return;
    if (error) throw error;
    if (typeof data?.reply !== "string" || !data.reply.trim()) {
      throw new Error("The assistant returned an empty response.");
    }
    assistantMessages = constrainAssistantHistory([
      ...assistantMessages,
      { role: "assistant", content: data.reply },
    ]);
    appendAssistantMessage("assistant", data.reply);
    assistantFeedback.hidden = true;
    assistantFeedback.textContent = "";
  } catch (error) {
    if (currentUserId !== userId) return;
    assistantFeedback.textContent =
      `The assistant couldn't respond: ${error.message || "Check the provider connection and try again."}`;
  } finally {
    if (currentUserId === userId) assistantSubmit.disabled = false;
  }
});

announcementForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase || !isModerator || !currentUserId) return;

  announcementSubmit.disabled = true;
  announcementMessage.textContent = announcementIdInput.value ? "Saving changes…" : "Publishing announcement…";
  const announcement = {
    title: announcementTitleInput.value.trim(),
    body: announcementBodyInput.value.trim(),
    is_published: announcementPublishedInput.checked,
  };

  try {
    const result = announcementIdInput.value
      ? await supabase
          .from("shared_announcements")
          .update(announcement)
          .eq("id", announcementIdInput.value)
      : await supabase
          .from("shared_announcements")
          .insert({ ...announcement, created_by: currentUserId });

    if (result.error) throw result.error;
    resetAnnouncementEditor();
    announcementMessage.textContent = "Announcement saved.";
    await loadPrivateWorkspaceData(currentUserId);
  } catch (error) {
    announcementMessage.textContent = `Couldn't save announcement: ${error.message}`;
  } finally {
    announcementSubmit.disabled = false;
  }
});

announcementCancel.addEventListener("click", resetAnnouncementEditor);
moderatorActivityRefresh.addEventListener("click", () => void loadModeratorActivity());
moderatorMemberSearch.addEventListener("input", renderModeratorMembers);
moderatorPagePrevious.addEventListener("click", () => {
  if (moderatorPage <= 1) return;
  moderatorPage -= 1;
  void loadModeratorActivity();
});
moderatorPageNext.addEventListener("click", () => {
  if (moderatorPage >= moderatorPages) return;
  moderatorPage += 1;
  void loadModeratorActivity();
});

window.addEventListener("hashchange", routeFromHash);
handleOAuthReturn();
routeFromHash();

setAuthMode(recoveryFlowPending ? "update-password" : "signin");

if (!isSupabaseConfigured) {
  setAuthMessage("Connect a Supabase project to create accounts and send confirmation emails. See README.md.", "error");
} else {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryFlowPending = true;
      setAuthMode("update-password");
      return;
    }

    if (recoveryFlowPending) return;
    if (session?.user) {
      void showSignedIn(session.user);
    } else {
      showSignedOut();
    }
  });

  supabase.auth.getSession().then(({ data, error }) => {
    if (recoveryFlowPending) return;
    if (error) {
      showSignedOut(error.message);
    } else if (data.session?.user) {
      void showSignedIn(data.session.user);
    }
  });
}
