// Mobile Pane server: serves the viewer, lists devices and streams scrcpy H.264 over WebSocket.
// Also serves the capability probe (/probe.html) for checking other machines.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { acceptWebSocket } from "./ws.mjs";
import { androidSdk, listDevices, listAvds, startAvd, stopAvd, run, startScrcpy, rotatePhone, CONTROL_RESET_VIDEO } from "./android.mjs";
import { listSims, bootSim, shutdownSim, startSimStream, ALLOWED_INPUT_TAGS } from "./ios.mjs";
import { grpcEndpoint, startGrpcStream } from "./emulator-grpc.mjs";
import { wifiState, connectPhone, startQr, cancelQr, restartAdb } from "./wifi.mjs";
import { detectProject, listVariants, recentProjects, rememberProject } from "./project.mjs";
import { startRun, stopRun, reloadRun, runState, installFlutter, runningSerial } from "./runner.mjs";
import { sweep } from "./device-lock.mjs";
import { getSettings, saveSettings, shutdownDevice } from "./idle-shutdown.mjs";

const port = Number.parseInt(process.argv[2] ?? "", 10);
if (!Number.isInteger(port) || port < 1) {
  throw new Error("Ghostex must supply a valid {port} argument");
}

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.GHOSTEX_EXTENSION_DATA_DIR || join(homedir(), ".cache", "ghostex-mobile-pane");
const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/viewer-worker.js": ["viewer-worker.js", "text/javascript; charset=utf-8"],
  "/control.js": ["control.js", "text/javascript; charset=utf-8"],
  "/probe.html": ["probe.html", "text/html; charset=utf-8"],
  "/probe-worker.js": ["probe-worker.js", "text/javascript; charset=utf-8"],
  "/touchtest.html": ["touchtest.html", "text/html; charset=utf-8"],
  "/qr.js": ["qr.js", "text/javascript; charset=utf-8"],
  "/run.js": ["run.js", "text/javascript; charset=utf-8"],
};
const now = () => performance.timeOrigin + performance.now();
// Any web page can open a WebSocket or POST to 127.0.0.1, so only our own page may stream,
// control a device, or start/stop emulators.
const ALLOWED_ORIGINS = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
// Past this much unsent data the viewer is behind (slow link): drop to the next keyframe instead of queueing.
const MAX_BUFFERED = 2 << 20;
// Control message types a viewer may send (see public/control.js); everything else is dropped.
const ALLOWED_CONTROL = new Set([0, 1, 2, 3, 9]);
const MAX_CONTROL_BYTES = 256 * 1024;

// ---- shared Android streams ---------------------------------------------------
// One device session serves every viewer of that device (a second pane, a remote viewer, Bench).
// A joining viewer gets the last session message and decoder config, then a keyframe it asks for
// (scrcpy) or the last frame (gRPC: a still screen sends nothing new). Backpressure is per viewer.
// The session closes 3 s after its last viewer leaves, so a quick reconnect (a resize) reuses it.
// ponytail: the first viewer's maxSize wins; viewers of other pane sizes get that resolution scaled.

const hubs = new Map(); // "scrcpy:<serial>" | "grpc:<serial>" → hub

function header(flags) {
  const h = Buffer.allocUnsafe(9);
  h[0] = flags;
  h.writeDoubleLE(now(), 1);
  return h;
}

function createHub(key) {
  const hub = {
    viewers: new Map(), // ws → { waitKey }
    sessionText: null,
    config: null,
    requestKey: () => {},
    onJoin: () => {},
    close: () => {},
    text(obj, remember = false) {
      const t = JSON.stringify(obj);
      if (remember) hub.sessionText = t;
      for (const ws of hub.viewers.keys()) ws.sendText(t);
    },
    // H.264: deltas need the frames before them, so a viewer that fell behind waits for a keyframe.
    packet(flags, data, { config, key }) {
      if (config) hub.config = { flags, data: Buffer.from(data) };
      for (const [ws, v] of hub.viewers) {
        if (!config) {
          if (v.waitKey && !key) continue;
          if (ws.buffered > MAX_BUFFERED) {
            if (!v.waitKey) hub.requestKey();
            v.waitKey = true;
            continue;
          }
          if (key) v.waitKey = false;
        }
        ws.sendBinary(header(flags), data);
      }
    },
    // Raw frames stand alone: a viewer that is behind just skips one.
    raw(head, data) {
      for (const ws of hub.viewers.keys()) if (ws.buffered <= MAX_BUFFERED) ws.sendBinary(head, data);
    },
    end(error) {
      if (hubs.get(key) === hub) hubs.delete(key);
      const t = JSON.stringify({ type: "closed", error: error?.message ?? null });
      for (const ws of hub.viewers.keys()) {
        ws.sendText(t);
        ws.close();
      }
      hub.viewers.clear();
    },
  };
  return hub;
}

async function joinHub(key, ws, start) {
  let hub = hubs.get(key);
  if (!hub) {
    hub = start(createHub(key));
    hubs.set(key, hub);
  }
  clearTimeout(hub.closeTimer);
  hub.viewers.set(ws, { waitKey: true });
  ws.onclose = () => {
    hub.viewers.delete(ws);
    if (hub.viewers.size) return;
    hub.closeTimer = setTimeout(() => {
      if (hub.viewers.size) return;
      if (hubs.get(key) === hub) hubs.delete(key);
      hub.close();
    }, 3000);
  };
  try {
    await hub.ready;
  } catch (error) {
    hub.end(error);
    return null;
  }
  if (ws.closed) return null;
  if (hub.sessionText) ws.sendText(hub.sessionText);
  hub.onJoin(ws);
  return hub;
}

async function streamVideo(ws, url) {
  const serial = url.searchParams.get("serial");
  const maxSize = Math.min(Number(url.searchParams.get("maxSize")) || 0, 4096);
  if (!serial) return ws.close();
  // Emulators with gRPC on stream through it by default (measured: ~56 vs ~40 fps, same tap latency,
  // ~0.26 core more); ?transport=scrcpy forces the H.264 path. Phones always use scrcpy.
  if (url.searchParams.get("transport") !== "scrcpy" && (await grpcEndpoint(serial))) return streamEmulatorGrpc(ws, serial, maxSize);
  let hub = null;
  ws.onmessage = (msg) => {
    const session = hub?.session;
    if (!session) return;
    if (typeof msg !== "string") {
      if (msg.length <= MAX_CONTROL_BYTES && ALLOWED_CONTROL.has(msg[0])) session.sendControl(msg);
      return;
    }
    const m = JSON.parse(msg);
    if (m.type === "resetVideo") hub.requestKey();
    if (m.type === "rotate") rotateDevice(serial, session);
  };
  hub = await joinHub(`scrcpy:${serial}`, ws, (h) => {
    h.requestKey = () => h.session?.sendControl(CONTROL_RESET_VIDEO);
    // A new stream starts with config + keyframe by itself. Only a viewer joining a running stream
    // needs one asked for (and RESET_VIDEO before capture has started stops scrcpy-server).
    h.onJoin = (viewer) => {
      if (!h.config) return;
      viewer.sendBinary(header(h.config.flags), h.config.data);
      h.requestKey();
    };
    h.ready = startScrcpy(serial, { maxSize }, {
      onSession: (s) => h.text({ type: "session", platform: "android", ...s }, true),
      onClipboard: (text) => h.text({ type: "clipboard", text }),
      onPacket: ({ config, key, data }) => h.packet((config ? 1 : 0) | (key ? 2 : 0), data, { config, key }),
      onClose: (error) => h.end(error),
    }).then((session) => {
      h.session = session;
      h.close = () => session.close();
    });
    return h;
  });
}

// ---- /video?serial=emulator-N (gRPC on): frames from the emulator's gRPC, input via scrcpy -------
// Wire: flags 16 = raw RGBA, header [flags][f64 time][u16 width][u16 height].

async function streamEmulatorGrpc(ws, serial, maxSize) {
  let hub = null;
  ws.onmessage = (msg) => {
    if (!hub?.input) return;
    if (typeof msg !== "string") {
      if (msg.length > MAX_CONTROL_BYTES || !ALLOWED_CONTROL.has(msg[0]) || !hub.device) return;
      // Without a video stream scrcpy injects raw device pixels: rescale from the frame size.
      const at = msg[0] === 2 ? 10 : msg[0] === 3 ? 1 : -1;
      if (at >= 0) {
        const fw = msg.readUInt16BE(at + 8), fh = msg.readUInt16BE(at + 10);
        msg.writeInt32BE(Math.round((msg.readInt32BE(at) * hub.device.width) / fw), at);
        msg.writeInt32BE(Math.round((msg.readInt32BE(at + 4) * hub.device.height) / fh), at + 4);
      }
      hub.input.sendControl(msg);
      return;
    }
    const m = JSON.parse(msg);
    if (m.type === "rotate") rotateDevice(serial, hub.input);
  };
  hub = await joinHub(`grpc:${serial}`, ws, (h) => {
    h.onJoin = (viewer) => h.last && viewer.sendBinary(...h.last);
    h.ready = (async () => {
      h.input = await startScrcpy(serial, { video: false }, {
        onClipboard: (text) => h.text({ type: "clipboard", text }),
        onClose: (e) => e && h.end(e),
      });
      const video = await startGrpcStream(serial, { maxSize }, {
        onSession: (s) => {
          h.device = s.device;
          h.text({ type: "session", platform: "android", width: s.width, height: s.height, deviceName: `${serial} · gRPC` }, true);
        },
        onFrame: (rgba, w, hgt) => {
          const head = Buffer.allocUnsafe(13);
          head[0] = 16;
          head.writeDoubleLE(now(), 1);
          head.writeUInt16LE(w, 9);
          head.writeUInt16LE(hgt, 11);
          h.last = [head, rgba]; // kept by reference for the next viewer to join
          h.raw(head, rgba);
        },
        onClose: (e) => h.end(e),
      });
      h.close = () => {
        video.close();
        h.input.close();
      };
    })();
    h.ready.catch(() => h.input?.close());
    return h;
  });
}

// ---- /video?sim=<udid>: iOS Simulator through serve-sim -----------------------
// Same wire as Android (Annex-B; flags 1 config, 2 keyframe) plus 8 = JPEG seed of the current screen.

async function streamSimVideo(ws, udid, mjpeg = false) {
  let session = null;
  let skipToKey = false;
  const header = (flags) => {
    const h = Buffer.allocUnsafe(9);
    h[0] = flags;
    h.writeDoubleLE(now(), 1);
    return h;
  };
  ws.onclose = () => session?.close();
  ws.onmessage = (msg) => {
    if (typeof msg !== "string") {
      if (msg.length <= 4096 && ALLOWED_INPUT_TAGS.has(msg[0])) session?.sendInput(msg);
      return;
    }
    const m = JSON.parse(msg);
    if (m.type === "resetVideo") session?.requestKeyframe();
    if (m.type === "rotate") session?.rotate();
    if (m.type === "paste") session?.paste(m.text);
    if (m.type === "copy") session?.copy().then((text) => text && ws.sendText(JSON.stringify({ type: "clipboard", text })));
  };
  try {
    session = await startSimStream(udid, {
      onSession: (s) => ws.sendText(JSON.stringify({ type: "session", platform: "ios", ...s })),
      onPacket: ({ kind, data }) => {
        if (kind === "seed" && mjpeg && ws.buffered > MAX_BUFFERED) return; // JPEGs stand alone: drop when behind
        if (kind === "delta" && ws.buffered > MAX_BUFFERED) {
          if (!skipToKey) session?.requestKeyframe();
          skipToKey = true;
        }
        if (skipToKey && kind === "delta") return;
        if (kind === "key") skipToKey = false;
        const flags = kind === "seed" ? 8 : kind === "config" ? 1 : kind === "key" ? 2 : 0;
        ws.sendBinary(header(flags), data);
      },
      onClose: (error) => {
        ws.sendText(JSON.stringify({ type: "closed", error: error?.message ?? null }));
        ws.close();
      },
    }, { mjpeg });
    if (ws.closed) session.close();
  } catch (error) {
    ws.sendText(JSON.stringify({ type: "closed", error: error.message }));
    ws.close();
  }
}

// An emulator turns its virtual sensor (works with auto-rotate on or off). A phone with auto-rotate on
// gets the next orientation locked (rotatePhone); with it off, scrcpy's ROTATE_DEVICE works.
async function rotateDevice(serial, session) {
  if (serial.startsWith("emulator-")) {
    const { adb } = await androidSdk();
    await run(adb, ["-s", serial, "emu", "rotate"]);
  } else if (!(await rotatePhone(serial))) {
    session?.sendControl(Buffer.from([11])); // ControlMessage.TYPE_ROTATE_DEVICE
  }
}

// ---- latency benchmark ---------------------------------------------------------
// Opens /touchtest.html (whole screen flips black/white per touch) in the device's browser.

async function openTouchTest({ kind, id }) {
  const page = `http://127.0.0.1:${port}/touchtest.html`;
  if (kind === "ios") {
    if (!(await listSims()).some((s) => s.udid === id && s.state !== "stopped")) throw new Error("simulator not booted");
    const r = await run("xcrun", ["simctl", "openurl", id, page]);
    if (!r.ok) throw new Error(r.stderr || "simctl openurl failed");
    return;
  }
  if (!(await listDevices()).some((d) => d.serial === id && d.state === "device")) throw new Error("device not connected");
  const { adb } = await androidSdk();
  // The device reaches this server through adb reverse on the same port number.
  const rev = await run(adb, ["-s", id, "reverse", `tcp:${port}`, `tcp:${port}`]);
  if (!rev.ok) throw new Error(rev.stderr || "adb reverse failed");
  const r = await run(adb, ["-s", id, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", page]);
  if (!r.ok) throw new Error(r.stderr || "am start failed");
}

// ---- capability probe endpoints ------------------------------------------------

function probeEcho(ws) {
  ws.onmessage = (msg) => {
    if (typeof msg !== "string") return ws.sendBinary(msg); // RTT echo
    const m = JSON.parse(msg);
    if (m.type !== "burst") return;
    const frame = Buffer.alloc(m.size);
    for (let i = 0; i < m.n; i++) {
      frame.writeDoubleLE(now(), 0);
      ws.sendBinary(frame);
    }
    ws.sendText(JSON.stringify({ type: "burst-done" }));
  };
}

async function hostEnv() {
  const { sdk, adb, emulator } = await androidSdk();
  const [devices, avds, sims] = await Promise.all([
    listDevices(),
    emulator ? run(emulator, ["-list-avds"]) : null,
    process.platform === "darwin" ? run("xcrun", ["simctl", "list", "devices", "available", "-j"]) : null,
  ]);
  let simulators = null;
  if (sims?.ok) {
    const all = Object.values(JSON.parse(sims.stdout).devices).flat();
    simulators = { available: all.length, booted: all.filter((d) => d.state === "Booted").length };
  }
  return {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    cwd: process.cwd(),
    ghostexEnvKeys: Object.keys(process.env).filter((k) => k.startsWith("GHOSTEX_")), // names only: values hold tokens
    androidSdk: sdk,
    adb,
    emulator,
    adbDevices: devices.map((d) => `${d.serial} ${d.state}`),
    avds: avds?.ok ? avds.stdout.split("\n").filter(Boolean) : null,
    simulators,
  };
}

// ---- HTTP ------------------------------------------------------------------

const memory = { report: null, stats: null };

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) reject(new Error("body too large"));
      else chunks.push(c);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString()));
    request.on("error", reject);
  });
}

const json = (response, status, body) =>
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify(body));

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method !== "GET" && !ALLOWED_ORIGINS.has(request.headers.origin)) return json(response, 403, { error: "forbidden origin" });
  try {
    if (url.pathname === "/health") return json(response, 200, { ok: true });
    if (url.pathname === "/devices") return json(response, 200, await listDevices());
    if (url.pathname === "/avds") return json(response, 200, await listAvds());
    if (url.pathname === "/sims") return json(response, 200, await listSims());
    if (url.pathname === "/sims/boot" && request.method === "POST") return json(response, 200, await bootSim(JSON.parse(await readBody(request)).udid));
    if (url.pathname === "/bench/open" && request.method === "POST") {
      await openTouchTest(JSON.parse(await readBody(request)));
      return json(response, 200, { ok: true });
    }
    if (url.pathname === "/sims/shutdown" && request.method === "POST") {
      await shutdownSim(JSON.parse(await readBody(request)).udid);
      return json(response, 200, { ok: true });
    }
    if (url.pathname === "/avds/start" && request.method === "POST") {
      await mkdir(DATA_DIR, { recursive: true });
      return json(response, 200, await startAvd(JSON.parse(await readBody(request)).name, DATA_DIR));
    }
    if (url.pathname === "/avds/stop" && request.method === "POST") {
      await stopAvd(JSON.parse(await readBody(request)).serial);
      return json(response, 200, { ok: true });
    }
    if (url.pathname === "/settings") return json(response, 200, request.method === "POST" ? await saveSettings(DATA_DIR, JSON.parse(await readBody(request))) : await getSettings(DATA_DIR));
    if (url.pathname === "/wifi") return json(response, 200, await wifiState());
    if (url.pathname === "/wifi/qr" && request.method === "POST") return json(response, 200, startQr());
    if (url.pathname === "/wifi/qr/cancel" && request.method === "POST") return json(response, 200, cancelQr() ?? { ok: true });
    if (url.pathname === "/wifi/connect" && request.method === "POST") return json(response, 200, await connectPhone(JSON.parse(await readBody(request))));
    if (url.pathname === "/wifi/restart-adb" && request.method === "POST") return json(response, 200, (await restartAdb(), { ok: true }));
    if (url.pathname === "/run/projects") {
      await mkdir(DATA_DIR, { recursive: true });
      const recents = await recentProjects(DATA_DIR);
      let suggested = null;
      if (process.env.GHOSTEX_PROJECT_PATH) {
        try {
          const p = await detectProject(process.env.GHOSTEX_PROJECT_PATH);
          suggested = p.path;
        } catch {
          suggested = null;
        }
      }
      return json(response, 200, { recents, suggested });
    }
    if (url.pathname === "/run/variants" && request.method === "POST") {
      await mkdir(DATA_DIR, { recursive: true });
      let body;
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        return json(response, 400, { error: "Invalid JSON body" });
      }
      if (!body?.path) return json(response, 400, { error: "Missing project path" });
      let project;
      try {
        project = await detectProject(body.path);
      } catch (err) {
        return json(response, 400, { error: err.message });
      }
      const variants = await listVariants(project, DATA_DIR, { refresh: Boolean(body.refresh) });
      await rememberProject(DATA_DIR, project);
      return json(response, 200, { project, variants });
    }
    if (url.pathname === "/run/start" && request.method === "POST") {
      await mkdir(DATA_DIR, { recursive: true });
      let body;
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        return json(response, 400, { error: "Invalid JSON body" });
      }
      try {
        return json(response, 200, await startRun(body, DATA_DIR));
      } catch (err) {
        return json(response, 400, { error: err.message });
      }
    }
    if (url.pathname === "/run/stop" && request.method === "POST") {
      await stopRun();
      return json(response, 200, { ok: true });
    }
    if (url.pathname === "/run/reload" && request.method === "POST") {
      let body;
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        return json(response, 400, { error: "Invalid JSON body" });
      }
      try {
        await reloadRun(Boolean(body?.full));
        return json(response, 200, { ok: true });
      } catch (err) {
        return json(response, 400, { error: err.message });
      }
    }
    if (url.pathname === "/run/state") {
      const since = Number(url.searchParams.get("since")) || 0;
      return json(response, 200, runState(since));
    }
    if (url.pathname === "/run/install-flutter" && request.method === "POST") {
      await mkdir(DATA_DIR, { recursive: true });
      let body;
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        return json(response, 400, { error: "Invalid JSON body" });
      }
      const version = body?.version;
      if (!version || typeof version !== "string") {
        return json(response, 400, { error: "Missing or invalid Flutter version" });
      }
      let project;
      try {
        project = await detectProject(body.path);
      } catch (e) {
        return json(response, 400, { error: e.message });
      }
      const pinned = project.flutterSdk?.pinned ?? null;
      if (pinned !== version) {
        return json(response, 400, { error: `Requested Flutter version ${version} does not match pinned version ${pinned}` });
      }
      const res = await installFlutter(version);
      return json(response, 200, res ?? { ok: true });
    }
    if (url.pathname === "/env") return json(response, 200, await hostEnv());
    if (url.pathname === "/stream") {
      const n = Math.min(Number(url.searchParams.get("n")) || 50, 500);
      const size = Math.min(Number(url.searchParams.get("size")) || 100_000, 2_000_000);
      response.writeHead(200, { "content-type": "application/octet-stream", "cache-control": "no-store" });
      const chunk = Buffer.alloc(size);
      for (let i = 0; i < n; i++) response.write(chunk);
      return response.end();
    }
    // Viewer stats and probe reports are kept so agents can read real numbers.
    for (const kind of ["stats", "report", "bench"]) {
      if (url.pathname !== `/${kind}`) continue;
      if (request.method === "POST") {
        memory[kind] = { receivedAt: new Date().toISOString(), userAgent: request.headers["user-agent"], ...JSON.parse(await readBody(request)) };
        const file = join(DATA_DIR, { report: "fase0-report.json", stats: "viewer-stats.json", bench: "bench.json" }[kind]);
        await mkdir(DATA_DIR, { recursive: true });
        await writeFile(file, JSON.stringify(memory[kind], null, 2));
        return json(response, 200, { ok: true, file });
      }
      return json(response, memory[kind] ? 200 : 404, memory[kind] ?? { error: `no ${kind} yet` });
    }
    const file = STATIC[url.pathname];
    if (file) {
      const body = await readFile(join(here, "public", file[0]));
      return response.writeHead(200, { "content-type": file[1], "cache-control": "no-store" }).end(body);
    }
    response.writeHead(404).end("Not found");
  } catch (error) {
    json(response, 500, { error: String(error?.message ?? error) });
  }
});

server.on("upgrade", (request, socket) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (!ALLOWED_ORIGINS.has(request.headers.origin)) {
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    return;
  }
  if (url.pathname !== "/video" && url.pathname !== "/ws") return socket.destroy();
  const ws = acceptWebSocket(request, socket);
  if (!ws) return;
  if (url.pathname === "/video" && url.searchParams.get("sim")) streamSimVideo(ws, url.searchParams.get("sim"), url.searchParams.get("video") === "mjpeg");
  else if (url.pathname === "/video") streamVideo(ws, url);
  else probeEcho(ws);
});

// Locks of owners that never released go stale after 3 minutes with nobody to notice: look every 30 s.
setInterval(() => {
  getSettings(DATA_DIR).then((s) => s.shutdownIdle && sweep(DATA_DIR, shutdownDevice, (id) => id === runningSerial())).catch(() => {});
}, 30000).unref?.(); // a failed sweep just tries again in 30 s
server.listen(port, "127.0.0.1", () => console.log(`mobile-pane on http://127.0.0.1:${port}`));
