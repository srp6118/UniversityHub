const AUDIO_BUCKET = "lecture-audio-temp";
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_RECORDING_SECONDS = 3 * 60 * 60;
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

async function functionErrorMessage(error) {
  const response = error?.context;
  if (response instanceof Response) {
    try {
      const body = await response.clone().json();
      if (typeof body?.error === "string" && body.error.trim()) return body.error;
    } catch {
      // Use the function client's message when the response is not JSON.
    }
  }
  return error?.message || "The lecture could not be transcribed. Please try again.";
}

function audioExtension(contentType) {
  if (contentType.includes("mp4")) return "m4a";
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("aac")) return "aac";
  return "webm";
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

  function stopRunResources(run) {
    stopRunTimer(run);
    for (const track of run.stream.getTracks()) track.stop();
  }

  function stopRunTimer(run) {
    if (run.timer !== null) window.clearInterval(run.timer);
    run.timer = null;
  }

  function setRecordingUi(isRecording) {
    elements.recordButton.classList.toggle("is-recording", isRecording);
    elements.recordButton.innerHTML = isRecording
      ? "<span aria-hidden=\"true\">■</span> Stop &amp; transcribe"
      : "<span aria-hidden=\"true\">●</span> Start recording";
    elements.recordButton.setAttribute("aria-pressed", String(isRecording));
    elements.recordingIndicator.hidden = !isRecording;
  }

  function cancelRecording() {
    const run = recordingRun;
    if (!run) return;
    run.discard = true;
    stopRunTimer(run);
    if (run.recorder.state !== "inactive") {
      run.recorder.stop();
    } else {
      stopRunResources(run);
    }
    recordingRun = null;
    elements.recordButton.disabled = false;
    elements.timer.textContent = "00:00";
    setRecordingUi(false);
  }

  async function uploadAndTranscribe(run, audio, contentType) {
    const storagePath = `${run.userId}/${crypto.randomUUID()}.${audioExtension(contentType)}`;
    const { error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(storagePath, audio, {
        cacheControl: "0",
        contentType,
        upsert: false,
      });
    if (uploadError) {
      throw new Error("Could not upload the temporary recording. Check your connection and try again.");
    }

    let responseData;
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-lecture", {
        body: {
          storagePath,
          title: run.title,
          recordedOn: run.recordedOn,
          durationSeconds: run.durationSeconds,
        },
      });
      if (error) throw new Error(await functionErrorMessage(error));
      responseData = data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The lecture could not be transcribed.";
      const { error: cleanupError } = await supabase.storage.from(AUDIO_BUCKET).remove([storagePath]);
      if (cleanupError) {
        throw new Error(`${message} The temporary recording could not be removed automatically; please contact support.`);
      }
      throw new Error(message);
    }

    if (!responseData?.note || typeof responseData.note.transcript !== "string") {
      throw new Error("The transcription service returned an invalid response. Please try again.");
    }
    return responseData.note;
  }

  function finishRecording(run) {
    if (run.recorder.state === "inactive") return;
    run.durationSeconds = Math.max(1, Math.floor((Date.now() - run.startedAt) / 1000));
    elements.recordButton.disabled = true;
    stopRunTimer(run);
    run.recorder.stop();
  }

  async function handleRecordingStopped(run) {
    stopRunResources(run);
    if (run.discard) return;
    if (recordingRun === run) recordingRun = null;
    setRecordingUi(false);
    elements.recordButton.disabled = false;

    if (run.recordingError) {
      setMessage(elements.recordingFeedback, run.recordingError, true);
      return;
    }
    if (run.overLimit) {
      setMessage(elements.recordingFeedback, "This recording reached the 20 MB limit. Try a shorter lecture.", true);
      return;
    }

    const contentType = (run.recorder.mimeType || run.chunks[0]?.type || "audio/webm").split(";")[0];
    const audio = new Blob(run.chunks, { type: contentType });
    if (!audio.size) {
      setMessage(elements.recordingFeedback, "No audio was captured. Check microphone access and try again.", true);
      return;
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      setMessage(elements.recordingFeedback, "This recording is over the 20 MB limit. Try a shorter lecture.", true);
      return;
    }

    const userId = run.userId;
    elements.recordButton.disabled = true;
    setMessage(elements.recordingFeedback, "Uploading securely and transcribing with OpenAI…");
    try {
      const note = await uploadAndTranscribe(run, audio, contentType);
      if (!isCurrentUser(userId)) return;
      notes = [note, ...notes.filter((entry) => entry.id !== note.id)]
        .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
      renderNotes();
      setMessage(elements.recordingFeedback, "Transcript saved to your private lecture notes.");
    } catch (error) {
      if (isCurrentUser(userId)) {
        setMessage(
          elements.recordingFeedback,
          error instanceof Error ? error.message : "The lecture could not be transcribed. Please try again.",
          true,
        );
      }
    } finally {
      elements.recordButton.disabled = false;
    }
  }

  async function startRecording() {
    const userId = getCurrentUserId();
    if (!userId || !supabase) {
      setMessage(elements.recordingFeedback, "Sign in before recording a lecture.", true);
      return;
    }
    if (!elements.recordForm.reportValidity()) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage(elements.recordingFeedback, "This browser does not support microphone recording. Try a recent version of Safari, Chrome, or Firefox.", true);
      return;
    }

    elements.recordButton.disabled = true;
    setMessage(elements.recordingFeedback, "Requesting microphone access…");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
      });
      if (!isCurrentUser(userId)) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }

      setMessage(elements.recordingFeedback, "Checking your OpenAI connection…");
      const { data: providerStatus, error: providerStatusError } = await supabase.functions.invoke(
        "assistant-provider",
        { body: { action: "status", provider: "openai" } },
      );
      if (providerStatusError) {
        throw new Error(await functionErrorMessage(providerStatusError));
      }
      if (!isCurrentUser(userId)) {
        for (const track of stream.getTracks()) track.stop();
        elements.recordButton.disabled = false;
        return;
      }
      if (!providerStatus?.providers?.openai) {
        for (const track of stream.getTracks()) track.stop();
        stream = undefined;
        elements.recordButton.disabled = false;
        setMessage(elements.recordingFeedback, "Connect an OpenAI API key in Connections before recording.", true);
        return;
      }

      const preferredTypes = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const run = {
        userId,
        title: elements.title.value.trim(),
        recordedOn: elements.date.value,
        startedAt: Date.now(),
        durationSeconds: 0,
        recorder,
        stream,
        chunks: [],
        totalBytes: 0,
        timer: null,
        discard: false,
        overLimit: false,
        recordingError: "",
      };
      recordingRun = run;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) {
          run.chunks.push(event.data);
          run.totalBytes += event.data.size;
        }
        if (run.totalBytes > MAX_AUDIO_BYTES) {
          run.overLimit = true;
          if (recorder.state === "recording") recorder.stop();
        }
      });
      recorder.addEventListener("error", () => {
        run.recordingError = "Recording stopped unexpectedly. Check your microphone and try again.";
      });
      recorder.addEventListener("stop", () => {
        void handleRecordingStopped(run);
      }, { once: true });

      recorder.start(1000);
      elements.recordButton.disabled = false;
      elements.timer.textContent = "00:00";
      setRecordingUi(true);
      setMessage(elements.recordingFeedback, "Recording on this device. Stop when you’re ready to transcribe.");
      run.timer = window.setInterval(() => {
        run.durationSeconds = Math.floor((Date.now() - run.startedAt) / 1000);
        elements.timer.textContent = formatDuration(run.durationSeconds);
        if (run.durationSeconds >= MAX_RECORDING_SECONDS && recorder.state === "recording") {
          setMessage(elements.recordingFeedback, "The three-hour recording limit was reached; transcribing now.");
          void finishRecording(run);
        }
      }, 1000);
    } catch (error) {
      const failedRun = recordingRun?.stream === stream ? recordingRun : null;
      if (failedRun) {
        failedRun.discard = true;
        stopRunTimer(failedRun);
        if (failedRun.recorder.state !== "inactive") {
          failedRun.recorder.stop();
        } else {
          stopRunResources(failedRun);
        }
        recordingRun = null;
      } else if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
      if (!isCurrentUser(userId)) return;
      elements.recordButton.disabled = false;
      const message = error instanceof Error && error.name === "NotAllowedError"
        ? "Microphone access was denied. Allow microphone access in your browser settings and try again."
        : error instanceof Error && error.name === "NotFoundError"
          ? "No microphone was found on this device."
          : error instanceof Error
            ? error.message
            : "Could not start recording. Please try again.";
      setMessage(elements.recordingFeedback, message, true);
    }
  }

  elements.recordButton.addEventListener("click", () => {
    if (recordingRun) {
      void finishRecording(recordingRun);
    } else {
      void startRecording();
    }
  });
  window.addEventListener("hashchange", () => {
    if (window.location.hash !== "#lecture-notes" && recordingRun) {
      cancelRecording();
      setMessage(elements.recordingFeedback, "Recording stopped because you left Lecture notes. No audio was saved.");
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
