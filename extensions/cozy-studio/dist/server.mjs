// Cozy Studio's sidebar server. Ghostex starts it while the extension is on and gives it
// GHOSTEX_API_URL and GHOSTEX_API_TOKEN, which reach the extension API (/api/ext/v1) for this
// extension only. It reads a running Cozy Studio (https://github.com/gvastethecreator/cozy-studio)
// on this computer and draws what it is doing in the panel. It never changes Studio's jobs,
// settings or Library; on request it runs Studio's own update, on Windows the panel also starts,
// restarts and stops Studio, and with Keep Studio running on it starts Studio again when Studio
// goes down.
//
// Load on Studio stays light. With a Studio that has the jobs summary (after 0.2.0):
// - studio_jobs with summary: true (about 2 KB) at start, a few seconds after a job changes state,
//   after a reconnect and every 10 minutes. Studio's agent event stream says when jobs change.
// - studio_status (ChatGPT usage, unorganized images, version) at start, every 10 minutes, after a
//   sign-in change and on Refresh.
// Studio 0.2.0 and older lack the summary, so the server falls back to one full jobs snapshot
// (studio_jobs, about 200 KB) at start and every 10 minutes, applies Studio's UI event stream to
// it, and reads provider readiness every 5 minutes and studio_status every 30.
// With any Studio: the update status (/api/updates) and the newest errors (/api/logs?level=error)
// every 10 minutes, about 1 KB each. Calls go one at a time, each with a 30 s timeout.
import { execFile } from "node:child_process";
import { appendFileSync, closeSync, existsSync, fstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { connect } from "node:net";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

const port = Number.parseInt(process.argv[2] ?? "", 10);
if (!Number.isInteger(port) || port < 1) {
  throw new Error("Ghostex must supply a valid {port} argument");
}
const api = `${process.env.GHOSTEX_API_URL}/api/ext/v1`;
const token = process.env.GHOSTEX_API_TOKEN;
const ghostexHeaders = { authorization: `Bearer ${token}`, "content-type": "application/json" };

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const CALL_TIMEOUT = 30 * SECOND;
const OFFLINE_RETRY = 30 * SECOND;
const ACCESS_RETRY = 5 * MINUTE;
const SLOW_RETRY = 2 * MINUTE;
const AFTER_JOB_CHANGE = 3 * SECOND;
const STREAM_SILENCE = 45 * SECOND; // Studio sends a keepalive every 10 s.
const FAILED_WINDOW = 24 * 60 * MINUTE;
const OPEN = new Set(["queued", "running", "needs_review"]);
/** Job events that change a job's state; job.progress does not. */
const JOB_CHANGES = new Set(["job.created", "job.running", "job.completed", "job.failed", "job.cancelled"]);
/** Studio's own defaults, which its launcher also reads from these variables. */
const API_PORT = Number(process.env.STUDIO_SERVER_PORT) || 17223;
const UI_PORT = Number(process.env.STUDIO_UI_PORT) || 17222;

// ---------------------------------------------------------------------------------------------
// Where Studio is

/** The file a running Studio writes with the port it bound (Studio's docs/agents/mcp.md). */
function discoveryFile() {
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "Cozy Studio", "server.json");
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "Cozy Studio", "server.json");
  return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "cozy-studio", "server.json");
}

/** Studio's origin, read again before each call so a Studio that moved to another port is found. */
function studioOrigin() {
  // COZY_STUDIO_URL is for development against another Studio.
  if (process.env.COZY_STUDIO_URL) return process.env.COZY_STUDIO_URL.replace(/\/+$/, "");
  try {
    const { port: studioPort, pid } = JSON.parse(readFileSync(discoveryFile(), "utf8"));
    if (Number.isInteger(studioPort) && Number.isInteger(pid)) {
      try {
        process.kill(pid, 0);
        return `http://127.0.0.1:${studioPort}`;
      } catch (error) {
        // EPERM: the process runs under another user. Anything else: a file left by a crash.
        if (error.code === "EPERM") return `http://127.0.0.1:${studioPort}`;
      }
    }
  } catch {}
  return `http://127.0.0.1:${API_PORT}`;
}

let studio = studioOrigin();
/** Studio's UI while its dev server answers on UI_PORT; otherwise links go to `studio`, which serves its built UI. */
let ui = null;

// ---------------------------------------------------------------------------------------------
// State

/** Everything the panel shows. */
const state = {
  /** connecting | online | offline */
  connection: "connecting",
  /** Studio refused its read-only tools: Agent access is Off. */
  accessOff: false,
  slow: false,
  /** summary: Studio has the jobs summary. legacy: Studio 0.2.0 or older. null: not known yet. */
  api: null,
  /** The jobs summary, from Studio or built from the legacy snapshot. */
  jobs: null,
  /** Legacy only: open jobs by id and failed jobs of the last 24 hours, to apply events to. */
  open: new Map(),
  failed: [],
  workspaceNames: new Map(),
  /** From studio_status. */
  status: null,
  /** Legacy only: the ChatGPT session from /api/readiness. */
  chatgpt: null,
  syncedAt: null,
  /** Studio's worker pool, from /api/health. */
  workers: null,
  /** Free space on the Library's disk, database size and schema, from /api/health (after 0.2.0). */
  storage: null,
  libraryDir: null,
  /** /api/updates: new commits, whether Studio can update now, and why not. */
  updates: null,
  /** A tap on Check for updates is fetching origin. */
  checkingUpdates: false,
  /** The newest errors in Studio's log, newest first. */
  errors: null,
  /**
   * Ghostex refuses a whole panel when one action needs a permission the user has not granted, so
   * the agent action is left out after a refusal that names agents.start. Each studio_status read
   * tries it again, in case the user granted it since.
   */
  agentsGranted: true,
};

// ---------------------------------------------------------------------------------------------
// Studio

class StudioOffline extends Error {}
class StudioAccessOff extends Error {}
class StudioRefused extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function studioFetch(path, init = {}) {
  studio = studioOrigin();
  let response;
  try {
    response = await fetch(`${studio}${path}`, { ...init, signal: AbortSignal.timeout(CALL_TIMEOUT) });
  } catch (error) {
    if (error.name === "TimeoutError") {
      state.slow = true;
      throw error;
    }
    throw new StudioOffline(error.message);
  }
  state.slow = false;
  const body = await response.json().catch(() => null);
  if (response.status === 403 && body?.access === "off") throw new StudioAccessOff(body.error);
  if (!response.ok) throw new StudioRefused(`${path}: HTTP ${response.status}`, response.status, body);
  return body;
}

/** A read-only Studio MCP tool. Studio checks Agent access on these calls. */
function tool(name, args = {}) {
  return studioFetch("/api/mcp/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, arguments: args }),
  });
}

const preview = (job) => (job.promptPreview ?? job.originalPrompt ?? "").replace(/\s+/g, " ").trim();
const legacyJob = (job) => ({
  id: job.id,
  status: job.status,
  batchId: job.batchId ?? null,
  workspaceId: job.workspaceId ?? "default",
  preview: preview(job),
  error: job.error ?? null,
  updatedAt: job.updatedAt ?? job.createdAt ?? new Date().toISOString(),
});

/** Legacy jobs grouped by batch (a job without a batch is its own group), newest first. */
function legacyGroups(jobs) {
  const byKey = new Map();
  for (const job of jobs) {
    const key = job.batchId ?? job.id;
    byKey.set(key, [...(byKey.get(key) ?? []), job]);
  }
  return [...byKey.values()]
    .map((items) => items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)))
    .sort((left, right) => right[0].updatedAt.localeCompare(left[0].updatedAt))
    .slice(0, 10)
    .map((items) => ({
      items,
      batchId: items[0].batchId,
      jobId: items[0].id,
      workspaceId: items[0].workspaceId,
      workspaceName: state.workspaceNames.get(items[0].workspaceId) ?? (items[0].workspaceId === "default" ? "Default" : "Workspace"),
      promptPreview: items[0].preview,
      updatedAt: items[0].updatedAt,
    }));
}

/** Builds the jobs summary from a legacy snapshot, in the shape newer Studios return. */
function legacySummary() {
  const open = [...state.open.values()];
  const counts = { queued: 0, running: 0, needs_review: 0 };
  for (const job of open) counts[job.status] += 1;
  const failed = state.failed.filter((job) => Date.now() - Date.parse(job.updatedAt) < FAILED_WINDOW);
  return {
    counts,
    active: legacyGroups(open.filter((job) => job.status !== "needs_review")).map(({ items, ...group }) => ({
      ...group,
      counts: Object.fromEntries(["queued", "running"].map((status) => [status, items.filter((job) => job.status === status).length])),
    })),
    recentFailures: legacyGroups(failed).map(({ items, ...group }) => ({ ...group, failed: items.length, error: items[0].error })),
    reviewGroups: new Set(open.filter((job) => job.status === "needs_review").map((job) => job.batchId ?? job.id)).size,
  };
}

async function syncJobs() {
  if (state.api !== "legacy") {
    try {
      state.jobs = await tool("studio_jobs", { summary: true });
      state.api = "summary";
      state.syncedAt = new Date();
      return;
    } catch (error) {
      // Studio 0.2.0 and older refuse the summary argument.
      if (!(error instanceof StudioRefused && error.status === 400 && error.body?.error === "Invalid tool arguments")) throw error;
      state.api = "legacy";
      // Its slower pace starts now; the provider readiness it needs is read after this snapshot.
      schedule("readiness", 0);
    }
  }
  // Open jobs always come back; status: failed makes the history page the latest failures.
  const page = await tool("studio_jobs", { status: "failed", limit: 50 });
  for (const workspace of page.workspaces ?? []) state.workspaceNames.set(workspace.id, workspace.name);
  state.open = new Map(page.open.map((job) => [job.id, legacyJob(job)]));
  state.failed = page.history.map(legacyJob);
  state.jobs = legacySummary();
  state.syncedAt = new Date();
}

async function syncReadiness() {
  const readiness = await studioFetch("/api/readiness");
  state.chatgpt = readiness?.chatgptSession ?? null;
}

async function syncWorkers() {
  const health = await studioFetch("/api/health");
  const worker = health?.worker;
  state.workers = worker
    ? {
        max: worker.maxConcurrentJobs ?? 0,
        active: worker.activeWorkerCount ?? 0,
        queued: worker.queuedJobs ?? 0,
        stopping: worker.stopping === true,
        limits: worker.providerLimits ?? {},
        activeByProvider: worker.activeByProvider ?? {},
        waiting: worker.waiting ?? [],
        hold: health.providerDispatch?.hold === true,
        appServer: health.appServer?.running ? { pid: health.appServer.pid ?? null } : null,
      }
    : null;
  state.storage = health?.storage ?? null;
  state.libraryDir = health?.libraryDir ?? null;
  learnCheckout(health?.runtime?.cwd);
  ui = (await listening(UI_PORT)) ? `http://127.0.0.1:${UI_PORT}` : null;
  // Once per Studio: where its output goes, so an outage can keep the end of it.
  if (health?.runtime && staleLog()) findStudioLog().catch((error) => console.error(`Studio's log: ${error.message}`));
}

async function syncUpdates() {
  state.updates = await studioFetch("/api/updates");
}

async function syncErrors() {
  const logs = await studioFetch("/api/logs?level=error&limit=10");
  // Studio 0.2.0 and older ignore the filter and send their newest 300 logs.
  state.errors = (Array.isArray(logs) ? logs : []).filter((log) => log.level === "error").slice(0, 10);
}

async function syncStatus() {
  const status = await tool("studio_status");
  state.status = {
    version: status.update?.currentVersion ?? null,
    behind: status.update?.behind ?? 0,
    latestVersion: status.update?.latestVersion ?? null,
    channel: status.update?.channel ?? null,
    accessLabel: status.mcpAccessLabel ?? null,
    access: status.mcpAccess ?? null,
    libraryWritable: status.health?.library?.writable ?? null,
    projectPath: status.health?.runtime?.cwd ?? null,
    unorganized: status.unorganized ?? { total: 0, workspaces: [] },
    chatgptUsage: status.chatgptUsage ?? null,
  };
  for (const workspace of state.status.unorganized.workspaces) state.workspaceNames.set(workspace.id, workspace.name);
  if (status.jobs && state.api === "summary") state.jobs = status.jobs;
  state.agentsGranted = true;
}

/** Applies one Studio event. Returns true when the panel should change now. */
function applyEvent(event) {
  if (event.type === "auth.updated") {
    if (state.api === "legacy") soon("readiness", 2 * SECOND);
    else soon("status", 10 * SECOND);
    return false;
  }
  if (!event.type?.startsWith("job.") || !event.payload?.id) return false;
  if (JOB_CHANGES.has(event.type)) soon("workers", AFTER_JOB_CHANGE);
  if (event.type === "job.failed") soon("errors", 10 * SECOND);
  if (state.api === "summary") {
    if (JOB_CHANGES.has(event.type)) soon("jobs", AFTER_JOB_CHANGE);
    return false;
  }
  const job = legacyJob(event.payload);
  if (OPEN.has(job.status)) {
    state.open.set(job.id, job);
  } else {
    state.open.delete(job.id);
    if (job.status === "failed") state.failed = [job, ...state.failed.filter((item) => item.id !== job.id)].slice(0, 50);
  }
  state.jobs = legacySummary();
  return true;
}

// ---------------------------------------------------------------------------------------------
// Studio's event stream

let stream = null;

async function followStudio() {
  const controller = new AbortController();
  stream = controller;
  let silence = setTimeout(() => controller.abort(), STREAM_SILENCE);
  try {
    // The agent stream follows Agent access; Studio 0.2.0 and older have only the UI's stream.
    const path = state.api === "summary" ? "/api/agent/events" : "/api/events";
    const response = await fetch(`${studio}${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of response.body) {
      clearTimeout(silence);
      silence = setTimeout(() => controller.abort(), STREAM_SILENCE);
      buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
      let end;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const data = buffer
          .slice(0, end)
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        buffer = buffer.slice(end + 2);
        if (!data) continue;
        let event;
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }
        if (applyEvent(event)) render();
      }
    }
  } finally {
    clearTimeout(silence);
    if (stream === controller) stream = null;
  }
}

function stopFollowing() {
  stream?.abort();
  stream = null;
}

/**
 * Keeps the stream open while Studio answers; after a drop, a fresh snapshot covers the gap. A
 * stream that dropped within a minute waits a minute, so a failing stream never loops snapshots.
 */
function keepFollowing() {
  if (stream || state.connection !== "online" || state.accessOff || !state.api) return;
  const openedAt = Date.now();
  followStudio()
    .catch(() => {})
    .finally(() => {
      if (state.connection === "online") schedule("jobs", Date.now() - openedAt < MINUTE ? MINUTE : 5 * SECOND);
    });
}

// ---------------------------------------------------------------------------------------------
// Scheduling: one Studio call at a time, each kind at its own pace.

const timers = new Map();
let queue = Promise.resolve();
/** Kinds that read Studio over plain HTTP, which does not check Agent access, so they skip while it is off. */
const PLAIN_HTTP = new Set(["readiness", "workers", "updates", "errors"]);

const tasks = {
  jobs: { run: syncJobs, every: () => 10 * MINUTE },
  // Legacy only. Raw HTTP, so it waits while Agent access is off like the tool calls.
  readiness: {
    run: () => (state.api !== "legacy" || state.accessOff ? "skipped" : syncReadiness()),
    every: () => (state.api === "legacy" ? 5 * MINUTE : null),
  },
  status: { run: syncStatus, every: () => (state.api === "legacy" ? 30 * MINUTE : 10 * MINUTE) },
  // About 1.5 KB. Every minute while Studio works; a job changing state also brings it forward.
  workers: {
    run: () => (state.accessOff ? "skipped" : syncWorkers()),
    every: () => (state.workers?.active || state.workers?.queued ? MINUTE : 10 * MINUTE),
  },
  // About 1 KB each. Studio checks origin for updates at start and when its UI asks; this reads the result.
  // While Studio checks or installs, again in 15 s so the result shows soon.
  updates: {
    run: () => (state.accessOff ? "skipped" : syncUpdates()),
    every: () => (["checking", "updating", "restarting"].includes(state.updates?.phase) ? 15 * SECOND : 10 * MINUTE),
  },
  errors: { run: () => (state.accessOff ? "skipped" : syncErrors()), every: () => 10 * MINUTE },
};

function schedule(kind, delay) {
  clearTimeout(timers.get(kind)?.timer);
  if (delay === null) return timers.delete(kind);
  timers.set(kind, { at: Date.now() + delay, timer: setTimeout(() => run(kind), delay) });
}

/** Runs a kind within delay, keeping an earlier run that is already due. */
function soon(kind, delay) {
  const pending = timers.get(kind);
  if (!pending || pending.at > Date.now() + delay) schedule(kind, delay);
}

function run(kind) {
  queue = queue.then(async () => {
    clearTimeout(timers.get(kind)?.timer);
    timers.delete(kind);
    try {
      if ((await tasks[kind].run()) !== "skipped") state.connection = "online";
      if (!PLAIN_HTTP.has(kind) && state.accessOff) {
        state.accessOff = false;
        // The plain HTTP reads skipped while access was off.
        soon("workers", 0);
        if (state.api === "legacy") soon("readiness", 0);
      }
      if (!timers.has(kind)) schedule(kind, tasks[kind].every());
      keepFollowing();
    } catch (error) {
      if (error instanceof StudioOffline) {
        if (state.connection !== "offline") console.error(`Cozy Studio is not answering at ${studio}`);
        state.connection = "offline";
        if (studioLog) studioLog.stale = true;
        // The next Studio may be an older or newer one.
        state.api = null;
        stopFollowing();
        schedule(kind, OFFLINE_RETRY);
      } else if (error instanceof StudioAccessOff) {
        state.connection = "online";
        state.accessOff = true;
        stopFollowing();
        schedule(kind, ACCESS_RETRY);
      } else if (error.name === "TimeoutError") {
        console.error(`${kind}: Studio did not answer within ${CALL_TIMEOUT / SECOND} s`);
        schedule(kind, SLOW_RETRY);
      } else {
        console.error(`${kind}: ${error.message}`);
        schedule(kind, tasks[kind].every() ?? 10 * MINUTE);
      }
    }
    render();
  });
  return queue;
}

const readAll = () => Object.keys(tasks).forEach(run);

let lastRefresh = 0;
function refreshAll() {
  if (Date.now() - lastRefresh < 20 * SECOND) return;
  lastRefresh = Date.now();
  readAll();
}

// ---------------------------------------------------------------------------------------------
// Starting, restarting and stopping Studio (Windows)
//
// Studio runs from its checkout with `bun run scripts/dev.ts`, which starts the UI dev server
// (scripts/dev-ui.ts) and the backend (apps/local-server/src/index.ts) and restarts the backend
// when it exits with Studio's restart code. Ghostex runs this server inside its own job object,
// so a child would end with Ghostex. Windows' process service (WMI) starts Studio instead: it
// belongs to no job or terminal, its console window is hidden and its own, so no Ctrl+C from
// another terminal reaches it, and it keeps running after Ghostex and agent sessions close.

const CAN_CONTROL = process.platform === "win32";
const control = {
  /** starting | stopping | restarting, while one runs. */
  phase: null,
  /** stop | restart: a tap that would cut jobs in flight, waiting for "anyway". */
  confirm: null,
  /** { running, queued }: the jobs the waiting confirmation would cut. */
  cut: null,
  /** { action, message } of the last control that failed, shown until the next one. */
  error: null,
};

/** The extension's own folder, kept across restarts: Studio's checkout and Keep Studio running. */
const dataDir = process.env.GHOSTEX_EXTENSION_DATA_DIR || null;

function readData(name) {
  try {
    return JSON.parse(readFileSync(join(dataDir, name), "utf8"));
  } catch {
    return null;
  }
}

function writeData(name, value) {
  if (!dataDir) return;
  try {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, name), JSON.stringify(value));
  } catch (error) {
    console.error(`Could not save ${name}: ${error.message}`);
  }
}

const isCheckout = (root) => typeof root === "string" && existsSync(join(root, "scripts", "dev.ts"));
// COZY_STUDIO_DIR is for development against another checkout.
let checkout = process.env.COZY_STUDIO_DIR || (isCheckout(readData("studio.json")?.root) ? readData("studio.json").root : null);

/** Studio started with bun run dev works in its checkout and reports it as runtime.cwd. */
function learnCheckout(cwd) {
  if (process.env.COZY_STUDIO_DIR || cwd === checkout || !isCheckout(cwd)) return;
  checkout = cwd;
  writeData("studio.json", { root: cwd });
}

const pause = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

async function waitFor(check, timeout, every = 2 * SECOND) {
  for (const end = Date.now() + timeout; Date.now() < end; await pause(every)) {
    if (await check()) return true;
  }
  return false;
}

/** True when something accepts connections on the port, over IPv4 or IPv6. */
async function listening(port) {
  for (const host of ["127.0.0.1", "::1"]) {
    const open = await new Promise((resolve) => {
      const socket = connect({ host, port });
      const done = (result) => {
        socket.destroy();
        resolve(result);
      };
      socket.setTimeout(SECOND, () => done(false));
      socket.once("connect", () => done(true));
      socket.once("error", () => done(false));
    });
    if (open) return true;
  }
  return false;
}

/** Reads Studio without the scheduler, for the control flows: null when it does not answer. */
async function peek(path, init = {}) {
  try {
    const response = await fetch(`${studioOrigin()}${path}`, { ...init, signal: AbortSignal.timeout(5 * SECOND) });
    return response.ok ? await response.json().catch(() => ({})) : null;
  } catch {
    return null;
  }
}

function execText(file, args, env) {
  return new Promise((resolve, reject) =>
    execFile(file, args, { windowsHide: true, timeout: 30 * SECOND, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, ...env } }, (error, stdout, stderr) => {
      if (!error) return resolve(stdout);
      // error.message repeats the whole command line, which for PowerShell is a long encoded script.
      const name = file.replace(/\.exe$/i, "");
      reject(new Error(error.killed ? `${name} did not finish within 30 seconds. The computer may be busy; try again.` : String(stderr).trim() || `${name} failed (exit code ${error.code}).`));
    }),
  );
}

const powershell = (script, env) =>
  execText("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], env);

/** Listeners on the ports, and every bun, node and cmd process with its parent and command line. */
const SNAPSHOT = `
$ports = @($env:CZ_PORTS -split ',' | ForEach-Object { [int]$_ })
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort $ports -ErrorAction SilentlyContinue | ForEach-Object { @{ port = [int]$_.LocalPort; pid = [int]$_.OwningProcess } })
$processes = @(Get-CimInstance Win32_Process -Filter "Name='bun.exe' OR Name='node.exe' OR Name='cmd.exe'" | ForEach-Object { @{ pid = [int]$_.ProcessId; parent = [int]$_.ParentProcessId; name = $_.Name; command = [string]$_.CommandLine; created = $_.CreationDate.ToUniversalTime().ToString('o') } })
@{ listeners = $listeners; processes = $processes } | ConvertTo-Json -Depth 3 -Compress
`;

/** Starts CZ_CMD in CZ_DIR through WMI, with a hidden console of its own in a new process group. */
const LAUNCH = `
$startup = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0; CreateFlags = [uint32](0x200 -bor 0x10) }
$result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $env:CZ_CMD; CurrentDirectory = $env:CZ_DIR; ProcessStartupInformation = $startup }
@{ code = [int]$result.ReturnValue; pid = [int]$result.ProcessId } | ConvertTo-Json -Compress
`;

const ROLES = [
  ["ui", /scripts[\\/]dev-ui\.ts/i],
  ["launcher", /scripts[\\/]dev\.ts/i],
  ["server", /apps[\\/]local-server[\\/]src[\\/]index\.ts/i],
];
const samePath = (left, right) => left.replace(/[\\/]+$/, "").toLowerCase() === right.replace(/[\\/]+$/, "").toLowerCase();

/**
 * launcher, server or ui for a process that runs one of Studio's scripts. Launches with a relative
 * script count (Studio runs them from its checkout); a script named by full path must be in the
 * checkout this extension knows.
 */
function studioRole({ command }) {
  const role = ROLES.find(([, pattern]) => pattern.test(command))?.[0];
  if (!role) return null;
  const root = command.match(/([A-Za-z]:[\\/][^"]*?)[\\/](?:scripts|apps)[\\/]/)?.[1];
  return !root || (checkout && samePath(root, checkout)) ? role : null;
}

/** The launcher this server started last, found by PID while it has not bound its ports yet. */
let launchedPid = null;

/**
 * Studio's process trees: the top launcher above the backend on apiPort and the UI on UI_PORT, and
 * the launcher this server started if it has not bound them yet. Other programs on those ports
 * come back in `foreign` and are never stopped.
 */
async function findStudio(apiPort) {
  const ports = [...new Set([apiPort, UI_PORT])];
  const snapshot = JSON.parse((await powershell(SNAPSHOT, { CZ_PORTS: ports.join(",") })).trim() || "{}");
  const processes = new Map((snapshot.processes ?? []).map((proc) => [proc.pid, { ...proc, role: studioRole(proc) }]));
  const roots = new Map();
  const held = new Set();
  const foreign = [];
  const topOf = (proc) => {
    // A parent started after its child is a reused PID, not the parent.
    for (let parent = processes.get(proc.parent); parent?.role === "launcher" && parent.created <= proc.created; parent = processes.get(proc.parent)) proc = parent;
    return proc;
  };
  for (const { port, pid } of snapshot.listeners ?? []) {
    const proc = processes.get(pid);
    if (proc?.role !== (port === apiPort ? "server" : "ui")) {
      if (!foreign.some((item) => item.port === port)) foreign.push({ port, pid, name: proc?.name ?? "another program" });
      continue;
    }
    held.add(port);
    const top = topOf(proc);
    roots.set(top.pid, top);
  }
  const launched = processes.get(launchedPid);
  if (launched?.role === "launcher") roots.set(launched.pid, launched);
  return { roots: [...roots.values()], held: [...held], foreign, processes };
}

const describe = ({ name, pid }) => `${name} (PID ${pid})`;

/** Jobs a stop would cut: the worker pool's and the jobs summary's, whichever is larger. */
async function jobsInFlight() {
  const worker = (await peek("/api/health"))?.worker;
  const counts = state.jobs?.counts ?? {};
  return {
    running: Math.max(worker?.activeWorkerCount ?? 0, counts.running ?? 0),
    queued: Math.max(worker?.queuedJobs ?? 0, counts.queued ?? 0),
  };
}

function bunPath() {
  const candidates = [process.env.BUN_INSTALL && join(process.env.BUN_INSTALL, "bin", "bun.exe"), join(homedir(), ".bun", "bin", "bun.exe")];
  return candidates.find((path) => path && existsSync(path)) ?? "bun.exe";
}

/** Start refused because Studio, or something on its ports, still runs. */
class StudioBusy extends Error {}

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
};

async function startStudio() {
  if (!checkout) throw new Error("The panel does not know Studio's folder yet. Run Studio once with bun run dev and it learns it.");
  const origin = studioOrigin();
  // Never two backends on one Library: anything on Studio's ports, or a Studio process, stops here.
  if (await peek("/api/health")) throw new StudioBusy(`Studio is already running at ${origin}.`);
  const ports = [...new Set([API_PORT, Number(new URL(origin).port), UI_PORT])];
  const busy = [];
  for (const port of ports) if (await listening(port)) busy.push(port);
  const { processes, roots, foreign } = await findStudio(API_PORT);
  if (busy.length) {
    const owner = (port) => foreign.find((item) => item.port === port);
    throw new StudioBusy(busy.map((port) => `Port ${port} is in use${owner(port) ? ` by ${describe(owner(port))}` : ""}.`).join(" "));
  }
  // A test Studio with a Library of its own may run beside the user's Studio (README, Development).
  const running = roots[0] ?? (process.env.COZY_STUDIO_SEPARATE_LIBRARY === "1" ? null : [...processes.values()].find((proc) => proc.role));
  if (running) throw new StudioBusy(`A Studio process is still running: ${describe(running)}. Stop it first.`);

  // COZY_STUDIO_LOG is for development, to keep a test Studio's output out of the checkout.
  const log = process.env.COZY_STUDIO_LOG || join(checkout, "logs", "dev-restart.log");
  mkdirSync(dirname(log), { recursive: true });
  appendFileSync(log, `\n[${new Date().toISOString()}] Cozy Studio extension for Ghostex: bun run scripts/dev.ts\n`);
  // WMI gives Studio the user's own environment; Studio's variables set here carry over.
  const settings = Object.entries(process.env)
    .filter(([key, value]) => (/^STUDIO_/i.test(key) || /^LOCALAPPDATA$/i.test(key)) && !/["%\r\n]/.test(value))
    .map(([key, value]) => `set "${key}=${value}"&& `)
    .join("");
  const command = `cmd.exe /d /s /c "${settings}"${bunPath()}" run "${join(checkout, "scripts", "dev.ts")}" >> "${log}" 2>&1"`;
  const launched = JSON.parse((await powershell(LAUNCH, { CZ_CMD: command, CZ_DIR: checkout })).trim());
  if (launched.code !== 0) throw new Error(`Windows did not start Studio (Win32_Process.Create returned ${launched.code}).`);
  launchedPid = launched.pid;
  console.error(`Started Studio from ${checkout} (PID ${launched.pid}); its output goes to ${log}`);
  let ended = false;
  const answered = await waitFor(async () => {
    if (await peek("/api/health")) return true;
    ended = !alive(launched.pid);
    return ended;
  }, 2 * MINUTE);
  if (ended) throw new Error(`Studio ended while it started. Its output is in ${log}.`);
  if (!answered) throw new Error(`Studio did not answer within 2 minutes. Its output is in ${log}.`);
}

/**
 * Asks Studio to shut down the way Ctrl+C does (POST /api/updates/stop, newer than 0.2.0), so it
 * records its interrupted jobs and stops what it started; its launcher then ends the UI. Ends
 * Studio's process tree only when it is still up 15 seconds later or has no such route.
 */
async function stopStudio() {
  const apiPort = Number(new URL(studioOrigin()).port);
  const { roots, held, foreign } = await findStudio(apiPort);
  const down = async () => !(await peek("/api/health")) && !(await Promise.all(held.map(listening))).some(Boolean);
  const asked = await peek("/api/updates/stop", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  if (asked && (await waitFor(down, 15 * SECOND, SECOND))) {
    console.error("Studio stopped itself");
    state.connection = "offline";
    stopFollowing();
    return;
  }
  if (!roots.length) {
    throw new Error(foreign.length ? `${describe(foreign[0])} holds port ${foreign[0].port}. It is not Studio, so it was left running.` : "No Studio process was found.");
  }
  console.error(asked ? "Studio was still up 15 s after it was asked to stop" : "This Studio cannot stop itself");
  for (const root of roots) {
    console.error(`Stopping Studio's process tree under ${describe(root)}`);
    // /T takes the launcher's children: the UI, the backend and anything the backend started.
    await execText("taskkill.exe", ["/PID", String(root.pid), "/T", "/F"]).catch((error) => console.error(`taskkill ${root.pid}: ${error.message}`));
  }
  const freed = await waitFor(async () => !(await Promise.all(held.map(listening))).some(Boolean), 30 * SECOND, SECOND);
  if (!freed) throw new Error(`Studio's ports (${held.join(", ")}) are still in use 30 seconds after stopping it.`);
  state.connection = "offline";
  stopFollowing();
}

/** Studio's managed restart when its launcher offers one; otherwise a stop and a start. */
async function restartStudio(confirmed) {
  const updates = confirmed ? null : await peek("/api/updates");
  if (updates?.phase === "updating") throw new Error("Studio is installing an update and restarts by itself when it is done.");
  if (updates?.canRestart) {
    const restarted = await peek("/api/updates/restart", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    if (!restarted) throw new Error("Studio refused to restart. Try again when its jobs finish.");
    const back = await waitFor(async () => {
      const now = await peek("/api/updates");
      return !!now && now.instanceId !== updates.instanceId;
    }, 2 * MINUTE);
    if (!back) throw new Error("Studio did not come back within 2 minutes after restarting.");
    return;
  }
  if (!checkout) throw new Error("This Studio cannot restart itself and the panel does not know its folder to start it again.");
  await stopStudio();
  await startStudio();
}

/**
 * Studio's own update (/api/updates/apply): it fast-forwards its checkout to the commit it checked,
 * installs dependencies and restarts through its launcher. It refuses when the checkout has local
 * changes, and says why in `blocker`. With jobs queued or running it refuses too, unless `force`
 * (the user confirmed): its restart then requeues running jobs and resumes them with the queued
 * ones. Studio 0.2.0 and older know no `force` and keep refusing.
 */
async function updateStudio(force) {
  const before = await peek("/api/updates");
  if (!before) throw new Error("Studio is not answering.");
  const can = before.canUpdate || (force && before.canForceUpdate);
  if (!can || !before.latestCommit) throw new Error(before.blocker ?? before.error ?? "Check for updates first.");
  const response = await fetch(`${studioOrigin()}/api/updates/apply`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ commit: before.latestCommit, force: !!force }),
    signal: AbortSignal.timeout(30 * SECOND),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Studio refused the update (HTTP ${response.status}).`);
  // Installing dependencies may take Studio up to 5 minutes before it restarts.
  let failed = null;
  const back = await waitFor(
    async () => {
      const now = await peek("/api/updates");
      if (now?.instanceId === before.instanceId && now.phase === "error") failed = now.error ?? "The update failed.";
      return !!failed || (!!now && now.instanceId !== before.instanceId);
    },
    6 * MINUTE,
    3 * SECOND,
  );
  if (failed) throw new Error(failed);
  if (!back) throw new Error("Studio did not come back within 6 minutes after updating.");
}

/** Check for updates: Studio fetches origin and compares (POST /api/updates/check, as its UI does). */
async function checkUpdates() {
  if (state.checkingUpdates || state.connection !== "online") return;
  state.checkingUpdates = true;
  render();
  try {
    const response = await fetch(`${studioOrigin()}/api/updates/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(90 * SECOND),
    });
    if (response.ok) state.updates = await response.json();
    else console.error(`Check for updates: HTTP ${response.status}`);
  } catch (error) {
    console.error(`Check for updates: ${error.message}`);
  } finally {
    state.checkingUpdates = false;
    render();
  }
}

const PHASES = { start: "starting", stop: "stopping", restart: "restarting", update: "updating" };

/** A tap on Start, Stop, Restart, Update, or on the confirmation's "anyway" (confirm) or Cancel. */
async function onControl(name) {
  if (control.phase) return;
  const confirmed = name === "confirm";
  const action = confirmed ? control.confirm : name;
  // Start, Stop and Restart run Windows' tools; Update is Studio's own and works anywhere.
  if (!CAN_CONTROL && action !== "update" && name !== "cancel") return;
  control.confirm = null;
  control.error = null;
  if (!PHASES[action]) return render();
  control.phase = PHASES[action];
  render();
  try {
    if (action !== "start" && !confirmed) {
      const jobs = await jobsInFlight();
      if (jobs.running || jobs.queued) {
        control.confirm = action;
        control.cut = jobs;
        return;
      }
    }
    if (action === "start") {
      // A Start resumes Keep Studio running after a Stop paused it or after it gave up.
      if (keeper.paused || keeper.gaveUp) {
        keeperFailures = [];
        setKeeper({ paused: false, gaveUp: false });
      }
      await startStudio();
      closeOutage(true);
    } else if (action === "stop") {
      // Keep Studio running must not start again what the user just stopped.
      if (keeper.on && !keeper.paused) setKeeper({ paused: true });
      await stopStudio();
    } else if (action === "update") await updateStudio(confirmed);
    else await restartStudio(confirmed);
  } catch (error) {
    control.error = { action, message: error.message };
    console.error(`${action}: ${error.message}`);
  } finally {
    control.phase = null;
    if (!control.confirm) readAll();
    render();
    keepWatching();
  }
}

// ---------------------------------------------------------------------------------------------
// Keep Studio running (Windows)
//
// Off by default. While it is on, a check every 30 s connects to Studio's port, which costs Studio
// nothing. Studio counts as down when two checks 15 s apart find nothing on its ports and its
// health check does not answer. Then the panel starts it through startStudio, whose checks refuse
// while any Studio process still runs. dev.ts's own restart (exit code 75) keeps the launcher and
// the UI on port 17222 running, so it never counts as down. Starts wait longer each time (30 s,
// 1, 2, then 5 minutes); after 3 failed starts in a row within 10 minutes the panel gives up and
// shows the error. A Stop from the panel pauses it until the next Start or until it is turned on
// again. Each time Studio is found down, the time goes to keeper.json in the extension's folder.

const KEEP_EVERY = 30 * SECOND;
const KEEP_RECHECK = 15 * SECOND;
const KEEP_BACKOFF = [30 * SECOND, MINUTE, 2 * MINUTE, 5 * MINUTE];
const KEEP_WINDOW = 10 * MINUTE;
const KEEP_GIVE_UP = 3;
const DOWNS_KEPT = 100;

const saved = readData("keeper.json") ?? {};
const keeper = {
  on: saved.on === true,
  /** A Stop from the panel paused it. */
  paused: saved.paused === true,
  /** 3 starts failed in a row. */
  gaveUp: saved.gaveUp === true,
  /** Each time Studio was found down: { at, started?, error?, gaveUp? }, oldest first. */
  downs: Array.isArray(saved.downs) ? saved.downs.filter((down) => typeof down?.at === "string").slice(-DOWNS_KEPT) : [],
};
/** The entry of `downs` for the outage going on now. */
let outage = null;
/** The keeper's starts, and its failed starts in a row, of the last 10 minutes. */
let keeperStarts = [];
let keeperFailures = [];

const keeping = () => CAN_CONTROL && !!checkout && keeper.on && !keeper.paused && !keeper.gaveUp;

// One keeper at a time. A server left running by an older Ghostex must not start Studio next to
// this one, so the keeper first takes keeper.lock in the extension's folder: { pid, ghostex }. It
// takes the lock over when that server, or the Ghostex that started it, is gone, and gives it
// back when it exits.
const LOCK = dataDir ? join(dataDir, "keeper.lock") : null;
let lockOwner = null;

function holdLock() {
  if (!LOCK) return true;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(LOCK, JSON.stringify({ pid: process.pid, ghostex: ghostexPids.at(-1) ?? null }), { flag: "wx" });
      return true;
    } catch (error) {
      if (error.code !== "EEXIST") {
        console.error(`Could not take keeper.lock, keeping Studio running without it: ${error.message}`);
        return true;
      }
    }
    const lock = readData("keeper.lock");
    if (lock?.pid === process.pid) return true;
    if (Number.isInteger(lock?.pid) && alive(lock.pid) && (!Number.isInteger(lock.ghostex) || alive(lock.ghostex))) {
      if (lockOwner !== lock.pid) console.error(`Keep Studio running waits: server ${lock.pid} keeps Studio running.`);
      lockOwner = lock.pid;
      return false;
    }
    rmSync(LOCK, { force: true });
  }
  return false;
}

process.on("exit", () => {
  if (LOCK && readData("keeper.lock")?.pid === process.pid) rmSync(LOCK, { force: true });
});

function setKeeper(change) {
  Object.assign(keeper, change);
  writeData("keeper.json", { on: keeper.on, paused: keeper.paused, gaveUp: keeper.gaveUp, downs: keeper.downs.slice(-DOWNS_KEPT) });
}

/** Ends the outage going on now: Studio was started again, or came back by other means. */
function closeOutage(started) {
  if (!outage) return;
  if (started) outage.started = new Date().toISOString();
  outage = null;
  setKeeper({});
}

let keepTimer = null;
let checking = false;

function keepWatching(delay = KEEP_EVERY) {
  clearTimeout(keepTimer);
  keepTimer = keeping() ? setTimeout(keepCheck, delay) : null;
}

/** Something listens on Studio's API port; with `thorough`, also on the UI port, or Studio's health answers. */
async function studioAround(thorough) {
  const ports = thorough ? [...new Set([Number(new URL(studioOrigin()).port), API_PORT, UI_PORT])] : [Number(new URL(studioOrigin()).port)];
  for (const port of ports) if (await listening(port)) return true;
  return thorough && !!(await peek("/api/health"));
}

async function keepCheck() {
  keepTimer = null;
  if (checking || !keeping()) return;
  checking = true;
  let next = KEEP_EVERY;
  try {
    await ghostexFound;
    if (holdLock()) next = await keepRound();
  } catch (error) {
    console.error(`Keep Studio running: ${error.message}`);
  } finally {
    checking = false;
    keepWatching(next);
  }
}

/** One check, and a start when Studio is down. Returns the wait until the next check. */
async function keepRound() {
  if (control.phase || control.confirm || (await studioAround(false))) {
    if (!control.phase) closeOutage(false);
    return KEEP_EVERY;
  }
  const missedAt = new Date().toISOString();
  await pause(KEEP_RECHECK);
  if (!keeping() || control.phase || (await studioAround(true))) return KEEP_EVERY;

  const now = Date.now();
  if (!outage) {
    outage = { at: missedAt, log: saveOutageLog(missedAt) };
    keeper.downs.push(outage);
    keeper.downs = keeper.downs.slice(-DOWNS_KEPT);
    console.error(`Studio was down at ${missedAt}`);
    setKeeper({});
    render();
  }
  keeperStarts = keeperStarts.filter((at) => now - at < KEEP_WINDOW);
  const last = keeperStarts.at(-1);
  const wait = last ? last + KEEP_BACKOFF[Math.min(keeperStarts.length, KEEP_BACKOFF.length) - 1] - now : 0;
  if (wait > 0) return wait;
  // A tap may have started a control during the checks above, and a Stop in another server's panel
  // pauses this keeper through keeper.json.
  const stored = readData("keeper.json");
  if (stored) Object.assign(keeper, { on: stored.on === true, paused: stored.paused === true, gaveUp: stored.gaveUp === true });
  if (control.phase || !keeping()) return KEEP_EVERY;
  control.phase = "starting";
  keeperStarts.push(now);
  render();
  try {
    await startStudio();
    console.error("Keep Studio running started Studio again");
    keeperFailures = [];
    closeOutage(true);
  } catch (error) {
    console.error(`Keep Studio running could not start Studio: ${error.message}`);
    outage.error = error.message;
    if (error instanceof StudioBusy) {
      // Studio, or something on its ports, still runs: not a failed start.
      keeperStarts.pop();
    } else {
      keeperFailures = [...keeperFailures.filter((at) => now - at < KEEP_WINDOW), now];
      if (keeperFailures.length >= KEEP_GIVE_UP) {
        outage.gaveUp = true;
        console.error(`Keep Studio running gave up after ${KEEP_GIVE_UP} failed starts`);
      }
    }
    setKeeper({ gaveUp: outage.gaveUp === true });
  } finally {
    control.phase = null;
    readAll();
    render();
  }
  return KEEP_EVERY;
}

/** A tap on the switch: turns it off while it watches; otherwise on, also out of a pause or after giving up. */
function onKeep() {
  if (!CAN_CONTROL) return;
  const on = !keeping();
  keeperStarts = [];
  keeperFailures = [];
  outage = null;
  setKeeper({ on, paused: false, gaveUp: false });
  render();
  keepWatching(on ? 5 * SECOND : KEEP_EVERY);
}

// ---------------------------------------------------------------------------------------------
// Studio's logs
//
// Studio's output goes where its launch command sends it: logs\dev-restart.log for a Studio this
// panel started, or the file in a command such as `cmd /c "bun run scripts/dev.ts > x.log"`. The
// panel reads that command once per Studio (Windows). When Keep Studio running finds Studio down,
// it copies the end of that output and of Studio's own error log (.studio\logs\errors.log in the
// Library) to outages\ in the extension's folder, before a new start writes over the picture. The
// panel opens these files with the default app and folders in Explorer.

/**
 * { origin, path, stale }: the running Studio's output file, or path null when its command names
 * none. It turns stale when Studio stops answering, and is read again when Studio answers.
 */
let studioLog = null;
const staleLog = () => !studioLog || studioLog.stale || studioLog.origin !== studio;
const REDIRECT = />>?\s*"?([^"<>|&]+?\.log)\b/i;
const OUTAGE_LOGS_KEPT = 100;

let findingLog = null;
/** One look at a time: the process list can take seconds on a busy computer. */
function findStudioLog() {
  findingLog ??= lookForStudioLog().finally(() => (findingLog = null));
  return findingLog;
}

async function lookForStudioLog() {
  const origin = studio;
  let path = null;
  if (CAN_CONTROL) {
    const { roots, processes } = await findStudio(Number(new URL(origin).port));
    for (const root of roots) {
      // The launcher, or the shell above it, carries the redirection.
      for (let proc = root, depth = 0; proc && !path && depth < 4; proc = processes.get(proc.parent), depth += 1) {
        const file = proc.command.match(REDIRECT)?.[1]?.trim();
        if (file) path = isAbsolute(file) ? file : join(checkout ?? "", file);
      }
    }
  }
  studioLog = { origin, path };
}

const studioLogsFolder = () => (state.libraryDir ? join(state.libraryDir, ".studio", "logs") : null);

/** The last `bytes` of a file, or a line saying why it could not be read. */
function tail(path, bytes) {
  try {
    const fd = openSync(path, "r");
    try {
      const { size } = fstatSync(fd);
      const length = Math.min(bytes, size);
      const buffer = Buffer.alloc(length);
      readSync(fd, buffer, 0, length, size - length);
      return `${size > length ? "[…]\n" : ""}${buffer.toString("utf8")}`;
    } finally {
      closeSync(fd);
    }
  } catch (error) {
    return `(could not read it: ${error.message})`;
  }
}

/** Keeps the end of the logs of a Studio found down. Returns the copy's path, or null. */
function saveOutageLog(at) {
  if (!dataDir) return null;
  const folder = join(dataDir, "outages");
  const parts = [`Cozy Studio was found down at ${at}.`];
  if (studioLog?.path) parts.push("", `--- The end of Studio's output, ${studioLog.path}:`, tail(studioLog.path, 64 * 1024));
  else parts.push("", "--- Studio's launch command named no output file, so its output was not kept.");
  const errors = studioLogsFolder() && join(studioLogsFolder(), "errors.log");
  if (errors && existsSync(errors)) parts.push("", `--- The end of Studio's error log, ${errors}:`, tail(errors, 16 * 1024));
  try {
    mkdirSync(folder, { recursive: true });
    const file = join(folder, `${at.replace(/[:.]/g, "-")}.log`);
    writeFileSync(file, `${parts.join("\n")}\n`);
    for (const old of readdirSync(folder).sort().slice(0, -OUTAGE_LOGS_KEPT)) rmSync(join(folder, old), { force: true });
    return file;
  } catch (error) {
    console.error(`Could not keep the outage's log: ${error.message}`);
    return null;
  }
}

/** Opens a file with its default app, or a folder in the file manager. */
function openPath(path) {
  const [file, args] =
    process.platform === "win32" ? ["explorer.exe", [path]] : process.platform === "darwin" ? ["open", [path]] : ["xdg-open", [path]];
  // Explorer exits with 1 even after it opened the file.
  execFile(file, args, () => {});
}

/** Stamp of an outage, for its row's action name. */
const outageStamp = (down) => down.at.replace(/[:.]/g, "-");

/** A tap on Open Studio's log, Open the logs folder, or an outage row. */
async function onLog(name) {
  control.error = null;
  let path = null;
  if (name === "log-current") {
    if (state.connection === "online" && staleLog()) await findStudioLog().catch(() => {});
    path = studioLog?.path && existsSync(studioLog.path) ? studioLog.path : null;
    if (!path) path = studioLogsFolder() && existsSync(studioLogsFolder()) ? studioLogsFolder() : null;
  } else if (name === "log-folder") {
    path = studioLogsFolder() && existsSync(studioLogsFolder()) ? studioLogsFolder() : null;
  } else {
    const down = keeper.downs.find((item) => `log-down-${outageStamp(item)}` === name);
    path = down?.log && existsSync(down.log) ? down.log : null;
  }
  if (path) {
    console.error(`Opening ${path}`);
    openPath(path);
  } else control.error = { action: "log", message: "The panel has no such log on this computer." };
  render();
}

// ---------------------------------------------------------------------------------------------
// The panel

const studioLink = (query = {}) => {
  const search = new URLSearchParams(query).toString();
  return { openUrl: `${ui ?? studio}/${search ? `?${search}` : ""}` };
};
/** Studio after 0.2.0 opens a batch or a job from a link; older ones open the workspace. */
const groupLink = (group) =>
  studioLink(state.api === "summary" ? (group.batchId ? { batch: group.batchId } : { job: group.jobId }) : { workspace: group.workspaceId });
const label = (text, fallback) => {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  return (value || fallback).slice(0, 200);
};
const plural = (count, one, many = `${one}s`) => `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
const clock = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
/** The time, with the day when it is not today. */
const when = (iso) =>
  new Date(iso).toDateString() === new Date().toDateString() ? clock(iso) : `${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${clock(iso)}`;

function summaryBlock() {
  const { queued = 0, running = 0, needs_review = 0 } = state.jobs?.counts ?? {};
  const failed = (state.jobs?.recentFailures ?? []).reduce((sum, group) => sum + group.failed, 0);
  let dot = "gray";
  let subtitle = "Idle";
  if (control.phase) {
    dot = "blue";
    subtitle = PHASE_TITLES[control.phase];
  } else if (state.connection === "connecting") subtitle = "Connecting…";
  else if (state.connection === "offline") subtitle = "Not running";
  else if (state.accessOff) {
    dot = "yellow";
    subtitle = "Agent access is off";
  } else {
    const parts = [];
    if (running) parts.push(`${running} running`);
    if (queued) parts.push(`${queued} queued`);
    if (failed) parts.push(`${failed} failed in 24 h`);
    if (!running && !queued && needs_review) parts.push(`${needs_review} to review`);
    if (parts.length) subtitle = parts.join(" · ");
    dot = running || queued ? "green" : failed ? "red" : "gray";
  }
  return {
    id: "summary",
    type: "rows",
    tab: "jobs",
    items: [
      {
        id: "studio",
        icon: "icon.svg",
        dot,
        title: "Cozy Studio",
        subtitle,
        ...(state.slow ? { badge: "slow" } : {}),
        action: studioLink(),
        menu: [{ title: "Open Studio", icon: "external-link", action: studioLink() }, ...controlButtons().map(({ title, icon, action }) => ({ title, icon, action }))],
      },
    ],
  };
}

const PHASE_TITLES = { starting: "Starting Studio…", stopping: "Stopping Studio…", restarting: "Restarting Studio…", updating: "Updating Studio…" };
/** The confirmation of a control that would cut jobs in flight: title, "anyway" button, its icon. */
const CONFIRMS = {
  stop: ["Stop Studio?", "Stop anyway", "player-stop"],
  restart: ["Restart Studio?", "Restart anyway", "rotate-clockwise"],
  update: ["Update Studio?", "Update anyway", "download"],
};
const online = () => state.connection === "online";

/** Why the panel cannot start Studio, or null when it can. */
function cannotStart() {
  if (!CAN_CONTROL) return "Start and Stop work on Windows only.";
  if (!checkout) return "Then the panel knows its folder.";
  return null;
}

/** Start while Studio is down; Restart and Stop while it runs. None while a control runs or waits. */
function controlButtons() {
  if (!CAN_CONTROL || control.phase || control.confirm) return [];
  if (!online()) return cannotStart() ? [] : [{ title: "Start Studio", icon: "player-play", style: "primary", action: { extension: "start" } }];
  return [
    { title: "Restart", icon: "rotate-clockwise", action: { extension: "restart" } },
    { title: "Stop", icon: "player-stop", action: { extension: "stop" } },
  ];
}

/** What a control is doing, the confirmation it waits for, or why it failed. Shown on every tab. */
function controlBlocks(tab) {
  if (control.phase) {
    const subtitle = {
      starting: "Studio answers in up to 2 minutes.",
      stopping: "Studio is shutting down.",
      restarting: "Studio is back in up to 2 minutes.",
      updating: "Studio installs it and restarts in up to 5 minutes.",
    }[control.phase];
    return [{ id: `${tab}-control`, type: "rows", tab, items: [{ id: "phase", icon: "loader2", dot: "blue", title: PHASE_TITLES[control.phase], subtitle }] }];
  }
  if (control.confirm) {
    const { running = 0, queued = 0 } = control.cut ?? {};
    const jobs = [running && `${running} running`, queued && `${queued} queued`].filter(Boolean).join(" · ");
    const [title, anyway, icon] = CONFIRMS[control.confirm];
    // An update stops running jobs and Studio requeues them (Studio newer than 0.2.0).
    const updating = control.confirm === "update";
    return [
      {
        id: `${tab}-control`,
        type: "rows",
        tab,
        items: [
          {
            id: "confirm",
            icon: "alert-triangle",
            dot: "yellow",
            title: updating && running ? `${title} It interrupts ${plural(running, "running job")}.` : title,
            subtitle: updating
              ? "Running jobs go back to the queue and rerun after the restart; queued jobs wait. A job already sent to ChatGPT goes to Review instead of being sent again."
              : "They rerun and can spend usage.",
            trailing: jobs,
          },
        ],
      },
      {
        id: `${tab}-confirm`,
        type: "buttons",
        tab,
        items: [
          { title: anyway, icon, action: { extension: "confirm" } },
          { title: "Keep running", icon: "x", style: "primary", action: { extension: "cancel" } },
        ],
      },
    ];
  }
  const items = [];
  if (control.error) {
    const title = control.error.action === "log" ? "Could not open the log" : `Could not ${control.error.action} Studio`;
    items.push({ id: "error", icon: "alert-triangle", dot: "red", title, subtitle: label(control.error.message, "Unknown error") });
  }
  if (CAN_CONTROL && !online() && state.connection !== "connecting" && cannotStart()) {
    items.push({ id: "how", icon: "info-circle", title: "Run Studio once with bun run dev", subtitle: cannotStart() });
  }
  return items.length ? [{ id: `${tab}-control`, type: "rows", tab, items }] : [];
}

/** The Keep Studio running switch, on the Studio tab. */
function keeperBlock() {
  if (!CAN_CONTROL || cannotStart()) return null;
  const watching = keeping();
  const paused = keeper.on && keeper.paused;
  const items = [
    {
      id: "keep",
      icon: watching ? "toggle-right" : "toggle-left",
      ...(keeper.gaveUp ? { dot: "red" } : watching ? { dot: "green" } : paused ? { dot: "yellow" } : {}),
      title: "Keep Studio running",
      subtitle: keeper.gaveUp
        ? `Stopped after ${KEEP_GIVE_UP} failed starts. Tap to try again.`
        : paused
          ? "Paused by Stop until the next Start. Tap to resume."
          : watching
            ? "Starts Studio again when it goes down."
            : "Off. Tap to start Studio again when it goes down.",
      trailing: keeper.gaveUp ? "Stopped" : paused ? "Paused" : watching ? "On" : "Off",
      action: { extension: "keep" },
    },
  ];
  return { id: "keeper", type: "rows", tab: "studio", items };
}

/** What became of an outage. */
function outageOutcome(down) {
  const open = down === outage;
  if (down.started) {
    const minutes = Math.round((Date.parse(down.started) - Date.parse(down.at)) / MINUTE);
    return `Started again at ${when(down.started)}${minutes >= 1 ? `, ${plural(minutes, "minute")} later` : ""}.`;
  }
  if (open && control.phase === "starting") return "Starting it again…";
  if (down.gaveUp) return `Starting it failed ${KEEP_GIVE_UP} times: ${down.error}`;
  if (down.error) return `Not started: ${down.error}`;
  return open ? "It starts again shortly." : "It came back without the panel.";
}

/** Each time Keep Studio running found Studio down, newest first; a row opens the logs kept then. */
function outagesBlock() {
  if (!CAN_CONTROL || !keeper.downs.length) return null;
  const recent = keeper.downs.filter((down) => Date.now() - Date.parse(down.at) < 24 * 60 * MINUTE).length;
  return {
    id: "outages",
    type: "rows",
    tab: "studio",
    title: recent ? `Studio was down · ${recent} in 24 h` : "Studio was down",
    show: 3,
    items: keeper.downs
      .slice(-20)
      .reverse()
      .map((down) => {
        const open = { extension: `log-down-${outageStamp(down)}` };
        return {
          id: `down-${outageStamp(down)}`,
          icon: "history",
          ...(down.gaveUp && !down.started ? { dot: "red" } : down === outage ? { dot: "yellow" } : {}),
          title: `Down at ${when(down.at)}`,
          subtitle: label(outageOutcome(down), "Down"),
          ...(down.log ? { action: open, menu: [{ title: "Open the logs kept then", icon: "file-text", action: open }] } : {}),
        };
      }),
  };
}

/** Studio's output and its logs folder. */
function logButtons() {
  const items = [];
  if (studioLog?.path || state.libraryDir) items.push({ title: "Studio's log", icon: "file-text", action: { extension: "log-current" } });
  if (state.libraryDir) items.push({ title: "Logs folder", icon: "folder", action: { extension: "log-folder" } });
  return items.length ? { id: "log-buttons", type: "buttons", tab: "studio", items } : null;
}

/** New commits, Studio's reason when it cannot update now, and Check and Update. */
function updatesBlocks() {
  const updates = state.updates;
  if (!updates) return [];
  const items = [];
  const checked = updates.checkedAt ? `Checked at ${when(updates.checkedAt)}.` : "Not checked yet.";
  const working = ["updating", "restarting", "checking"].includes(updates.phase) || state.checkingUpdates;
  if (updates.phase === "updating" || updates.phase === "restarting") {
    items.push({ id: "update", icon: "loader2", dot: "blue", title: "Updating Studio…", subtitle: "Studio restarts by itself when it is done." });
  } else if (working) {
    items.push({ id: "update", icon: "loader2", title: "Checking for updates…", subtitle: "Studio asks its Git remote." });
  } else if (updates.error) {
    items.push({ id: "update", icon: "alert-triangle", dot: "red", title: "Could not check for updates", subtitle: label(updates.error, "Unknown error") });
  } else if (updates.behind > 0) {
    const commits = updates.commits ?? [];
    items.push({
      id: "update",
      icon: "download",
      dot: "yellow",
      title: updates.channel === "releases" ? `Version ${updates.latestVersion} is available` : plural(updates.behind, "new commit"),
      subtitle: updates.canForceUpdate
        ? "Jobs are in progress. Update anyway interrupts them; Studio resumes them after the restart."
        : label(updates.blocker ?? (updates.canUpdate ? "Update installs it and restarts Studio." : checked), checked),
    });
    commits.forEach((commit, index) =>
      items.push({ id: `commit-${index}`, icon: "git-commit", title: label(commit.title, "Commit"), trailing: String(commit.commit).slice(0, 7) }),
    );
    if (commits.length && updates.behind > commits.length) items.push({ id: "commits-more", icon: "dots", title: `${updates.behind - commits.length} more` });
  } else {
    items.push({ id: "update", icon: "circle-check", dot: "green", title: "Studio is up to date", subtitle: checked });
  }
  const buttons =
    working || control.phase || control.confirm
      ? []
      : [
          ...(updates.canUpdate ? [{ title: "Update and restart", icon: "download", style: "primary", action: { extension: "update" } }] : []),
          // Jobs in progress are Studio's only reason not to update: the tap asks first, with counts.
          ...(updates.canForceUpdate ? [{ title: "Update anyway", icon: "download", action: { extension: "update" } }] : []),
          { title: "Check for updates", icon: "refresh", action: { extension: "update-check" } },
        ];
  return [
    { id: "updates", type: "rows", tab: "studio", title: "Updates", show: 6, items },
    ...(buttons.length ? [{ id: "update-buttons", type: "buttons", tab: "studio", items: buttons }] : []),
  ];
}

/** The newest errors in Studio's log; one with a job opens it. */
function errorsBlock() {
  const errors = state.errors;
  if (!errors) return null;
  const items = errors.length
    ? errors.map((error, index) => ({
        id: `error-${index}`,
        icon: "alert-circle",
        dot: "red",
        title: label(error.message, "Error"),
        subtitle: label(`${error.scope}${error.jobId ? " · opens the job" : ""}`, "Studio"),
        trailing: when(error.createdAt),
        ...(error.jobId ? { action: studioLink({ job: error.jobId }) } : {}),
      }))
    : [{ id: "no-errors", icon: "circle-check", title: "No errors in Studio's log" }];
  return { id: "errors", type: "rows", tab: "studio", title: "Recent errors", show: 3, items };
}

function quotaBlock() {
  const usage = state.status?.chatgptUsage;
  if (usage && usage.state !== "unknown") {
    if (usage.state === "window" && typeof usage.windowPercentLeft === "number") {
      const value = Math.max(0, Math.min(100, Math.round(usage.windowPercentLeft)));
      return { id: "quota", type: "progress", tab: "jobs", title: "ChatGPT", value, max: 100, label: [`${value}% left`, usage.windowLabel].filter(Boolean).join(" · ") };
    }
    const exhausted = usage.state === "exhausted";
    return {
      id: "quota",
      type: "rows",
      tab: "jobs",
      items: [
        {
          id: "quota",
          icon: "message-chatbot",
          dot: exhausted ? "red" : "yellow",
          title: exhausted ? "ChatGPT usage is used up" : "ChatGPT jobs spend credits",
          subtitle: label(usage.summary, exhausted ? "ChatGPT jobs fail until the usage window resets." : "The usage window is used up. Credits cost money."),
        },
      ],
    };
  }
  const legacy = state.chatgpt?.usage;
  if (state.chatgpt?.state !== "ready" || legacy?.unit !== "quota_percent" || typeof legacy.available !== "number") return null;
  const value = Math.max(0, Math.min(100, legacy.available));
  return { id: "quota", type: "progress", tab: "jobs", title: "ChatGPT", value, max: 100, label: `${legacy.display ?? `${value}%`} left` };
}

function activeBlock() {
  const active = state.jobs?.active ?? [];
  if (!active.length) return { id: "active", type: "empty", tab: "jobs", title: "Nothing running", subtitle: "New jobs show here as Studio starts them.", icon: "player-pause" };
  return {
    id: "active",
    type: "rows",
    tab: "jobs",
    title: "In progress",
    show: 8,
    items: active.map((group, index) => {
      const { running = 0, queued = 0, completed = 0 } = group.counts;
      const total = Object.values(group.counts).reduce((sum, count) => sum + count, 0);
      return {
        id: `active-${index}`,
        dot: running ? "green" : "blue",
        title: label(group.promptPreview, "Image job"),
        subtitle: label(group.workspaceName, "Workspace"),
        trailing: [running && `${running} running`, queued && `${queued} queued`, state.api === "summary" && total > 1 && `${completed}/${total} done`].filter(Boolean).join(" · "),
        action: groupLink(group),
      };
    }),
  };
}

function attentionBlock() {
  const items = (state.jobs?.recentFailures ?? []).map((group, index) => ({
    id: `failed-${index}`,
    dot: "red",
    title: label(group.promptPreview, "Image job"),
    subtitle: label(`${group.workspaceName} · ${plural(group.failed, "job")} failed${group.error ? `: ${group.error}` : ""}`, "Failed"),
    trailing: clock(group.updatedAt),
    action: groupLink(group),
  }));
  const review = state.jobs?.counts?.needs_review ?? 0;
  if (review) {
    items.push({
      id: "review",
      dot: "yellow",
      title: `${plural(review, "job")} to review`,
      subtitle: `In ${plural(state.jobs.reviewGroups, "batch", "batches")}. Studio could not confirm their results.`,
      action: studioLink(state.api === "summary" ? { jobs: "review" } : {}),
    });
  }
  const long = state.jobs?.longRunning;
  if (long?.count) {
    items.push({
      id: "long-running",
      icon: "hourglass",
      dot: "yellow",
      title: `${plural(long.count, "job")} running with no update for 30 min`,
      subtitle: `The quietest since ${when(long.since)}. Studio may have lost it.`,
      action: studioLink({ job: long.jobId }),
    });
  }
  if (!items.length) return null;
  return { id: "attention", type: "rows", tab: "jobs", title: "Needs attention", show: 6, items };
}

/** Buttons to the jobs stuck in review or running too long, through Studio's links (after 0.2.0). */
function stuckButtons() {
  if (state.api !== "summary") return null;
  const review = state.jobs?.counts?.needs_review ?? 0;
  const long = state.jobs?.longRunning;
  const items = [
    ...(review ? [{ title: `Review ${review.toLocaleString("en-US")}`, icon: "eye-check", action: studioLink({ jobs: "review" }) }] : []),
    ...(long?.count ? [{ title: "Open the stuck job", icon: "hourglass", action: studioLink({ job: long.jobId }) }] : []),
  ];
  return items.length ? { id: "stuck-buttons", type: "buttons", tab: "jobs", items } : null;
}

function libraryBlocks() {
  const unorganized = state.status?.unorganized;
  if (!unorganized) return [{ id: "library", type: "empty", tab: "library", title: "Reading the Library…", icon: "loader2" }];
  if (!unorganized.total) return [{ id: "library", type: "empty", tab: "library", title: "Every image is organized", subtitle: "Each one has tags or a collection.", icon: "circle-check" }];
  const project = state.status.projectPath;
  return [
    {
      id: "library",
      type: "rows",
      tab: "library",
      title: `${plural(unorganized.total, "image")} without tags or collection`,
      show: 10,
      items: [...unorganized.workspaces]
        .sort((left, right) => right.count - left.count)
        .slice(0, 100)
        .map((workspace, index) => ({
          id: `ws-${index}`,
          icon: "folder",
          title: label(workspace.name, "Workspace"),
          trailing: workspace.count.toLocaleString("en-US"),
          action: studioLink({ workspace: workspace.id, unorganized: "true" }),
          menu: [
            { title: "Open in Studio", icon: "external-link", action: studioLink({ workspace: workspace.id, unorganized: "true" }) },
            ...(project && state.agentsGranted
              ? [
                  {
                    title: "Organize with an agent",
                    icon: "sparkles",
                    action: {
                      newAgent: {
                        project,
                        draft: `Use the cozy-studio-mcp skill to organize the Cozy Studio workspace "${workspace.name}" (id ${workspace.id}). It has ${workspace.count} images with no tags or collection. Look at them, propose one scheme of tags and collections, and apply it only after I confirm.`,
                      },
                    },
                  },
                ]
              : []),
          ],
        })),
    },
    {
      id: "library-hint",
      type: "text",
      tab: "library",
      text: !project
        ? "Click a workspace to see its unorganized images in Studio."
        : state.agentsGranted
          ? "Click a workspace to see its unorganized images in Studio. Its menu can start an agent with an organize prompt ready to send."
          : "Click a workspace to see its unorganized images in Studio. To start an agent that organizes one from its menu, allow Cozy Studio to start agents (agents.start) in Settings > Extensions.",
    },
  ];
}

/** What each Agent access level lets agents do in Studio. */
const ACCESS_HINTS = {
  read: "Agents read Studio and change nothing.",
  organize: "Agents also tag and collect images.",
  write: "Agents also generate, import and change settings.",
};
const GB = 1024 ** 3;
/** Free space below which the disk row turns yellow, then red. */
const SHORT_DISK = 10 * GB;
const LOW_DISK = 2 * GB;
const bytes = (count) =>
  count >= 1024 * GB
    ? `${(count / 1024 / GB).toFixed(1)} TB`
    : count >= GB
      ? `${(count / GB).toFixed(count >= 100 * GB ? 0 : 1)} GB`
      : count >= 1024 ** 2
        ? `${(count / 1024 ** 2).toFixed(count >= 10 * 1024 ** 2 ? 0 : 1)} MB`
        : `${Math.max(1, Math.round(count / 1024))} KB`;

function studioBlock() {
  const status = state.status;
  if (!status) return { id: "health", type: "empty", tab: "studio", title: "Reading Studio…", icon: "loader2" };
  const updateText =
    status.behind > 0
      ? status.channel === "releases"
        ? `Version ${status.latestVersion} is available`
        : `${plural(status.behind, "commit")} behind`
      : "Up to date";
  const items = [
    {
      id: "version",
      icon: "icon.svg",
      dot: status.behind > 0 ? "yellow" : "green",
      title: `Studio ${status.version ?? ""}`.trim(),
      subtitle: status.behind > 0 ? `${updateText}. See Updates below.` : updateText,
      action: studioLink(),
    },
    {
      id: "access",
      icon: "robot",
      title: "Agent access",
      ...(ACCESS_HINTS[status.access] ? { subtitle: ACCESS_HINTS[status.access] } : {}),
      trailing: label(status.accessLabel, "Unknown"),
    },
  ];
  const storage = state.storage;
  if (storage) {
    const free = storage.libraryFreeBytes;
    const low = free < LOW_DISK ? "red" : free < SHORT_DISK ? "yellow" : null;
    const database = `Database ${bytes(storage.databaseBytes)}${storage.schemaVersion ? ` · schema v${storage.schemaVersion}` : ""}`;
    items.push({
      id: "disk",
      icon: "database",
      ...(low ? { dot: low } : {}),
      title: `${bytes(free)} free on the Library's disk`,
      subtitle: low ? `Nearly full. ${database}` : database,
      trailing: `of ${bytes(storage.libraryTotalBytes)}`,
    });
  }
  const usage = status.chatgptUsage;
  if (usage) {
    items.push({
      id: "chatgpt",
      icon: "message-chatbot",
      dot: usage.state === "window" ? "green" : usage.state === "exhausted" ? "red" : "yellow",
      title: "ChatGPT",
      subtitle: label(usage.summary, usage.state === "unknown" ? "Studio cannot read the usage" : "Signed in"),
    });
  } else if (state.chatgpt) {
    items.push({
      id: "chatgpt",
      icon: "message-chatbot",
      dot: state.chatgpt.state === "ready" ? "green" : "yellow",
      title: "ChatGPT",
      subtitle: label(state.chatgpt.authLabel, "Not signed in"),
      trailing: state.chatgpt.usage?.display ? `${state.chatgpt.usage.display} left` : undefined,
    });
  }
  if (status.libraryWritable === false) {
    items.push({ id: "library", icon: "alert-triangle", dot: "red", title: "Library folder", subtitle: "Studio cannot write to it." });
  }
  if (state.syncedAt) {
    items.push({
      id: "synced",
      icon: "refresh",
      title: "Live",
      subtitle:
        state.api === "summary"
          ? `Jobs read at ${clock(state.syncedAt.toISOString())}, again when Studio reports a change.`
          : `Jobs snapshot at ${clock(state.syncedAt.toISOString())}, then Studio's events.`,
    });
  }
  return { id: "health", type: "rows", tab: "studio", items };
}

const PROVIDERS = {
  codex: "Codex",
  chatgpt: "ChatGPT",
  grok: "Grok",
  google: "Google",
  antigravity: "Antigravity",
  fal: "fal",
  openai: "OpenAI",
  replicate: "Replicate",
  comfy: "ComfyUI",
  dry_run: "Dry run",
};

function workersBlock() {
  const workers = state.workers;
  if (!workers) return null;
  const waiting = new Map();
  for (const job of workers.waiting) waiting.set(job.providerId, (waiting.get(job.providerId) ?? 0) + 1);
  const items = [
    {
      id: "workers",
      icon: "cpu",
      dot: workers.stopping ? "yellow" : workers.active ? "green" : "gray",
      title: workers.active ? `${workers.active} of ${plural(workers.max, "worker")} busy` : `Idle · ${plural(workers.max, "worker")}`,
      subtitle: workers.stopping ? "Studio is stopping. Queued jobs wait for its next start." : workers.queued ? `${workers.queued} queued` : "Nothing queued",
    },
  ];
  const busy = (id) => workers.activeByProvider[id] ?? 0;
  const providers = [...new Set([...Object.keys(workers.activeByProvider), ...waiting.keys()])].sort((left, right) => busy(right) - busy(left));
  for (const id of providers) {
    const limit = workers.limits[id];
    items.push({
      id: `provider-${id}`,
      dot: busy(id) ? "green" : "blue",
      title: PROVIDERS[id] ?? label(id, "Provider"),
      trailing: [limit ? `${busy(id)}/${limit}` : `${busy(id)} busy`, waiting.get(id) && `${waiting.get(id)} waiting`].filter(Boolean).join(" · "),
    });
  }
  if (workers.hold) {
    items.push({
      id: "hold",
      icon: "player-pause",
      dot: "yellow",
      title: "Provider dispatch is on hold",
      subtitle: "Jobs Studio found at startup wait. New jobs run.",
    });
  }
  if (workers.appServer) {
    items.push({
      id: "app-server",
      icon: "alert-triangle",
      dot: "yellow",
      title: "Codex app-server is running",
      subtitle: `Jobs it runs spend Codex usage.${workers.appServer.pid ? ` PID ${workers.appServer.pid}.` : ""}`,
    });
  }
  return { id: "workers", type: "rows", tab: "studio", title: "Workers", items };
}

/** Open and Refresh on every tab; the Studio tab adds Restart and Stop, or Start while Studio is down. */
const buttons = (tab) => {
  const controls = tab === "studio" || !online() ? controlButtons() : [];
  const open = online() ? [{ title: "Open Studio", icon: "external-link", style: "primary", action: studioLink() }] : [];
  return { id: `${tab}-buttons`, type: "buttons", tab, items: [...open, ...controls, { title: "Refresh", icon: "refresh", action: { extension: "refresh" } }] };
};

function documentFor() {
  const tabs = [
    { id: "jobs", title: "Jobs", icon: "photo" },
    { id: "library", title: "Library", icon: "books" },
    { id: "studio", title: "Studio", icon: "heart-rate-monitor" },
  ];
  const tabIds = tabs.map((tab) => tab.id);
  let blocks;
  if (state.connection === "offline" || state.connection === "connecting") {
    const offline = state.connection === "offline";
    const notice = (tab) => ({
      id: `${tab}-notice`,
      type: "empty",
      tab,
      title: offline ? "Cozy Studio is not running" : "Connecting to Cozy Studio…",
      subtitle: offline ? `Nothing answers at ${studio}.` : `Reading ${studio}`,
      icon: offline ? "plug-connected-x" : "loader2",
    });
    const studioExtras = () => [keeperBlock(), outagesBlock(), logButtons()];
    blocks = [
      summaryBlock(),
      ...tabIds.flatMap((tab) => [...controlBlocks(tab), notice(tab), ...(tab === "studio" ? studioExtras() : []), ...(offline ? [buttons(tab)] : [])]),
    ].filter(Boolean);
  } else if (state.accessOff) {
    const notice = (tab) => ({
      id: `${tab}-notice`,
      type: "empty",
      tab,
      title: "Turn on Agent access in Studio",
      subtitle: "Studio Settings > Advanced & maintenance > Agent access. Read only is enough.",
      icon: "lock",
      action: studioLink(),
    });
    blocks = [summaryBlock(), ...tabIds.flatMap((tab) => [...controlBlocks(tab), notice(tab)]), keeperBlock(), outagesBlock(), logButtons(), buttons("studio")].filter(Boolean);
  } else {
    blocks = [
      summaryBlock(),
      ...controlBlocks("jobs"),
      quotaBlock(),
      activeBlock(),
      attentionBlock(),
      stuckButtons(),
      buttons("jobs"),
      ...controlBlocks("library"),
      ...libraryBlocks(),
      ...controlBlocks("studio"),
      studioBlock(),
      ...updatesBlocks(),
      workersBlock(),
      keeperBlock(),
      outagesBlock(),
      errorsBlock(),
      logButtons(),
      buttons("studio"),
    ].filter(Boolean);
  }
  return { schema: 1, title: "Cozy Studio", tabs, blocks };
}

// ---------------------------------------------------------------------------------------------
// Ghostex

let rendering = null;
let renderAgain = false;
/** The last document each surface accepted, so a read that changed nothing writes nothing. */
const written = new Map();

/** Writes the panel to the sidebar and the side panel, at most once a second. */
function render() {
  if (rendering) {
    renderAgain = true;
    return;
  }
  rendering = (async () => {
    const body = JSON.stringify({ document: documentFor() });
    for (const query of ["", "?surface=sidePanel"]) {
      if (written.get(query) === body) continue;
      // A write that never answers would hold every later render, so it gives up after 10 s.
      const response = await fetch(`${api}/panel${query}`, { method: "PUT", headers: ghostexHeaders, body, signal: AbortSignal.timeout(10 * SECOND) });
      const answer = await response.json().catch(() => ({}));
      if (answer.ok) {
        written.set(query, body);
        continue;
      }
      if (state.agentsGranted && /agents\.start/.test(answer.message ?? "")) {
        console.error("Ghostex refused the panel because agents.start is not granted; drawing it without the agent action.");
        state.agentsGranted = false;
        renderAgain = true;
        return;
      }
      console.error(`PUT panel${query}: ${answer.message ?? response.status}`);
    }
  })()
    .catch((error) => console.error(`panel: ${error.message}`))
    .finally(() => {
      setTimeout(() => {
        rendering = null;
        if (renderAgain) {
          renderAgain = false;
          render();
        }
      }, SECOND);
    });
}

// ---------------------------------------------------------------------------------------------
// Ghostex
//
// The server exits when the Ghostex that started it goes away, so a Ghostex restart or update
// leaves no server behind. Ghostex runs the command through a shell (on Windows gxserver.exe ->
// pwsh.exe -> node), and that shell can outlive Ghostex, so the server watches its parent and each
// ancestor up to the first one that is not a shell. Until that walk is done it watches its parent.

const SHELL = /^(pwsh|powershell|cmd|sh|bash|zsh|dash|fish)(\.exe)?$/i;
const GHOSTEX_EVERY = 5 * SECOND;
/** The parent first, Ghostex last. */
let ghostexPids = [process.ppid];
/** Settles when the walk up to Ghostex is done, so keeper.lock names Ghostex and not the shell. */
let ghostexFound = null;

const ANCESTORS = `
$id = [int]$env:CZ_PID
$chain = @()
for ($i = 0; $i -lt 8; $i++) {
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$id"
  if (-not $p) { break }
  $chain += @{ pid = [int]$p.ProcessId; name = [string]$p.Name }
  $id = [int]$p.ParentProcessId
}
ConvertTo-Json @($chain) -Compress
`;

/** The process and its ancestors, nearest first: [{ pid, name }]. */
async function ancestors(pid) {
  if (process.platform === "win32") return JSON.parse((await powershell(ANCESTORS, { CZ_PID: String(pid) })).trim() || "[]");
  const chain = [];
  for (let id = pid; id > 1 && chain.length < 8; ) {
    const [parent, ...name] = (await execText("ps", ["-o", "ppid=,comm=", "-p", String(id)])).trim().split(/\s+/);
    chain.push({ pid: id, name: name.join(" ").split("/").at(-1).replace(/^-/, "") });
    id = Number(parent);
  }
  return chain;
}

async function watchGhostex() {
  setInterval(() => {
    const gone = ghostexPids.find((pid) => !alive(pid)) ?? (process.platform !== "win32" && process.ppid !== ghostexPids[0] ? ghostexPids[0] : null);
    if (gone == null) return;
    console.error(`Ghostex (process ${gone}) is gone; this server exits.`);
    process.exit(0);
  }, GHOSTEX_EVERY).unref();
  try {
    const chain = await ancestors(process.ppid);
    const ghostex = chain.findIndex((item) => !SHELL.test(item.name));
    if (ghostex >= 0) ghostexPids = chain.slice(0, ghostex + 1).map((item) => item.pid);
  } catch (error) {
    console.error(`Could not find Ghostex's process, watching only the parent: ${error.message}`);
  }
}

createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200).end();
    return;
  }
  // gxserver's copy of a tap on an extension action, signed with this extension's own token.
  if (request.method === "POST" && request.url === "/ghostex/panel-action") {
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401).end();
      return;
    }
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      response.writeHead(204).end();
      let event = {};
      try {
        event = JSON.parse(body || "{}");
      } catch {}
      if (event.name === "refresh") refreshAll();
      else if (event.name === "keep") onKeep();
      else if (event.name === "update-check") checkUpdates();
      else if (/^log-/.test(event.name ?? "")) onLog(event.name);
      else onControl(event.name);
    });
    return;
  }
  response.writeHead(404).end();
}).listen(port, "127.0.0.1", () => {
  ghostexFound = watchGhostex();
  render();
  run("jobs");
  run("status");
  run("workers");
  run("updates");
  run("errors");
  keepWatching(10 * SECOND);
});
