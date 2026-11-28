// Run: one build/run job at a time for a Flutter or Gradle project, its output ring buffer, Stop,
// Flutter hot reload/restart, and Flutter SDK installs. Project shapes and toolchain come from
// project.mjs; this file only spawns processes and translates their output into job state.
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { androidSdk, listDevices, run } from "./android.mjs";
import { acquire, release as freeLock, projectOf } from "./device-lock.mjs";
import { shutdownIfOn } from "./idle-shutdown.mjs";
import { detectProject, findOnPath, listVariants, rememberProject, toolchain } from "./project.mjs";

const MAX_LINES = 5000;
const TERMINAL = new Set(["stopped", "failed"]);
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
const KILL_AFTER = 5000; // SIGKILL a stopped process group that ignored SIGTERM
const STOP_WAIT = 12000; // long enough for the two kill stages above

let current = null; // the last job, kept after it ends so the view can show how it ended
let lines = [];
let lastSeq = 0;
let nextJobId = 1;
let queue = Promise.resolve();

// Jobs run in their own process groups, so they would outlive the server: end the current one with it.
process.on("exit", () => current && killGroup(current, "SIGTERM"));
for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) process.once(sig, () => process.exit(0));

/** start/stop/reload/build requests arrive from an HTTP server that handles them concurrently. */
function serialize(task) {
  const result = queue.then(task, task);
  queue = result.then(() => {}, () => {});
  return result;
}

const stripAnsi = (text) => String(text).replace(ANSI, "");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(job, stream, text) {
  if (job !== current) return; // a replaced job's late output must not land in the new job's log
  lines.push({ seq: ++lastSeq, stream, text: stripAnsi(text) });
  if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
}

function setPhase(job, phase, message) {
  if (TERMINAL.has(job.phase)) return; // late events must not revive a finished job
  job.phase = phase;
  if (message) log(job, "info", message);
}

function jobView(job) {
  if (!job) return null;
  return {
    id: job.id,
    kind: job.kind,
    path: job.path,
    serial: job.serial,
    label: job.label,
    phase: job.phase,
    error: job.error,
    startedAt: job.startedAt,
    canReload: job.kind === "flutter" && job.mode === "debug" && job.phase === "running",
  };
}

function createJob(fields) {
  lines = []; // a new job starts a new log; sequence numbers keep counting so old `since` values still work
  const job = {
    id: nextJobId++,
    kind: fields.kind,
    path: fields.path,
    serial: fields.serial,
    label: fields.label,
    phase: fields.phase,
    error: null,
    startedAt: new Date().toISOString(),
    mode: fields.mode ?? null,
    appId: null,
    child: null,
    stdin: null,
    stopping: false,
    pending: new Map(),
    requestId: 0,
    killTimers: new Set(),
    lock: null,
    done: null,
    resolveDone: null,
  };
  job.done = new Promise((resolve) => (job.resolveDone = resolve));
  current = job;
  return job;
}

/** Ends a job once: rejects pending Flutter requests, drops timers and resolves stopRun's wait. */
function finish(job, phase, { error = null, message } = {}) {
  if (TERMINAL.has(job.phase)) return;
  if (job.lock) {
    clearInterval(job.lock.beat);
    const { dataDir, owner } = job.lock;
    shutdownIfOn(dataDir).then((shutdown) => freeLock(dataDir, owner, job.serial, shutdown)).catch(() => {});
  }
  job.error = error;
  setPhase(job, phase, message);
  const pending = [...job.pending.values()];
  job.pending.clear();
  for (const request of pending) {
    clearTimeout(request.timer);
    request.reject(new Error("Run ended"));
  }
  // Kill timers stay: if Flutter reported app.stop but its process is still alive, they still reap it.
  if (isAlive(job.child)) {
    killLater(job, KILL_AFTER, "SIGTERM");
    killLater(job, KILL_AFTER * 2, "SIGKILL");
  }
  try {
    job.stdin?.end();
  } catch {
    // already closed
  }
  job.stdin = null;
  job.resolveDone?.();
}

function fail(job, message) {
  finish(job, "failed", { error: message, message: `Failed: ${message}` });
}

function stopped(job, message = "Stopped.") {
  finish(job, "stopped", { message });
}

function isAlive(child) {
  return Boolean(child?.pid) && child.exitCode === null && child.signalCode === null;
}

function killGroup(job, signal) {
  const child = job.child;
  if (!isAlive(child)) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // already gone
    }
  }
}

function killLater(job, delayMs, signal) {
  const timer = setTimeout(() => {
    job.killTimers.delete(timer);
    killGroup(job, signal);
  }, delayMs);
  timer.unref?.();
  job.killTimers.add(timer);
}

/**
 * Spawns one step of a job in its own process group and resolves when it has exited and its output
 * has been read. `onStdout`/`onStderr` replace the default line logging.
 */
function spawnStep(job, command, args, { cwd, env, stdin = false, onStdout, onStderr, label } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, {
        cwd,
        env,
        detached: true,
        stdio: [stdin ? "pipe" : "ignore", "pipe", "pipe"],
      });
    } catch (error) {
      log(job, "err", `Could not run ${label ?? command}: ${error.message}`);
      resolve({ code: null, signal: null, failedToStart: true });
      return;
    }
    job.child = child;
    if (stdin) {
      job.stdin = child.stdin;
      child.stdin.on("error", () => {}); // EPIPE when Flutter exits mid-request
    }
    const stdout = createInterface({ input: child.stdout, crlfDelay: Infinity });
    const stderr = createInterface({ input: child.stderr, crlfDelay: Infinity });
    stdout.on("line", (line) => (onStdout ? onStdout(line) : log(job, "out", line)));
    stderr.on("line", (line) => (onStderr ? onStderr(line) : log(job, "err", line)));

    let settled = false;
    const settle = (result) => {
      if (settled) return;
      settled = true;
      if (job.child === child) {
        job.child = null;
        job.stdin = null;
      }
      stdout.close();
      stderr.close();
      resolve(result);
    };
    child.on("error", (error) => {
      log(job, "err", `Could not run ${label ?? command}: ${error.message}`);
      if (!child.pid) settle({ code: null, signal: null, failedToStart: true });
    });
    // "close" (not "exit") so the last lines of output are in the buffer before the job moves on.
    child.on("close", (code, signal) => settle({ code, signal, failedToStart: false }));
  });
}

async function forceStopApp(job) {
  if (!job.appId || !job.serial) return;
  const { adb } = await androidSdk();
  if (!adb) return;
  await run(adb, ["-s", job.serial, "shell", "am", "force-stop", job.appId]);
}

async function waitForPid(job, serial, appId) {
  const { adb } = await androidSdk();
  if (!adb) return null;
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline && !job.stopping) {
    const result = await run(adb, ["-s", serial, "shell", "pidof", appId]);
    const pid = result.stdout.split(/\s+/).filter(Boolean)[0];
    if (result.ok && pid) return pid;
    await delay(500);
  }
  return null;
}

/**
 * Takes the device lock for this job's project, logging "Waiting for <project>…" while another project holds it.
 * Keeps it fresh while building and launching; a running app lets it go stale after 3 minutes, like an agent's.
 * Returns false when the job was stopped or the wait timed out (the job is then ended).
 */
async function holdDevice(job, owner, dataDir) {
  const lock = { dataDir, owner, beat: null };
  const touch = () => acquire(dataDir, job.serial, owner, { wait: 0 }).catch(() => {});
  try {
    const held = await acquire(dataDir, job.serial, owner, {
      cancelled: () => job.stopping,
      onWait: (other) => log(job, "info", `Waiting for ${other.project.name} to finish on ${job.serial}.`),
    });
    if (!held) return stopped(job), false;
  } catch (error) {
    return fail(job, error.message), false;
  }
  if (TERMINAL.has(job.phase)) return freeLock(dataDir, owner, job.serial).catch(() => {}), false; // stopped while acquiring
  job.lock = lock;
  lock.beat = setInterval(() => ["building", "launching"].includes(job.phase) && touch(), 60000);
  lock.beat.unref?.();
  lock.touch = touch;
  return true;
}

// ---- Gradle -----------------------------------------------------------------

async function runGradle(job, project, tools, variant, serial) {
  setPhase(job, "building", `Building ${variant.name} with Gradle (${variant.installTask}).`);
  const build = await spawnStep(job, "sh", ["gradlew", "--console=plain", variant.installTask], {
    cwd: project.path,
    env: { ...tools.env, ANDROID_SERIAL: serial },
  });
  if (job.stopping) return stopped(job);
  if (build.failedToStart) return fail(job, "Gradle could not start");
  if (build.code !== 0) return fail(job, `Gradle failed (exit ${build.code})`);
  await launchAndroid(job, variant.applicationId, serial);
}

async function launchAndroid(job, appId, serial) {
  const { adb } = await androidSdk();
  if (!adb) return fail(job, "adb not found");
  job.appId = appId;
  setPhase(job, "launching", `Launching ${appId} on ${serial}.`);
  await run(adb, ["-s", serial, "shell", "am", "force-stop", appId]);
  if (job.stopping) {
    await forceStopApp(job);
    return stopped(job);
  }
  const monkey = await run(adb, ["-s", serial, "shell", "monkey", "-p", appId, "-c", "android.intent.category.LAUNCHER", "1"]);
  if (job.stopping) {
    await forceStopApp(job);
    return stopped(job);
  }
  if (!`${monkey.stdout}\n${monkey.stderr}`.includes("Events injected: 1")) {
    return fail(job, `${appId} has no launcher activity`);
  }
  setPhase(job, "running", `${appId} is running.`);

  const pid = await waitForPid(job, serial, appId);
  if (job.stopping) {
    await forceStopApp(job);
    return stopped(job);
  }
  if (!pid) return fail(job, `${appId} did not start (no pid after 10 s)`);

  log(job, "info", `Logcat for pid ${pid}.`);
  await spawnStep(job, adb, ["-s", serial, "logcat", "-v", "time", `--pid=${pid}`], {});
  if (job.stopping) return stopped(job);
  if (!TERMINAL.has(job.phase)) {
    log(job, "info", "App process ended");
    stopped(job);
  }
}

// ---- Flutter ----------------------------------------------------------------

async function runFlutter(job, project, tools, settings, serial) {
  const args = ["run", "--machine", "-d", serial];
  if (settings.flavor) args.push("--flavor", settings.flavor);
  args.push(`--${settings.mode}`);
  if (settings.target) args.push("-t", settings.target);
  args.push(...settings.args);
  const flavor = settings.flavor ? `, flavor ${settings.flavor}` : "";
  setPhase(job, "building", `Starting Flutter (${settings.mode}${flavor}) on ${serial}.`);
  const result = await spawnStep(job, tools.flutter, args, {
    cwd: project.path,
    env: tools.env,
    stdin: true,
    label: "Flutter",
    onStdout: (line) => handleFlutterLine(job, line),
    onStderr: (line) => log(job, "err", line),
  });
  if (job.stopping) return stopped(job);
  if (!TERMINAL.has(job.phase)) {
    if (result.failedToStart) return fail(job, "Flutter could not start");
    const exit = result.code ?? result.signal ?? "unknown";
    fail(job, `Flutter exited (${exit})`);
  }
}

function handleFlutterLine(job, line) {
  const text = stripAnsi(line);
  if (!text.startsWith("[{")) {
    log(job, "out", text);
    return;
  }
  let events;
  try {
    events = JSON.parse(text);
  } catch {
    log(job, "out", text);
    return;
  }
  if (!Array.isArray(events)) {
    log(job, "out", text);
    return;
  }
  for (const event of events) handleFlutterEvent(job, event);
}

function handleFlutterEvent(job, event) {
  if (!event || typeof event !== "object") return;
  if (event.id !== undefined && event.event === undefined) {
    const id = Number(event.id);
    const request = job.pending.get(id);
    if (!request) return;
    job.pending.delete(id);
    clearTimeout(request.timer);
    if (event.error) {
      request.reject(new Error(event.error.message ?? String(event.error)));
    } else {
      const result = event.result;
      if (result && typeof result.code === "number" && result.code !== 0) {
        request.reject(new Error(result.message ?? `Flutter request failed (${result.code})`));
      } else {
        request.resolve(result);
      }
    }
    return;
  }

  const params = event.params ?? {};
  switch (event.event) {
    case "app.start":
      if (params.appId) job.appId = params.appId;
      setPhase(job, "launching", "Launching the app.");
      break;
    case "app.started":
      setPhase(job, "running", "App started.");
      break;
    case "app.progress":
      if (params.message) log(job, "info", params.message);
      break;
    case "app.log":
      if (params.log !== undefined && params.log !== null) log(job, params.error ? "err" : "out", params.log);
      break;
    case "daemon.logMessage":
      if (params.message) log(job, params.level === "error" ? "err" : "out", params.message);
      break;
    case "app.stop":
      if (params.error) fail(job, String(params.error));
      else stopped(job, "App stopped.");
      break;
    default:
      break;
  }
}

function sendRequest(job, method, params) {
  return new Promise((resolve, reject) => {
    if (!job.stdin || job.stdin.destroyed || !job.stdin.writable) {
      reject(new Error("Flutter is not running"));
      return;
    }
    const id = ++job.requestId;
    const timer = setTimeout(() => {
      job.pending.delete(id);
      reject(new Error(`Flutter ${method} timed out`));
    }, 30000);
    timer.unref?.();
    job.pending.set(id, { resolve, reject, timer });
    job.stdin.write(`${JSON.stringify([{ id, method, params }])}\n`, (error) => {
      if (!error) return;
      const request = job.pending.get(id);
      if (!request) return;
      job.pending.delete(id);
      clearTimeout(timer);
      reject(new Error(`Could not talk to Flutter: ${error.message}`));
    });
  });
}

// ---- Flutter SDK install ----------------------------------------------------

async function runInstall(job, fvm, version) {
  log(job, "info", `Installing Flutter ${version} with fvm.`);
  const env = {
    ...process.env,
    PATH: [dirname(fvm), ...(process.env.PATH ?? "").split(":").filter(Boolean)].join(":"),
  };
  const result = await spawnStep(job, fvm, ["install", version], { cwd: homedir(), env, label: "fvm" });
  if (job.stopping) return stopped(job);
  if (result.failedToStart) return fail(job, "fvm could not start");
  if (result.code !== 0) return fail(job, `fvm install failed (exit ${result.code})`);
  finish(job, "stopped", { message: `Flutter ${version} installed.` });
}

// ---- public API -------------------------------------------------------------

async function startRunLocked(body, dataDir) {
  const serial = typeof body?.serial === "string" ? body.serial.trim() : "";
  if (!serial) throw new Error("Pick a device first");
  const devices = await listDevices();
  if (!devices.some((device) => device.serial === serial && device.state === "device")) {
    throw new Error(`Device ${serial} is not connected`);
  }

  const project = await detectProject(body?.path);
  let variant = null;
  let settings = null;
  let selection = null;
  let label = null;

  if (project.type === "gradle") {
    if (!body?.gradle || typeof body.gradle.installTask !== "string") {
      throw new Error("An Android Gradle project needs gradle.installTask");
    }
    // The list the view was shown (stale is fine): a changed build file must not run Gradle in this lock.
    const variants = await listVariants(project, dataDir, { stale: true });
    variant = variants.variants.find((entry) => entry.installTask === body.gradle.installTask);
    if (!variant) throw new Error(`Unknown install task ${body.gradle.installTask}`);
    selection = { installTask: variant.installTask };
    label = `${variant.name} on ${serial}`;
  } else {
    if (!body?.flutter || typeof body.flutter !== "object") {
      throw new Error("A Flutter project needs flutter settings");
    }
    const flutter = body.flutter;
    const variants = await listVariants(project, dataDir);
    const flavor = flutter.flavor ?? null;
    if (flavor === null) {
      if (variants.flavors.length) throw new Error(`Pick a Flutter flavor: ${variants.flavors.join(", ")}`);
    } else if (!variants.flavors.includes(flavor)) {
      throw new Error(`Unknown Flutter flavor ${flavor}`);
    }
    if (!variants.modes.includes(flutter.mode)) throw new Error(`Unknown Flutter mode ${flutter.mode}`);
    const target = flutter.target ?? null;
    if (target !== null && !variants.targets.includes(target)) throw new Error(`Unknown Flutter target ${target}`);
    if (flutter.args !== undefined && (!Array.isArray(flutter.args) || flutter.args.some((arg) => typeof arg !== "string"))) {
      throw new Error("Flutter args must be a list of strings");
    }
    const sdk = project.flutterSdk;
    if (sdk?.pinned && !sdk.installed) {
      throw new Error(`Flutter ${sdk.pinned} is not installed. Use Install Flutter ${sdk.pinned} in the Run panel first.`);
    }
    if (sdk && !sdk.bin) throw new Error("No Flutter SDK found. Install Flutter or check the fvm cache.");
    settings = { flavor, mode: flutter.mode, target, args: flutter.args ?? [] };
    selection = { ...settings };
    label = `Flutter ${settings.mode}${settings.flavor ? ` ${settings.flavor}` : ""} on ${serial}`;
  }

  const tools = await toolchain(project);
  if (project.type === "flutter" && !tools.flutter) {
    const pinned = project.flutterSdk?.pinned;
    throw new Error(pinned ? `Flutter ${pinned} is not installed. Install it from the Run panel first.` : "No Flutter SDK found. Install Flutter or run fvm install stable.");
  }

  await stopRunLocked();

  const job = createJob({
    kind: project.type,
    path: project.path,
    serial,
    label,
    phase: "building",
    mode: settings?.mode ?? null,
  });

  for (const note of tools.notes) log(job, "info", note);
  await rememberProject(dataDir, project, selection);

  const owner = await projectOf(project.path);
  const flow = holdDevice(job, owner, dataDir).then((held) => {
    if (!held) return;
    return project.type === "gradle" ? runGradle(job, project, tools, variant, serial) : runFlutter(job, project, tools, settings, serial);
  });
  flow.catch((error) => {
    if (TERMINAL.has(job.phase)) log(job, "err", error?.message ?? String(error));
    else fail(job, error?.message ?? String(error));
  });

  return { ok: true, job: jobView(job) };
}

async function stopRunLocked() {
  const job = current;
  if (!job || TERMINAL.has(job.phase)) return;
  if (!job.stopping) {
    job.stopping = true;
    setPhase(job, "stopping", "Stopping.");
    if (job.kind === "flutter") {
      if (job.appId) {
        sendRequest(job, "app.stop", { appId: job.appId }).catch(() => {});
        killLater(job, KILL_AFTER, "SIGTERM");
        killLater(job, KILL_AFTER * 2, "SIGKILL");
      } else {
        killGroup(job, "SIGTERM");
        killLater(job, KILL_AFTER, "SIGKILL");
      }
    } else {
      if (job.kind === "gradle" && job.appId) await forceStopApp(job);
      killGroup(job, "SIGTERM");
      killLater(job, KILL_AFTER, "SIGKILL");
    }
  }
  await Promise.race([job.done, delay(STOP_WAIT)]);
}

async function reloadRunLocked(full) {
  const job = current;
  if (!job || job.kind !== "flutter" || job.mode !== "debug" || job.phase !== "running") {
    throw new Error("Hot reload is only available while a Flutter app runs in debug mode");
  }
  if (!job.appId) throw new Error("No Flutter app to reload yet");
  job.lock?.touch();
  await sendRequest(job, "app.restart", {
    appId: job.appId,
    fullRestart: Boolean(full),
    pause: false,
    reason: "manual",
  });
  log(job, "info", full ? "Hot restart requested." : "Hot reload requested.");
}

async function installFlutterLocked(version) {
  const wanted = typeof version === "string" ? version.trim() : "";
  if (!/^[A-Za-z0-9][\w.@+-]*$/.test(wanted)) throw new Error("Missing or invalid Flutter version");
  const fvm = await findOnPath("fvm", ["/opt/homebrew/bin", "/usr/local/bin", join(homedir(), "fvm", "bin")]);
  if (!fvm) throw new Error("fvm not found. Install fvm (brew install fvm) to install Flutter versions.");

  await stopRunLocked();
  const job = createJob({
    kind: "install",
    path: null,
    serial: null,
    label: `Install Flutter ${wanted}`,
    phase: "running",
  });
  runInstall(job, fvm, wanted).catch((error) => {
    if (TERMINAL.has(job.phase)) log(job, "err", error?.message ?? String(error));
    else fail(job, error?.message ?? String(error));
  });
  return { ok: true, job: jobView(job) };
}

export function startRun(body, dataDir) {
  return serialize(() => startRunLocked(body, dataDir));
}

/** The device a Run job is still using, if any (the idle sweep leaves it alone). */
export const runningSerial = () => (current && !TERMINAL.has(current.phase) ? current.serial : null);

export function stopRun() {
  return serialize(stopRunLocked);
}

export function reloadRun(full) {
  return serialize(() => reloadRunLocked(full));
}

export function installFlutter(version) {
  return serialize(() => installFlutterLocked(version));
}

export function runState(since = 0) {
  const after = Number(since) || 0;
  return {
    job: jobView(current),
    lines: lines.filter((line) => line.seq > after),
    next: lastSeq,
  };
}
