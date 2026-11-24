// Actions for coding agents: look at and drive a device without the viewer open.
// Coordinates are normalized 0..1 on both platforms; `ui` returns element centers in the same units,
// so an agent can pass them straight to `tap`.
import { mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { androidSdk, listDevices, run, displayRotation } from "./android.mjs";
import { listSims, simInput, simAccessibility, simPasteboard } from "./ios.mjs";
import { iosSwipeHome } from "./public/control.js";

const ANDROID_KEYS = { home: 3, back: 4, enter: 66, delete: 67, recents: 187, power: 26, volume_up: 24, volume_down: 25 };
const IOS_BUTTONS = { home: "home", recents: "app_switcher", lock: "lock", power: "side_button", siri: "siri" };
const HID = { enter: 0x28, delete: 0x2a, escape: 0x29, tab: 0x2b };

const json = (tag, obj) => {
  const body = Buffer.from(JSON.stringify(obj));
  return Buffer.concat([Buffer.from([tag]), body]);
};
const unit = (v, name) => {
  if (typeof v !== "number" || !(v >= 0 && v <= 1)) throw new Error(`${name} must be a number from 0 to 1`);
  return v;
};

export async function devices() {
  return settled(await listedDevices());
}

// A simulator booted before this process started reads "booting" until its quick bootstatus check
// returns; give it a few seconds instead of reporting a wrong state.
async function settled(all) {
  for (let i = 0; i < 10 && all.some((d) => d.state === "booting"); i++) {
    await new Promise((r) => setTimeout(r, 500));
    all = await listedDevices();
  }
  return all;
}

async function listedDevices() {
  const [android, sims] = await Promise.all([listDevices(), listSims()]);
  return [
    ...android.map((d) => ({ device: d.serial, platform: "android", name: d.model, state: d.state === "device" ? "ready" : d.state })),
    ...sims.filter((s) => s.state !== "stopped").map((s) => ({ device: s.udid, platform: "ios", name: `${s.name} (${s.runtime})`, state: s.state === "running" ? "ready" : s.state })),
  ];
}

/** `device` may be a serial, udid or (part of) a name; without it, the only ready device. */
async function target(device) {
  const ready = (await devices()).filter((d) => d.state === "ready");
  if (!device) {
    if (ready.length === 1) return ready[0];
    throw new Error(ready.length ? `several devices are ready, pass "device": ${ready.map((d) => d.device).join(", ")}` : "no device is ready");
  }
  const t = ready.find((d) => d.device === device) ?? ready.find((d) => d.name.toLowerCase().includes(String(device).toLowerCase()));
  if (!t) throw new Error(`no ready device matches ${device}`);
  return t;
}

async function adb(serial, args, timeout) {
  const { adb } = await androidSdk();
  const r = await run(adb, ["-s", serial, ...args], timeout);
  if (!r.ok) throw new Error(r.stderr || r.stdout || `adb ${args[0]} failed`);
  return r.stdout;
}

async function androidSize(serial) {
  // Current orientation: the root node of a UI dump is the whole screen; wm size is portrait only.
  const out = await adb(serial, ["shell", "wm", "size"]);
  const m = out.match(/Override size: (\d+)x(\d+)/) ?? out.match(/Physical size: (\d+)x(\d+)/);
  const [w, h] = [Number(m[1]), Number(m[2])];
  return (await displayRotation(serial)) % 2 ? { width: h, height: w } : { width: w, height: h };
}

export async function screenshot({ device }, dataDir) {
  const t = await target(device);
  const dir = join(dataDir, "screenshots");
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${t.platform}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`);
  if (t.platform === "ios") {
    const r = await run("xcrun", ["simctl", "io", t.device, "screenshot", "--type=png", path], 30000);
    if (!r.ok) throw new Error(r.stderr || "simctl screenshot failed");
  } else {
    const { adb: adbPath } = await androidSdk();
    // exec-out keeps the PNG bytes intact (shell would mangle line endings)
    const r = await run("sh", ["-c", `"$0" -s "$1" exec-out screencap -p > "$2"`, adbPath, t.device, path], 30000);
    if (!r.ok) throw new Error(r.stderr || "screencap failed");
  }
  return { device: t.device, platform: t.platform, path };
}

export async function tap({ device, x, y }) {
  const t = await target(device);
  unit(x, "x");
  unit(y, "y");
  if (t.platform === "ios") {
    await simInput(t.device, [json(0x03, { type: "begin", x, y }), 50, json(0x03, { type: "end", x, y })]);
  } else {
    const s = await androidSize(t.device);
    await adb(t.device, ["shell", "input", "tap", String(Math.round(x * s.width)), String(Math.round(y * s.height))]);
  }
  return { ok: true };
}

export async function swipe({ device, x1, y1, x2, y2, ms = 300 }) {
  const t = await target(device);
  [x1, y1, x2, y2].forEach((v, i) => unit(v, ["x1", "y1", "x2", "y2"][i]));
  ms = Math.min(Math.max(Number(ms) || 300, 50), 5000);
  if (t.platform === "ios") {
    const steps = Math.max(2, Math.round(ms / 16));
    const frames = [json(0x03, { type: "begin", x: x1, y: y1 })];
    for (let i = 1; i <= steps; i++) frames.push(ms / steps, json(0x03, { type: "move", x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps }));
    frames.push(json(0x03, { type: "end", x: x2, y: y2 }));
    await simInput(t.device, frames);
  } else {
    const s = await androidSize(t.device);
    const px = (v, d) => String(Math.round(v * d));
    await adb(t.device, ["shell", "input", "swipe", px(x1, s.width), px(y1, s.height), px(x2, s.width), px(y2, s.height), String(ms)]);
  }
  return { ok: true };
}

export async function type({ device, text }) {
  const t = await target(device);
  if (typeof text !== "string" || !text || text.length > 2000) throw new Error("text must be 1 to 2000 characters");
  if (t.platform === "ios") {
    // Paste instead of key presses: any characters, and no keyboard-layout guessing.
    await simPasteboard(t.device, text);
    await simInput(t.device, [json(0x06, { type: "down", usage: 0xe3 }), json(0x06, { type: "down", usage: 0x19 }), json(0x06, { type: "up", usage: 0x19 }), json(0x06, { type: "up", usage: 0xe3 })]);
  } else {
    // ponytail: `input text` takes ASCII only; non-ASCII needs the viewer (scrcpy clipboard paste).
    if (/[^\x20-\x7e]/.test(text)) throw new Error("Android typing supports ASCII only; use the viewer's paste for other text");
    const arg = `'${text.replaceAll("'", `'\\''`).replaceAll(" ", "%s")}'`; // device shell: quote, %s = space
    await adb(t.device, ["shell", "input", "text", arg]);
  }
  return { ok: true };
}

export async function key({ device, key: name }) {
  const t = await target(device);
  if (t.platform === "ios") {
    // Home as a bottom-edge swipe also leaves the App Switcher; SE models have a real Home button.
    if (name === "home" && !/\bSE\b/.test(t.name)) await simInput(t.device, iosSwipeHome().map((f) => (typeof f === "number" ? f : Buffer.from(f))));
    else if (IOS_BUTTONS[name]) await simInput(t.device, [json(0x04, { button: IOS_BUTTONS[name] })]);
    else if (HID[name]) await simInput(t.device, [json(0x06, { type: "down", usage: HID[name] }), json(0x06, { type: "up", usage: HID[name] })]);
    else throw new Error(`iOS keys: ${[...Object.keys(IOS_BUTTONS), ...Object.keys(HID)].join(", ")}`);
  } else {
    if (!ANDROID_KEYS[name]) throw new Error(`Android keys: ${Object.keys(ANDROID_KEYS).join(", ")}`);
    await adb(t.device, ["shell", "input", "keyevent", String(ANDROID_KEYS[name])]);
  }
  return { ok: true };
}

export async function install({ device, path }) {
  const t = await target(device);
  if (typeof path !== "string" || !path.startsWith("/")) throw new Error("path must be an absolute path");
  await access(path);
  if (t.platform === "ios") {
    if (!/\.app\/?$/.test(path)) throw new Error("iOS Simulator installs a built .app folder");
    const r = await run("xcrun", ["simctl", "install", t.device, path], 300000);
    if (!r.ok) throw new Error(r.stderr || "simctl install failed");
  } else {
    if (!path.endsWith(".apk")) throw new Error("Android installs an .apk");
    await adb(t.device, ["install", "-r", path], 300000);
  }
  return { ok: true };
}

export async function launch({ device, app }) {
  const t = await target(device);
  if (typeof app !== "string" || !/^[A-Za-z0-9._-]+$/.test(app)) throw new Error("app must be a package name or bundle id");
  if (t.platform === "ios") {
    const r = await run("xcrun", ["simctl", "launch", t.device, app], 60000);
    if (!r.ok) throw new Error(r.stderr || "simctl launch failed");
  } else {
    await adb(t.device, ["shell", "monkey", "-p", app, "-c", "android.intent.category.LAUNCHER", "1"]);
  }
  return { ok: true };
}

/** Visible elements with text or a label: [{ role, text, x, y, w, h }], x/y = center, all 0..1. */
export async function ui({ device }) {
  const t = await target(device);
  const out = [];
  const r2 = (v) => Math.round(v * 1000) / 1000;
  if (t.platform === "ios") {
    const tree = await simAccessibility(t.device);
    const screen = tree[0]?.frame ?? { width: 1, height: 1 };
    const walk = (n) => {
      const label = n.AXLabel ?? n.label ?? n.title;
      const f = n.frame;
      if (label && f && n.type !== "Application") {
        out.push({ role: n.type ?? n.role, text: n.AXValue ? `${label}: ${n.AXValue}` : label, x: r2((f.x + f.width / 2) / screen.width), y: r2((f.y + f.height / 2) / screen.height), w: r2(f.width / screen.width), h: r2(f.height / screen.height) });
      }
      (n.children ?? []).forEach(walk);
    };
    tree.forEach(walk);
  } else {
    const xml = await adb(t.device, ["exec-out", "uiautomator", "dump", "/dev/tty"], 30000);
    const nodes = [...xml.matchAll(/<node [^>]*>/g)].map((m) => m[0]);
    const xmlText = (v) => v.replace(/&(amp|lt|gt|quot|apos|#(\d+));/g, (_, e, n) => (n ? String.fromCharCode(Number(n)) : { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[e]));
    const attr = (n, a) => xmlText(n.match(new RegExp(` ${a}="([^"]*)"`))?.[1] ?? "");
    const bounds = (n) => attr(n, "bounds").match(/\d+/g)?.map(Number);
    const root = bounds(nodes[0] ?? "") ?? [0, 0, 1, 1];
    const [W, H] = [root[2] || 1, root[3] || 1];
    for (const n of nodes) {
      const text = attr(n, "text") || attr(n, "content-desc");
      const b = bounds(n);
      if (!text || !b) continue;
      out.push({ role: attr(n, "class").split(".").pop() + (attr(n, "clickable") === "true" ? " (clickable)" : ""), text, x: r2((b[0] + b[2]) / 2 / W), y: r2((b[1] + b[3]) / 2 / H), w: r2((b[2] - b[0]) / W), h: r2((b[3] - b[1]) / H) });
    }
  }
  return { device: t.device, platform: t.platform, elements: out };
}

/** What an agent can ask for; returned by the `help` message. */
export const HELP = {
  devices: "List devices: [{device, platform, name, state}]. Pass `device` (id or part of the name) to the others when more than one is ready.",
  screenshot: "{device?} → {path} of a PNG you can read.",
  ui: "{device?} → visible elements with text: [{role, text, x, y, w, h}], x/y = center, 0..1.",
  tap: "{device?, x, y} with x, y from 0 to 1 (e.g. an element's center from ui).",
  swipe: "{device?, x1, y1, x2, y2, ms?} all 0..1; ms defaults to 300.",
  type: "{device?, text} into the focused field (Android: ASCII only).",
  key: "{device?, key}: home, back (Android), recents, enter, delete, … ",
  install: "{device?, path}: absolute path to an .apk (Android) or a built .app folder (iOS Simulator).",
  launch: "{device?, app}: package name (Android) or bundle id (iOS).",
};

export const ACTIONS = { devices, screenshot, tap, swipe, type, key, install, launch, ui };
