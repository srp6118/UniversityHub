const MAX_RECORDING_SECONDS = 3 * 60 * 60;
const MAX_TRANSCRIPT_LENGTH = 200_000;
const NOTE_PAGE_SIZE = 50;

function localDateString(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatRecordedDate(value) {
  if (!value) return "Date not set";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? "Date not set"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatDuration(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function getSpeechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function speechErrorMessage(code) {
  const messages = {
    "audio-capture": "No microphone was found. Connect a microphone and try again.",
    "language-not-supported": "This browser does not support speech recognition for your language.",
    "network": "The browser speech service is unavailable. Check your internet connection and try again.",
    "no-speech": "No speech was detected. Try again in a quieter place.",
    "not-allowed": "Microphone or speech recognition access was denied. Allow access in your browser settings.",
    "service-not-allowed": "This browser's speech recognition service is unavailable. Try another supported browser.",
  };
  return messages[code] || "Speech recognition stopped unexpectedly. Please try again.";
}

export function initializeLectureNotes({ supabase, getCurrentUserId }) {
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    recordForm: $("#lecture-record-form"),
    title: $("#lecture-title"),
    date: $("#lecture-date"),
    consent: $("#lecture-consent-checkbox"),
    recordButton: $("#lecture-record-button"),
    recordingIndicator: $("#lecture-recording-indicator"),
    timer: $("#lecture-recording-timer"),
    livePreview: $("#lecture-live-preview"),
    recordingFeedback: $("#lecture-recording-feedback"),
    notesCount: $("#lecture-notes-count"),
    notesStatus: $("#lecture-notes-status"),
    notesList: $("#lecture-notes-list"),
    loadMore: $("#lecture-notes-load-more"),
    notesEmpty: $("#lecture-notes-empty"),
    overviewCount: $("#lecture-overview-count"),
    overviewLatest: $("#lecture-overview-latest"),
  };

  let notes = [];
  let hasMoreNotes = false;
  let activeUserId = null;
  let recordingRun = null;

  elements.date.max = localDateString();
  elements.date.value = localDateString();

  function setMessage(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("is-error", isError);
  }

  function isCurrentUser(userId) {
    return activeUserId === userId && getCurrentUserId() === userId;
  }

  function renderOverview() {
    const count = notes.length;
    elements.overviewCount.textContent = count
      ? `${count} saved transcript${count === 1 ? "" : "s"}`
      : "No saved transcripts yet";
    const latest = notes[0];
    elements.overviewLatest.textContent = latest
      ? `Latest: ${latest.title} · ${formatRecordedDate(latest.recorded_on)}`
      : "Record a lecture and keep its transcript with your study notes.";
  }

  function renderNotes() {
    elements.notesList.replaceChildren();
    elements.notesCount.textContent = hasMoreNotes
      ? `${notes.length} shown`
      : `${notes.length} note${notes.length === 1 ? "" : "s"}`;
    elements.notesEmpty.hidden = notes.length > 0;
    elements.loadMore.hidden = !hasMoreNotes;
    renderOverview();

    for (const note of notes) {
      const card = document.createElement("article");
      card.className = "lecture-note-card";

      const header = document.createElement("div");
      header.className = "lecture-note-summary";
      const main = document.createElement("div");
      main.className = "lecture-note-summary-main";
      const title = document.createElement("h3");
      title.textContent = note.title;
      const metadata = document.createElement("p");
      const duration = Number(note.duration_seconds) > 0
        ? ` · ${formatDuration(note.duration_seconds)}`
        : "";
      metadata.textContent = `${formatRecordedDate(note.recorded_on)}${duration}`;
      main.append(title, metadata);

      const actions = document.createElement("div");
      actions.className = "lecture-note-actions";
      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.textContent = "Copy";
      copyButton.setAttribute("aria-label", `Copy transcript: ${note.title}`);
      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(note.transcript);
          setMessage(elements.notesStatus, "Transcript copied.");
        } catch {
          setMessage(elements.notesStatus, "Clipboard access is unavailable in this browser.", true);
        }
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute("aria-label", `Delete transcript: ${note.title}`);
      deleteButton.addEventListener("click", () => {
        void deleteNote(note);
      });
      actions.append(copyButton, deleteButton);
      header.append(main, actions);

      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.className = "lecture-note-toggle";
      summary.textContent = "Read transcript";
      const transcript = document.createElement("div");
      transcript.className = "lecture-note-transcript";
      const transcriptText = document.createElement("p");
      transcriptText.textContent = note.transcript;
      transcript.append(transcriptText);
      details.append(summary, transcript);
      card.append(header, details);
      elements.notesList.append(card);
    }
  }

  async function deleteNote(note) {
    const userId = activeUserId;
    if (!userId || !isCurrentUser(userId)) return;
    if (!window.confirm(`Delete the transcript “${note.title}”? This cannot be undone.`)) return;

    setMessage(elements.notesStatus, "Deleting transcript…");
    const { error } = await supabase
      .from("lecture_notes")
      .delete()
      .eq("id", note.id)
      .eq("user_id", userId);
    if (!isCurrentUser(userId)) return;
    if (error) {
      setMessage(elements.notesStatus, "Could not delete that transcript. Please try again.", true);
      return;
    }
    notes = notes.filter((entry) => entry.id !== note.id);
    renderNotes();
    setMessage(elements.notesStatus, "Transcript deleted.");
  }

  function stopTimer(run) {
    if (run.timer !== null) window.clearInterval(run.timer);
    run.timer = null;
  }

  function setRecordingUi(isRecording) {
    elements.recordButton.classList.toggle("is-recording", isRecording);
    elements.recordButton.innerHTML = isRecording
      ? "<span aria-hidden=\"true\">■</span> Stop &amp; save transcript"
      : "<span aria-hidden=\"true\">●</span> Start recording";
    elements.recordButton.setAttribute("aria-pressed", String(isRecording));
    elements.recordingIndicator.hidden = !isRecording;
  }

  function cancelRecording() {
    const run = recordingRun;
    if (!run) return;
    run.discard = true;
    stopTimer(run);
    recordingRun = null;
    setRecordingUi(false);
    elements.recordButton.disabled = false;
    elements.timer.textContent = "00:00";
    elements.livePreview.hidden = true;
    run.recognition.abort();
  }

  function updateLivePreview(run, interimTranscript = "") {
    const text = [run.transcript.trim(), interimTranscript.trim()].filter(Boolean).join(" ");
    elements.livePreview.textContent = text || "Listening for speech…";
  }

  async function saveTranscript(run) {
    if (run.discard || !isCurrentUser(run.userId)) return;
    const transcript = run.transcript.trim();
    if (!transcript) {
      setMessage(elements.recordingFeedback, "No speech was captured. Check microphone access and try again.", true);
      return;
    }
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      setMessage(elements.recordingFeedback, "This transcript is too long to save. Try recording a shorter section.", true);
      return;
    }

    elements.recordButton.disabled = true;
    setMessage(elements.recordingFeedback, "Saving your private transcript…");
    try {
      const { data: note, error } = await supabase
        .from("lecture_notes")
        .insert({
          user_id: run.userId,
          title: run.title,
          recorded_on: run.recordedOn,
          duration_seconds: Math.max(1, Math.min(MAX_RECORDING_SECONDS, run.durationSeconds)),
          transcript,
        })
        .select("id, title, recorded_on, duration_seconds, transcript, created_at")
        .single();
      if (!isCurrentUser(run.userId)) return;
      if (error || !note) {
        throw new Error("Could not save your transcript. Please check your connection and try again.");
      }
      notes = [note, ...notes.filter((entry) => entry.id !== note.id)]
        .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
      hasMoreNotes = notes.length > NOTE_PAGE_SIZE;
      notes = notes.slice(0, NOTE_PAGE_SIZE);
      renderNotes();
      setMessage(elements.recordingFeedback, "Transcript saved to your private lecture notes.");
    } catch (error) {
      if (isCurrentUser(run.userId)) {
        setMessage(
          elements.recordingFeedback,
          error instanceof Error ? error.message : "Could not save your transcript. Please try again.",
          true,
        );
      }
    } finally {
      if (isCurrentUser(run.userId)) elements.recordButton.disabled = false;
    }
  }

  function finishRecording(run) {
    if (run.stopping || run.discard) return;
    run.stopping = true;
    run.durationSeconds = Math.max(1, Math.floor((Date.now() - run.startedAt) / 1000));
    stopTimer(run);
    elements.recordButton.disabled = true;
    setMessage(elements.recordingFeedback, "Finishing your transcript…");
    run.recognition.stop();
  }

  function startRecording() {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    const userId = getCurrentUserId();
    if (!userId || !supabase) {
      setMessage(elements.recordingFeedback, "Sign in before recording a lecture.", true);
      return;
    }
    if (!elements.recordForm.reportValidity()) return;
    if (!SpeechRecognition) {
      setMessage(elements.recordingFeedback, "This browser does not support built-in speech recognition. Try a current version of Chrome or Safari.", true);
      return;
    }
    if (!window.isSecureContext) {
      setMessage(elements.recordingFeedback, "Microphone access requires a secure HTTPS connection.", true);
      return;
    }
    if (!navigator.onLine) {
      setMessage(elements.recordingFeedback, "Connect to the internet before starting browser speech recognition.", true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-GB";

    const run = {
      userId,
      title: elements.title.value.trim(),
      recordedOn: elements.date.value,
      startedAt: Date.now(),
      durationSeconds: 0,
      recognition,
      transcript: "",
      timer: null,
      stopping: false,
      discard: false,
      error: "",
    };
    recordingRun = run;

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const phrase = result[0]?.transcript?.trim();
        if (!phrase) continue;
        if (result.isFinal) {
          run.transcript = `${run.transcript} ${phrase}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${phrase}`.trim();
        }
      }
      updateLivePreview(run, interimTranscript);
      if (run.transcript.length > MAX_TRANSCRIPT_LENGTH) {
        run.error = "This transcript is too long to save. Stop recording and try a shorter section.";
        finishRecording(run);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" && run.stopping) return;
      run.error = speechErrorMessage(event.error);
    };

    recognition.onend = () => {
      stopTimer(run);
      if (run.discard || !isCurrentUser(run.userId)) return;
      if (recordingRun === run) recordingRun = null;
      setRecordingUi(false);
      elements.recordButton.disabled = false;
      elements.livePreview.hidden = true;
      run.durationSeconds = Math.max(1, Math.floor((Date.now() - run.startedAt) / 1000));

      if (run.error) {
        setMessage(elements.recordingFeedback, run.error, true);
        return;
      }
      void saveTranscript(run);
    };

    try {
      elements.livePreview.hidden = false;
      updateLivePreview(run);
      elements.timer.textContent = "00:00";
      elements.recordButton.disabled = true;
      setRecordingUi(true);
      setMessage(elements.recordingFeedback, "Starting your browser’s speech recognition…");
      recognition.start();
      elements.recordButton.disabled = false;
      setMessage(elements.recordingFeedback, "Recording and transcribing in your browser. Stop when you’re ready to save.");
      run.timer = window.setInterval(() => {
        run.durationSeconds = Math.floor((Date.now() - run.startedAt) / 1000);
        elements.timer.textContent = formatDuration(run.durationSeconds);
        if (run.durationSeconds >= MAX_RECORDING_SECONDS) {
          setMessage(elements.recordingFeedback, "The three-hour recording limit was reached; saving your transcript.");
          finishRecording(run);
        }
      }, 1000);
    } catch (error) {
      recordingRun = null;
      setRecordingUi(false);
      elements.recordButton.disabled = false;
      elements.livePreview.hidden = true;
      const message = error instanceof Error && error.name === "NotAllowedError"
        ? "Microphone access was denied. Allow access in your browser settings and try again."
        : error instanceof Error
          ? error.message
          : "Could not start speech recognition. Please try again.";
      setMessage(elements.recordingFeedback, message, true);
    }
  }

  elements.recordButton.addEventListener("click", () => {
    if (recordingRun) {
      finishRecording(recordingRun);
    } else {
      startRecording();
    }
  });
  window.addEventListener("hashchange", () => {
    if (window.location.hash !== "#lecture-notes" && recordingRun) {
      cancelRecording();
      setMessage(elements.recordingFeedback, "Recording stopped because you left Lecture notes. No transcript was saved.");
    }
  });

  async function load(userId) {
    if (!supabase || !userId) return;
    activeUserId = userId;
    if (!notes.length) elements.notesEmpty.hidden = true;
    setMessage(elements.notesStatus, "Loading your private transcripts…");
    const { data, error } = await supabase
      .from("lecture_notes")
      .select("id, title, recorded_on, duration_seconds, transcript, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(0, NOTE_PAGE_SIZE - 1);
    if (!isCurrentUser(userId)) return;
    if (error) {
      setMessage(elements.notesStatus, "Could not load lecture notes. Please refresh and try again.", true);
      return;
    }
    notes = data ?? [];
    hasMoreNotes = notes.length === NOTE_PAGE_SIZE;
    renderNotes();
    setMessage(elements.notesStatus, "");
  }

  async function loadMoreNotes() {
    const userId = activeUserId;
    if (!userId || !isCurrentUser(userId) || !hasMoreNotes) return;
    elements.loadMore.disabled = true;
    setMessage(elements.notesStatus, "Loading older transcripts…");
    const { data, error } = await supabase
      .from("lecture_notes")
      .select("id, title, recorded_on, duration_seconds, transcript, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(notes.length, notes.length + NOTE_PAGE_SIZE - 1);
    if (!isCurrentUser(userId)) {
      elements.loadMore.disabled = false;
      return;
    }
    elements.loadMore.disabled = false;
    if (error) {
      setMessage(elements.notesStatus, "Could not load older notes. Please try again.", true);
      return;
    }
    notes = [...notes, ...(data ?? []).filter((entry) => !notes.some((note) => note.id === entry.id))];
    hasMoreNotes = (data ?? []).length === NOTE_PAGE_SIZE;
    renderNotes();
    setMessage(elements.notesStatus, "");
  }

  elements.loadMore.addEventListener("click", () => {
    void loadMoreNotes();
  });

  function reset() {
    cancelRecording();
    activeUserId = null;
    notes = [];
    hasMoreNotes = false;
    elements.recordForm.reset();
    elements.date.value = localDateString();
    elements.date.max = localDateString();
    elements.recordButton.disabled = false;
    elements.loadMore.disabled = false;
    elements.timer.textContent = "00:00";
    elements.livePreview.hidden = true;
    setRecordingUi(false);
    setMessage(elements.recordingFeedback, "");
    setMessage(elements.notesStatus, "");
    renderNotes();
  }

  return {
    load,
    refresh: () => (activeUserId ? load(activeUserId) : Promise.resolve()),
    reset,
  };
}
