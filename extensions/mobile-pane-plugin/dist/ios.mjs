// iOS side: Simulator list/boot/shutdown via simctl, video and input through a serve-sim helper.
// serve-sim (Apache-2.0, pinned in package.json) captures the framebuffer and injects HID input.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run, ByteQueue } from "./android.mjs";

// dist/ carries a vendored copy (scripts/build.mjs); src/ runs from the project's node_modules.
const here = dirname(fileURLToPath(import.meta.url));
const SERVE_SIM = [join(here, "vendor/node_modules/serve-sim/dist/serve-sim.js"), join(here, "../node_modules/serve-sim/dist/serve-sim.js")].find((p) => existsSync(p));
const WS_MSG_CONFIG = 0x82; // helper → client: {width, height, orientation}
// Input tags the viewer may send (serve-sim's [tag][JSON] HID protocol): touch, button, key, scroll.
export const ALLOWED_INPUT_TAGS = new Set([0x03, 0x04, 0x05, 0x06, 0x0b]); // + 0x05 two-finger touch
const TAG_ORIENTATION = 0x07;

const ready = new Set(); // udids whose `simctl bootstatus -b` finished
const checking = new Set(); // udids with a bootstatus call in flight
const bootErrors = new Map();
const helpers = new Map(); // udid → { port, url }

/** iOS simulators: [{ udid, name, runtime, state: "stopped" | "booting" | "running", error? }] */
export async function listSims() {
  if (process.platform !== "darwin") return [];
  const r = await run("xcrun", ["simctl", "list", "devices", "available", "-j"]);
  if (!r.ok) return [];
  return Object.entries(JSON.parse(r.stdout).devices)
    .filter(([runtime]) => runtime.includes(".iOS-"))
    .flatMap(([runtime, devices]) =>
      devices.map((d) => {
        const booted = d.state === "Booted";
        if (!booted) ready.delete(d.udid);
        else if (!ready.has(d.udid)) watchBoot(d.udid); // booted before this server started, or still booting
        const state = booted && ready.has(d.udid) ? "running" : booted || d.state === "Booting" ? "booting" : "stopped";
        return { udid: d.udid, name: d.name, runtime: runtime.split(".").pop().replace(/^iOS-/, "iOS ").replaceAll("-", "."), state, error: bootErrors.get(d.udid) };
      }),
    );
}

/** `bootstatus -b` returns at once for a ready simulator and waits for one still booting. */
function watchBoot(udid) {
  if (checking.has(udid)) return;
  checking.add(udid);
  run("xcrun", ["simctl", "bootstatus", udid, "-b"], 300000).then((r) => {
    checking.delete(udid);
    if (r.ok) ready.add(udid);
    else bootErrors.set(udid, r.stderr || "boot failed");
  });
}

async function findSim(udid) {
  const sim = (await listSims()).find((s) => s.udid === udid); // only udids simctl listed reach a command line
  if (!sim) throw new Error(`unknown simulator ${udid}`);
  return sim;
}

/** Boots headless (no Simulator.app window); `running` once SpringBoard is up. */
export async function bootSim(udid) {
  const sim = await findSim(udid);
  bootErrors.delete(udid);
  if (sim.state === "stopped") {
    const r = await run("xcrun", ["simctl", "boot", udid], 120000);
    if (!r.ok && !/current state: Booted/.test(r.stderr)) throw new Error(r.stderr || "simctl boot failed");
  }
  if (!ready.has(udid)) watchBoot(udid);
  return { ...sim, state: ready.has(udid) ? "running" : "booting" };
}

export async function shutdownSim(udid) {
  await findSim(udid);
  helpers.delete(udid);
  ready.delete(udid);
  await run(process.execPath, [SERVE_SIM, "--kill", udid], 30000);
  const r = await run("xcrun", ["simctl", "shutdown", udid], 60000);
  if (!r.ok && !/current state: Shutdown/.test(r.stderr)) throw new Error(r.stderr || "simctl shutdown failed");
}

/** Starts (or reuses) the serve-sim helper for a booted simulator. */
async function ensureHelper(udid) {
  const cached = helpers.get(udid);
  if (cached) {
    const ok = await fetch(`${cached.url}/helper/${udid}/health`).then((r) => r.ok, () => false);
    if (ok) return cached;
    helpers.delete(udid);
  }
  const r = await run(process.execPath, [SERVE_SIM, "--detach", "-q", udid], 90000);
  const info = JSON.parse(r.stdout.trim().split("\n").pop() || "{}");
  if (!r.ok || !info.port) throw new Error(`serve-sim helper failed: ${r.stderr || r.stdout}`);
  const helper = { port: info.port, url: `http://127.0.0.1:${info.port}` };
  helpers.set(udid, helper);
  return helper;
}

/** For agent actions: send serve-sim HID frames ([tag][JSON]) one after another, with optional pauses. */
export async function simInput(udid, frames) {
  const helper = await ensureHelper(udid);
  const ws = new WebSocket(`ws://127.0.0.1:${helper.port}/helper/${udid}/ws`);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("could not connect to the serve-sim helper"));
  });
  for (const f of frames) {
    if (typeof f === "number") await new Promise((r) => setTimeout(r, f));
    else ws.send(f);
  }
  await new Promise((r) => setTimeout(r, 100)); // let the last frame flush before closing
  ws.close();
}

/** Accessibility tree from the helper's /ax: [{ role, label, frame: {x, y, width, height} in points }] */
export async function simAccessibility(udid) {
  const helper = await ensureHelper(udid);
  const res = await fetch(`${helper.url}/helper/${udid}/ax`);
  if (!res.ok) throw new Error(`ax: HTTP ${res.status}`);
  return res.json();
}

export async function simPasteboard(udid, text) {
  await new Promise((resolve) => {
    const p = spawn("xcrun", ["simctl", "pbcopy", udid], { stdio: ["pipe", "ignore", "ignore"] });
    p.on("close", resolve);
    p.on("error", resolve);
    p.stdin.end(text);
  });
}

// Ghostex's CEF decodes H.264 only as Annex-B: an avcC `description` fails with "H.264 decoding is not
// supported" while the same stream as Annex-B decodes (High@5.1, 1206x2622, measured on an iPhone 17 simulator).
const START_CODE = Buffer.from([0, 0, 0, 1]);

/** avcC record → Annex-B SPS/PPS packet; also returns the NAL length size. */
export function avccToAnnexB(desc) {
  const lengthSize = (desc[4] & 3) + 1;
  const parts = [];
  let o = 5;
  for (let count = desc[o++] & 0x1f, i = 0; i < count; i++, o += 2 + desc.readUInt16BE(o)) parts.push(START_CODE, desc.subarray(o + 2, o + 2 + desc.readUInt16BE(o)));
  for (let count = desc[o++], i = 0; i < count; i++, o += 2 + desc.readUInt16BE(o)) parts.push(START_CODE, desc.subarray(o + 2, o + 2 + desc.readUInt16BE(o)));
  return { params: Buffer.concat(parts), lengthSize };
}

/** Length-prefixed NAL units → start codes. With 4-byte lengths this rewrites in place (same size). */
export function nalsToAnnexB(frame, lengthSize) {
  if (lengthSize === 4) {
    for (let i = 0; i + 4 <= frame.length; ) {
      const len = frame.readUInt32BE(i);
      START_CODE.copy(frame, i);
      i += 4 + len;
    }
    return frame;
  }
  const parts = [];
  for (let i = 0; i + lengthSize <= frame.length; ) {
    const len = frame.readUIntBE(i, lengthSize);
    parts.push(START_CODE, frame.subarray(i + lengthSize, i + lengthSize + len));
    i += lengthSize + len;
  }
  return Buffer.concat(parts);
}

/**
 * Streams a simulator as Annex-B H.264. callbacks: onSession({ width, height, orientation }),
 * onPacket({ kind: "config" | "key" | "delta" | "seed", data }), onClose(error?)
 */
export async function startSimStream(udid, callbacks, { mjpeg = false } = {}) {
  const sim = await findSim(udid);
  if (sim.state === "stopped") throw new Error(`${sim.name} is not booted`);
  const helper = await ensureHelper(udid);
  const base = `${helper.url}/helper/${udid}`;
  let closed = false;
  let orientation = "portrait";
  let video = null;

  const close = (error) => {
    if (closed) return;
    closed = true;
    clearInterval(orientationTimer);
    video?.abort();
    input.close();
    callbacks.onClose?.(error);
  };

  // Input + config updates (rotation) share the helper's HID WebSocket.
  const input = new WebSocket(`ws://127.0.0.1:${helper.port}/helper/${udid}/ws`);
  input.binaryType = "arraybuffer";
  // The helper reports the DEVICE orientation. A portrait-only app (Settings on iPhone) keeps drawing
  // upright in device landscape, so turning its frames would show it sideways: while the device is in
  // landscape, ask the accessibility tree whether the app's window is landscape too and report that.
  // Checked after each rotation and every 2 s (an app switch changes it without a rotation).
  let cfg = null;
  let reported = null;
  const report = (orientationToShow) => {
    if (!cfg || reported === orientationToShow) return;
    reported = orientationToShow;
    callbacks.onSession?.({ ...cfg, orientation: orientationToShow, deviceName: sim.name });
  };
  const checkAppOrientation = async () => {
    if (closed || !/landscape/.test(cfg?.orientation ?? "")) return;
    const frame = await fetch(`${base}/ax`).then((r) => r.json()).then((t) => t[0]?.frame, () => null);
    if (frame && !closed && /landscape/.test(cfg.orientation)) report(frame.height > frame.width ? "portrait" : cfg.orientation);
  };
  const orientationTimer = setInterval(checkAppOrientation, 2000);
  input.onmessage = ({ data }) => {
    const b = new Uint8Array(data);
    if (b[0] !== WS_MSG_CONFIG) return;
    cfg = JSON.parse(new TextDecoder().decode(b.subarray(1)));
    orientation = cfg.orientation ?? orientation;
    reported = null;
    report(cfg.orientation ?? "portrait");
    setTimeout(checkAppOrientation, 700); // let the app finish its own rotation
  };
  input.onclose = () => close();
  await new Promise((resolve, reject) => {
    input.onopen = resolve;
    input.onerror = () => reject(new Error("could not connect to the serve-sim helper"));
  });

  // Video: [u32 length][tag][payload]* — 1 avcC description, 2 IDR, 3 delta, 4 JPEG seed.
  const KIND = { 1: "config", 2: "key", 3: "delta", 4: "seed" };
  let lengthSize = 4;
  const pump = async () => {
    video = new AbortController();
    const res = await fetch(`${base}/stream.avcc`, { signal: video.signal });
    if (!res.ok) throw new Error(`stream.avcc: HTTP ${res.status}`);
    const q = new ByteQueue();
    let len = null;
    for await (const chunk of res.body) {
      q.push(Buffer.from(chunk));
      for (;;) {
        if (len === null) {
          const h = q.take(4);
          if (!h) break;
          len = h.readUInt32BE(0);
        }
        const frame = q.take(len);
        if (!frame) break;
        len = null;
        const kind = KIND[frame[0]];
        let data = frame.subarray(1);
        if (kind === "config") ({ params: data, lengthSize } = avccToAnnexB(data));
        else if (kind === "key" || kind === "delta") data = nalsToAnnexB(data, lengthSize);
        if (kind) callbacks.onPacket({ kind, data });
      }
    }
  };
  // Fallback for viewers without an H.264 decoder: serve-sim's MJPEG stream, each frame a whole JPEG
  // after a "Content-Length: N" part header (sent as kind "seed": the viewer draws JPEGs itself).
  const pumpMjpeg = async () => {
    video = new AbortController();
    const res = await fetch(`${base}/stream.mjpeg`, { signal: video.signal });
    if (!res.ok) throw new Error(`stream.mjpeg: HTTP ${res.status}`);
    let pending = Buffer.alloc(0);
    for await (const chunk of res.body) {
      pending = pending.length ? Buffer.concat([pending, Buffer.from(chunk)]) : Buffer.from(chunk);
      for (;;) {
        const head = pending.indexOf("\r\n\r\n");
        if (head < 0) break;
        const len = Number(/Content-Length:\s*(\d+)/i.exec(pending.subarray(0, head).toString("latin1"))?.[1]);
        if (!len) {
          pending = pending.subarray(head + 4); // boundary-only part
          continue;
        }
        if (pending.length < head + 4 + len) break;
        callbacks.onPacket({ kind: "seed", data: pending.subarray(head + 4, head + 4 + len) });
        pending = pending.subarray(head + 4 + len);
      }
    }
  };
  const startVideo = () =>
    (mjpeg ? pumpMjpeg() : pump()).then(
      () => close(),
      (error) => error.name !== "AbortError" && close(error),
    );
  startVideo();

  return {
    deviceName: () => sim.name,
    sendInput: (buf) => !closed && input.readyState === 1 && input.send(buf),
    /** A new connection replays the description and starts at a keyframe. */
    requestKeyframe: () => {
      if (closed) return;
      video?.abort();
      startVideo();
    },
    /** Puts text on the simulator pasteboard, then presses Cmd+V. */
    paste: async (text) => {
      if (closed || typeof text !== "string" || text.length > 100_000) return;
      await new Promise((resolve) => {
        const p = spawn("xcrun", ["simctl", "pbcopy", udid], { stdio: ["pipe", "ignore", "ignore"] });
        p.on("close", resolve);
        p.on("error", resolve);
        p.stdin.end(text);
      });
      const key = (type, usage) => {
        const body = new TextEncoder().encode(JSON.stringify({ type, usage }));
        const frame = new Uint8Array(1 + body.length);
        frame[0] = 0x06;
        frame.set(body, 1);
        input.readyState === 1 && input.send(frame);
      };
      key("down", 0xe3); // left Cmd
      key("down", 0x19); // V
      key("up", 0x19);
      key("up", 0xe3);
    },
    /** The simulator's pasteboard (the page sends Cmd+C/X first and asks a moment later). */
    copy: async () => {
      if (closed) return null;
      const r = await run("xcrun", ["simctl", "pbpaste", udid]);
      return r.ok ? r.stdout : null;
    },
    rotate: () => {
      const next = orientation === "portrait" ? "landscape_left" : "portrait";
      const body = new TextEncoder().encode(JSON.stringify({ orientation: next }));
      const frame = new Uint8Array(1 + body.length);
      frame[0] = TAG_ORIENTATION;
      frame.set(body, 1);
      if (input.readyState === 1) input.send(frame);
    },
    close: () => close(),
  };
}

// Self-check of the avcC → Annex-B conversion: node src/ios.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { deepStrictEqual: eq } = await import("node:assert");
  const sps = [0x67, 0x64, 0, 0x33, 0xac], pps = [0x68, 0xee, 0x3c];
  const desc = Buffer.from([1, 0x64, 0, 0x33, 0xff, 0xe1, 0, sps.length, ...sps, 1, 0, pps.length, ...pps]);
  const { params, lengthSize } = avccToAnnexB(desc);
  eq(lengthSize, 4);
  eq([...params], [0, 0, 0, 1, ...sps, 0, 0, 0, 1, ...pps]);
  eq([...nalsToAnnexB(Buffer.from([0, 0, 0, 2, 0x65, 0xaa, 0, 0, 0, 1, 0x41]), 4)], [0, 0, 0, 1, 0x65, 0xaa, 0, 0, 0, 1, 0x41]);
  eq([...nalsToAnnexB(Buffer.from([0, 2, 0x65, 0xaa]), 2)], [0, 0, 0, 1, 0x65, 0xaa]);
  console.log("ios.mjs self-check ok");
}
