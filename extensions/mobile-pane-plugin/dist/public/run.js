// Run panel: pick a Flutter or Android project folder, choose a variant or preset, build and run it on
// the device selected in the pane, and watch the build output. The server runs the job; this is the view.
// State comes from POST /run/* and GET /run/state?since=<seq> (polled like the Devices panel).

const ACTIVE_PHASES = new Set(["building", "launching", "running", "stopping"]);
const END_PHASES = new Set(["stopped", "failed"]);

const text = (value) => String(value ?? "");
const errorText = (error) => String(error?.message ?? error);

async function getJson(path) {
  const response = await fetch(path);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? response.statusText);
  return data;
}

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? response.statusText);
  return data;
}

const splitArgs = (value) => (text(value).trim() ? text(value).trim().split(/\s+/) : []);
const joinArgs = (args) => (Array.isArray(args) ? args.join(" ") : "");

export function initRun({ getTarget }) {
  const $ = (id) => document.getElementById(id);
  const panel = $("runPanel");
  const toggle = $("runToggle");

  if (!panel || !toggle) return;

  // ---- state -------------------------------------------------------------------
  let project = null; // Project from POST /run/variants
  let variants = null; // Variants shape from POST /run/variants
  let recents = [];
  let suggestedPath = null;
  let recentsLoaded = false;

  let job = null; // Run state's job
  let lastJobId = null;
  let since = 0;
  let pollTimer = null;
  let pollInFlight = false;
  let openToken = 0;
  let opening = false;
  const refreshedInstallJobs = new Set(); // install jobs whose project has been re-read

  const isActive = (j) => Boolean(j) && ACTIVE_PHASES.has(j.phase);
  const androidTarget = () => {
    const target = getTarget?.() ?? null;
    return target?.kind === "android" ? target : null;
  };
  const pinnedMissing = () => Boolean(project?.flutterSdk?.pinned && !project.flutterSdk.installed);

  // ---- skeleton ----------------------------------------------------------------
  panel.setAttribute("aria-label", "Run a project");

  const pathInput = document.createElement("input");
  pathInput.id = "runPath";
  pathInput.setAttribute("list", "runRecents");
  pathInput.placeholder = "Project folder, e.g. ~/code/my_app";
  pathInput.setAttribute("aria-label", "Project folder");
  pathInput.autocomplete = "off";
  pathInput.spellcheck = false;

  const datalist = document.createElement("datalist");
  datalist.id = "runRecents";

  const openButton = Object.assign(document.createElement("button"), { id: "runOpen", textContent: "Open", title: "Read this project's variants" });
  const refreshButton = Object.assign(document.createElement("button"), {
    id: "runRefresh", textContent: "↻", title: "Read the variants again", hidden: true, "aria-label": "Refresh variants",
  });

  const projectLabel = Object.assign(document.createElement("span"), { id: "runProject", className: "meta", hidden: true });
  const projectInfo = document.createElement("span");
  projectInfo.className = "projectInfo";
  projectInfo.append(projectLabel, refreshButton);

  const pathRow = document.createElement("div");
  pathRow.className = "row";
  pathRow.append(pathInput, datalist, openButton, projectInfo);

  const note = Object.assign(document.createElement("p"), { id: "runNote", className: "meta", role: "status", hidden: true });
  const error = Object.assign(document.createElement("p"), { id: "runError", className: "error", role: "alert", hidden: true });

  const options = document.createElement("div");
  options.id = "runOptions";
  options.className = "row";

  const runButton = Object.assign(document.createElement("button"), { id: "runRun", textContent: "Run" });
  const stopButton = Object.assign(document.createElement("button"), { id: "runStop", textContent: "Stop" });
  const reloadButton = Object.assign(document.createElement("button"), { id: "runReload", textContent: "Hot reload", hidden: true });
  const restartButton = Object.assign(document.createElement("button"), { id: "runRestart", textContent: "Hot restart", hidden: true });
  const installNote = Object.assign(document.createElement("span"), { id: "runInstallNote", className: "meta", hidden: true });
  const installButton = Object.assign(document.createElement("button"), { id: "runInstall", hidden: true });
  const phase = Object.assign(document.createElement("span"), { id: "runPhase", className: "phase" });
  const device = Object.assign(document.createElement("span"), { id: "runDevice", className: "meta" });
  const clearButton = Object.assign(document.createElement("button"), { id: "runClear", textContent: "Clear", title: "Clear the log view (the server keeps it)" });

  const actions = document.createElement("div");
  actions.className = "row";
  actions.append(runButton, stopButton, reloadButton, restartButton, installNote, installButton, phase, device, clearButton);

  const log = Object.assign(document.createElement("pre"), { id: "runLog" });
  log.setAttribute("aria-label", "Run output");
  log.setAttribute("tabindex", "0");

  panel.replaceChildren(pathRow, note, error, options, actions, log);

  // ---- helpers -----------------------------------------------------------------
  let noteText = "";
  function setNote(message) {
    noteText = message ?? "";
    note.textContent = noteText;
    note.hidden = !noteText;
  }
  function showError(message) {
    error.textContent = text(message);
    error.hidden = false;
  }
  function clearError() {
    error.textContent = "";
    error.hidden = true;
  }
  function setOpening(value) {
    opening = value;
    openButton.disabled = value;
    openButton.textContent = value ? "Reading…" : "Open";
    refreshButton.disabled = value;
    renderControls();
  }

  function renderRecents() {
    const items = [];
    const seen = new Set();
    if (suggestedPath && !recents.some((entry) => entry.path === suggestedPath)) {
      items.push(new Option(`${suggestedPath} (this workspace)`, suggestedPath));
      seen.add(suggestedPath);
    }
    for (const entry of recents) {
      if (seen.has(entry.path)) continue;
      seen.add(entry.path);
      const type = entry.type === "flutter" ? "Flutter" : entry.type === "gradle" ? "Android" : "";
      items.push(new Option(type ? `${entry.name} · ${type}` : entry.name, entry.path));
    }
    datalist.replaceChildren(...items);
  }

  async function loadRecents() {
    try {
      const data = await getJson("/run/projects");
      recents = Array.isArray(data.recents) ? data.recents : [];
      suggestedPath = typeof data.suggested === "string" ? data.suggested : null;
      recentsLoaded = true;
      renderRecents();
    } catch (cause) {
      if (!recentsLoaded && !panel.hidden) showError(errorText(cause));
    }
  }

  function deviceLabel(serial) {
    const target = getTarget?.() ?? null;
    if (target && (!serial || target.id === serial)) return target.label;
    return serial || "this device";
  }

  // ---- selection ---------------------------------------------------------------
  function recentLast() {
    const entry = recents.find((item) => item.path === project?.path);
    return entry?.last && typeof entry.last === "object" ? entry.last : null;
  }

  function gradleSelection() {
    const select = $("runVariant");
    return { installTask: select?.value ?? null };
  }

  function flutterSelection() {
    const flavor = $("runFlavor");
    const mode = $("runMode");
    const target = $("runTarget");
    const args = $("runArgs");
    return {
      flavor: variants?.flavors?.length ? (flavor?.value ?? null) : null,
      mode: mode?.value ?? "debug",
      target: target?.value || null,
      args: splitArgs(args?.value),
    };
  }

  function renderGradle(preferred) {
    const list = Array.isArray(variants?.variants) ? variants.variants : [];
    if (!list.length) {
      options.append(Object.assign(document.createElement("span"), { className: "meta", textContent: "No installable variants." }));
      return;
    }
    const modules = new Set(list.map((variant) => variant.module).filter(Boolean));
    const prefixModule = modules.size > 1;

    const select = Object.assign(document.createElement("select"), {
      id: "runVariant", "aria-label": "Variant", className: "grow",
    });
    for (const variant of list) {
      const module = prefixModule && variant.module ? `${variant.module.replace(/^:/, "")} · ` : "";
      select.append(new Option(`${module}${variant.name} · ${variant.applicationId}`, variant.installTask));
    }
    const last = recentLast();
    const wanted = preferred?.installTask ?? last?.installTask ?? null;
    select.value = list.some((variant) => variant.installTask === wanted) ? wanted : list[0].installTask;
    options.append(select);
  }

  function renderFlutter(preferred) {
    const flavors = Array.isArray(variants?.flavors) ? variants.flavors : [];
    const modes = Array.isArray(variants?.modes) && variants.modes.length ? variants.modes : ["debug", "profile", "release"];
    const targets = Array.isArray(variants?.targets) ? variants.targets : [];
    const presets = Array.isArray(variants?.presets) ? variants.presets : [];
    const last = recentLast();
    const selected = preferred ?? (last && (last.mode !== undefined || last.flavor !== undefined) ? last : null);

    const presetSelect = Object.assign(document.createElement("select"), { id: "runPreset", "aria-label": "Preset" });
    presetSelect.append(new Option("Custom", ""));
    presets.forEach((preset, index) => presetSelect.append(new Option(preset.name, String(index))));

    const flavorSelect = Object.assign(document.createElement("select"), { id: "runFlavor", "aria-label": "Flavor" });
    for (const flavor of flavors) flavorSelect.append(new Option(flavor, flavor));
    flavorSelect.hidden = !flavors.length;

    const modeSelect = Object.assign(document.createElement("select"), { id: "runMode", "aria-label": "Mode" });
    for (const mode of modes) modeSelect.append(new Option(mode, mode));

    const targetSelect = Object.assign(document.createElement("select"), { id: "runTarget", "aria-label": "Entry point" });
    targetSelect.append(new Option("Default (lib/main.dart)", ""));
    for (const entry of targets) targetSelect.append(new Option(entry, entry));

    const argsInput = Object.assign(document.createElement("input"), {
      id: "runArgs", placeholder: "--dart-define=KEY=value", "aria-label": "Extra Flutter arguments", spellcheck: false,
    });

    const fill = (selection) => {
      if (flavors.length) {
        const flavor = flavors.includes(selection?.flavor) ? selection.flavor : flavors[0];
        flavorSelect.value = flavor;
      }
      modeSelect.value = modes.includes(selection?.mode) ? selection.mode : (modes.includes("debug") ? "debug" : modes[0]);
      targetSelect.value = targets.includes(selection?.target) ? selection.target : "";
      argsInput.value = joinArgs(selection?.args);
    };

    if (selected) {
      fill(selected);
      // A remembered selection that is exactly a preset shows as that preset, not "Custom".
      const match = presets.findIndex((preset) =>
        (preset.flavor ?? null) === (flavorSelect.value || null) &&
        preset.mode === modeSelect.value &&
        (preset.target ?? null) === (targetSelect.value || null) &&
        JSON.stringify(preset.args ?? []) === JSON.stringify(splitArgs(argsInput.value)));
      if (match >= 0) presetSelect.value = String(match);
    } else if (presets.length) {
      presetSelect.value = "0";
      fill(presets[0]);
    } else {
      fill({ flavor: flavors[0] ?? null, mode: "debug", target: null, args: [] });
    }

    // A preset fills the other fields; touching any field turns the preset back into "Custom".
    presetSelect.addEventListener("change", () => {
      const preset = presets[Number(presetSelect.value)];
      if (!preset) return;
      fill(preset);
    });
    for (const field of [flavorSelect, modeSelect, targetSelect, argsInput]) {
      field.addEventListener("change", () => {
        presetSelect.value = "";
      });
      field.addEventListener("input", () => {
        presetSelect.value = "";
      });
    }

    const order = [presetSelect, flavorSelect, modeSelect, targetSelect, argsInput];
    options.append(...order.filter((field) => !field.hidden));
  }

  function renderOptions(preferred = null) {
    options.replaceChildren();
    if (!project || !variants) return;
    if (project.type === "gradle") renderGradle(preferred?.gradle);
    else renderFlutter(preferred?.flutter);
  }

  function renderProject() {
    projectInfo.hidden = !project;
    projectLabel.hidden = !project;
    refreshButton.hidden = !project;
    const type = project?.type === "flutter" ? "Flutter" : "Android (Gradle)";
    const sdk = project?.type === "flutter" && project.flutterSdk?.pinned ? ` ${project.flutterSdk.pinned}` : "";
    projectLabel.textContent = project ? `${project.name} · ${type}${sdk}` : "";
    projectLabel.title = project?.path ?? "";
    renderControls();
  }

  // ---- run controls ------------------------------------------------------------
  // A flex drawer with only max-height stays content-sized; give the log real room once there is
  // output (or a job starting up), and keep the empty picker compact.
  function syncHeight() {
    panel.classList.toggle("tall", isActive(job) || log.childElementCount > 0);
  }

  function renderControls() {
    syncHeight();
    const target = getTarget?.() ?? null;
    const android = target?.kind === "android";
    const missing = pinnedMissing();

    let title = "";
    if (!project) title = "Open a project folder first";
    else if (!android) title = "Run works on Android phones and emulators";
    else if (missing) title = `Flutter ${project.flutterSdk.pinned} is not installed`;
    else if (opening) title = "Reading variants…";
    runButton.disabled = Boolean(title);
    runButton.title = title || "Build and run on this device";
    runButton.textContent = isActive(job) && job.kind !== "install" ? "Run again" : "Run";

    stopButton.disabled = !isActive(job);

    const flutter = project?.type === "flutter" || job?.kind === "flutter";
    reloadButton.hidden = !flutter;
    restartButton.hidden = !flutter;
    reloadButton.disabled = !job?.canReload;
    restartButton.disabled = !job?.canReload;

    installNote.hidden = !missing;
    installButton.hidden = !missing;
    if (missing) {
      installNote.textContent = `Flutter ${project.flutterSdk.pinned} is not installed.`;
      installButton.textContent = `Install Flutter ${project.flutterSdk.pinned}`;
      installButton.disabled = isActive(job);
    }

    phase.textContent = job ? (job.error ? `${job.phase} · ${job.error}` : job.phase) : project ? "Ready" : "";
    device.textContent = job?.kind === "install" ? "on this Mac" : job ? `on ${deviceLabel(job.serial)}` : target ? `on ${target.label}` : "";
  }

  // ---- log ---------------------------------------------------------------------
  function clearLogView() {
    log.replaceChildren();
    syncHeight();
  }

  function appendLines(lines) {
    if (!Array.isArray(lines) || !lines.length) return;
    const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 4;
    for (const line of lines) {
      const row = document.createElement("span");
      if (line.stream === "err") row.className = "err";
      else if (line.stream === "info") row.className = "info";
      row.textContent = `${text(line.text)}\n`;
      log.append(row);
    }
    while (log.childElementCount > 5000) log.firstElementChild.remove();
    syncHeight();
    if (atBottom) log.scrollTop = log.scrollHeight;
  }

  // ---- polling -----------------------------------------------------------------
  function wantsPoll() {
    return !panel.hidden || isActive(job);
  }

  function startPolling() {
    if (pollTimer || pollInFlight) return;
    pollTimer = setTimeout(tick, 0);
  }

  function stopPolling() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
  }

  async function tick() {
    pollTimer = null;
    try {
      await poll();
    } catch (cause) {
      if (!panel.hidden) showError(errorText(cause));
    }
    if (wantsPoll()) pollTimer = setTimeout(tick, 500);
  }

  async function poll() {
    if (pollInFlight) return;
    pollInFlight = true;
    try {
      let state = await getJson(`/run/state?since=${since}`);
      const id = state.job?.id ?? null;
      if (id !== lastJobId) {
        lastJobId = id;
        if (id !== null) {
          // A new job: show its log from the start, not just what arrived after this poll.
          clearLogView();
          since = 0;
          state = await getJson("/run/state?since=0");
        }
      }
      appendLines(state.lines);
      // `since` is the last sequence number shown. Advancing by what was actually received is safe
      // whether the server's `next` is the last seq or the next one to assign.
      const received = Array.isArray(state.lines) ? state.lines : [];
      if (received.length) since = Math.max(since, ...received.map((line) => Number(line.seq) || 0));
      applyJob(state.job ?? null);
    } finally {
      pollInFlight = false;
    }
  }

  function applyJob(next) {
    job = next;
    if (next?.kind === "install" && END_PHASES.has(next.phase) && !refreshedInstallJobs.has(next.id)) {
      refreshedInstallJobs.add(next.id);
      refreshProject();
    }
    renderControls();
  }

  // ---- project open / refresh --------------------------------------------------
  async function openProject(value, { refresh = false, silent = false, preferred = null } = {}) {
    const path = text(value).trim();
    if (!path) return showError("Type a project folder first.");
    const token = ++openToken;
    clearError();
    if (!silent) {
      setNote(refresh && project?.type === "flutter"
        ? "Refreshing variants…"
        : "Reading variants with Gradle… the first time can take a minute");
      setOpening(true);
    }
    try {
      const data = await postJson("/run/variants", refresh ? { path, refresh: true } : { path });
      if (token !== openToken) return;
      const previousPath = project?.path ?? null;
      project = data.project ?? null;
      variants = data.variants ?? null;
      // Another project's build output would be misleading under this one; keep the server buffer.
      if (previousPath && project?.path !== previousPath) clearLogView();
      renderProject();
      renderOptions(preferred);
      if (!silent) loadRecents();
    } catch (cause) {
      if (token !== openToken) return;
      showError(errorText(cause)); // keep a project and a running job already on screen
    } finally {
      if (token === openToken) {
        setOpening(false);
        setNote("");
      }
    }
  }

  async function refreshProject() {
    if (!project) return;
    const preferred = project.type === "gradle"
      ? { gradle: gradleSelection() }
      : { flutter: flutterSelection() };
    await openProject(project.path, { silent: true, preferred });
  }

  // ---- actions -----------------------------------------------------------------
  async function startRun() {
    const target = androidTarget();
    if (!project) return showError("Open a project folder first.");
    if (!target) return showError("Run works on Android phones and emulators.");
    if (pinnedMissing()) return showError(`Flutter ${project.flutterSdk.pinned} is not installed.`);
    clearError();
    runButton.disabled = true;
    try {
      const body = {
        path: project.path,
        serial: target.id,
        ...(project.type === "gradle" ? { gradle: gradleSelection() } : { flutter: flutterSelection() }),
      };
      const data = await postJson("/run/start", body);
      if (data?.job) {
        job = data.job;
        lastJobId = data.job.id;
        since = 0;
        clearLogView();
      }
      renderControls();
      startPolling();
    } catch (cause) {
      showError(errorText(cause));
    } finally {
      renderControls();
    }
  }

  async function stopRun() {
    clearError();
    stopButton.disabled = true;
    try {
      await postJson("/run/stop", {});
      startPolling();
    } catch (cause) {
      showError(errorText(cause));
    } finally {
      renderControls();
    }
  }

  async function reloadRun(full) {
    clearError();
    try {
      await postJson("/run/reload", { full });
      startPolling();
    } catch (cause) {
      showError(errorText(cause));
    }
    renderControls();
  }

  async function installFlutter() {
    const version = project?.flutterSdk?.pinned;
    if (!version) return;
    clearError();
    installButton.disabled = true;
    try {
      await postJson("/run/install-flutter", { version, path: project.path });
      startPolling();
    } catch (cause) {
      showError(errorText(cause));
    }
    renderControls();
  }

  // ---- toggle & wiring ---------------------------------------------------------
  function setOpen(value, { persist = true } = {}) {
    panel.hidden = !value;
    toggle.setAttribute("aria-expanded", String(value));
    if (persist) {
      try { localStorage.setItem("mobile-pane.run", value ? "open" : "closed"); } catch {}
    }
    if (value) {
      renderControls();
      startPolling();
      if (!recentsLoaded) loadRecents();
    } else if (!isActive(job)) {
      stopPolling();
    }
  }

  let open = false;
  try { open = localStorage.getItem("mobile-pane.run") === "open"; } catch {}

  toggle.addEventListener("click", () => setOpen(panel.hidden));
  openButton.addEventListener("click", () => openProject(pathInput.value));
  refreshButton.addEventListener("click", () => openProject(project?.path ?? pathInput.value, { refresh: true }));
  pathInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      openProject(pathInput.value);
    }
  });
  runButton.addEventListener("click", startRun);
  stopButton.addEventListener("click", stopRun);
  reloadButton.addEventListener("click", () => reloadRun(false));
  restartButton.addEventListener("click", () => reloadRun(true));
  installButton.addEventListener("click", installFlutter);
  clearButton.addEventListener("click", clearLogView);

  // A project typed into the field (or picked from the datalist) still needs Open.
  setOpen(open, { persist: false });
  renderProject();
  renderControls();
  startPolling(); // read the current job once, even while the drawer is closed
}
