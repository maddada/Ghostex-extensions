// Android wireless debugging: find phones over mDNS, pair them (QR or 6-digit code) and connect with adb.
// Discovery: macOS Bonjour (dns-sd) plus adb's own mDNS, which is often empty on macOS.
// Runs `adb kill-server` only from restartAdb (a user click): Android Studio shares the same adb server.
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import { randomInt } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { androidSdk, listDevices, run } from "./android.mjs";

const CONNECT = "_adb-tls-connect._tcp";
const PAIRING = "_adb-tls-pairing._tcp";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HINT =
  " macOS blocks this app from the local network: turn on System Settings › Privacy & Security › Local Network for Ghostex" +
  " (and for Android Studio, which may have started the adb server), then try again." +
  " If Local Network is already on, restart adb: a server started before the permission was granted stays blocked.";
const withHint = (e) => new Error(/No route to host|EHOSTUNREACH|Host is down|EHOSTDOWN/i.test(e.message) ? `${e.message.replace(/\.?$/, ".")}${HINT}` : e.message);

// ---- discovery -----------------------------------------------------------------
// One long-running `dns-sd -B` per service type, started on first use. Each added service is resolved
// with `dns-sd -L` (host, port, TXT name=<model>) and the host with getaddrinfo (mDNS for .local).

const services = new Map(); // "<type> <name>" → { type, name, ifs: Set, info: { address, model } | null }
const browsers = new Map(); // type → dns-sd process
let cleanupSet = false;

function browse(type) {
  if (process.platform !== "darwin" || browsers.has(type)) return;
  if (!cleanupSet) {
    cleanupSet = true;
    process.on("exit", () => browsers.forEach((p) => p.kill()));
    for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) process.once(sig, () => process.exit(0));
  }
  const p = spawn("dns-sd", ["-B", type, "local."], { stdio: ["ignore", "pipe", "ignore"] });
  browsers.set(type, p);
  p.on("error", () => {});
  p.on("exit", () => {
    browsers.delete(type); // started again on the next call
    for (const [k, s] of services) if (s.type === type) services.delete(k);
  });
  let buf = "";
  p.stdout.on("data", (d) => {
    const lines = (buf += d).split("\n");
    buf = lines.pop();
    for (const line of lines) {
      // 23:12:53.096  Add        3  14 local.               _adb-tls-connect._tcp. adb-RR2X600937R-tQpy30
      const m = line.match(/^\S+\s+(Add|Rmv)\s+\d+\s+(\d+)\s+\S+\s+\S+\s+(.+?)\s*$/);
      if (!m) continue;
      const [, op, iface, name] = m;
      const key = `${type} ${name}`;
      let s = services.get(key);
      if (op === "Rmv") {
        s?.ifs.delete(iface);
        if (s && !s.ifs.size) services.delete(key);
        continue;
      }
      if (!s) services.set(key, (s = { type, name, ifs: new Set(), info: null }));
      s.ifs.add(iface);
      // Re-resolve on every Add: the port changes each time wireless debugging restarts.
      const r = (s.resolving = resolveService(type, name));
      r.then((info) => s.resolving === r && (s.info = info));
    }
  });
}

function resolveService(type, name) {
  return new Promise((done) => {
    const p = spawn("dns-sd", ["-L", name, type, "local."], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "", settled = false;
    const finish = async (m) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      p.kill();
      if (!m) return done(null);
      const host = m[1].replace(/\.$/, "");
      const ip = await lookup(host, { family: 4 }).then((r) => r.address, () => host);
      done({ address: `${ip}:${m[2]}`, model: m[3]?.match(/\bname=(\S+)/)?.[1]?.replaceAll("_", " ") });
    };
    // "... can be reached at Android.local.:33379 (interface 14)\n api= name=SM-X306B v=1\n"
    const reached = /can be reached at (\S+):(\d+)[^\n]*\n(?:([^\n]*)\n)?/;
    const timer = setTimeout(() => finish(out.match(reached)), 4000);
    p.stdout.on("data", (d) => {
      const m = (out += d).match(reached);
      if (m?.[3] !== undefined) finish(m); // wait for the TXT line too
    });
    p.on("error", () => finish(null));
  });
}

/** adb's own mDNS: `<name>\t<type>\t<ip>:<port>`. The only source off macOS. */
async function adbMdns() {
  const { adb } = await androidSdk();
  if (!adb) return [];
  const { stdout } = await run(adb, ["mdns", "services"], 5000);
  return [...stdout.matchAll(/^(\S+)\s+(_adb-tls-(?:connect|pairing)\._tcp)\.?\s+(\S+:\d+)\s*$/gm)].map(([, name, type, address]) => ({ type, name, address }));
}

/** Resolved services from both sources: [{ type, name, address, model? }] */
async function found() {
  browse(CONNECT);
  browse(PAIRING);
  const list = [...services.values()].filter((s) => s.info).map((s) => ({ type: s.type, name: s.name, ...s.info }));
  for (const m of await adbMdns()) if (!list.some((s) => s.type === m.type && s.name === m.name)) list.push(m);
  return list;
}

const knownHosts = () => readFile(join(process.env.ANDROID_USER_HOME ?? join(homedir(), ".android"), "adb_known_hosts.pb"), "latin1").catch(() => "");

/** adb names a Wi-Fi phone `ip:port` (adb connect) or `<service name>._adb-tls-connect._tcp` (adb's mDNS). */
const matches = (serial, name, address) => serial === address || (!!name && serial.startsWith(`${name}.`));
const serialOf = (devices, name, address) => devices.find((d) => d.state === "device" && matches(d.serial, name, address))?.serial ?? null;

// ---- pair and connect --------------------------------------------------------------

async function adb(args, timeout) {
  const { adb } = await androidSdk();
  if (!adb) throw new Error("adb not found (set ANDROID_HOME)");
  const r = await run(adb, args, timeout);
  return `${r.stdout}\n${r.stderr}`.trim();
}

/** → the phone's guid, which is also the name of its _adb-tls-connect._tcp service. */
async function pair(address, code) {
  const out = await adb(["pair", address, code], 30000);
  if (!/Successfully paired/i.test(out)) throw new Error(`adb pair ${address} failed: ${out || "no answer"}`);
  return out.match(/guid=([^\]\s]+)/)?.[1] ?? null;
}

async function connectTo(address, name) {
  const out = await adb(["connect", address], 20000);
  if (!/^(already )?connected to/m.test(out)) throw new Error(`adb connect ${address} failed: ${out || "no answer"}`);
  remember(name, address);
  return serialOf(await listDevices(), name, address) ?? address;
}

/** After pairing: connect to the phone's connect service once it shows up (or adb connected it itself). */
async function connectPaired(guid) {
  if (guid) {
    for (const end = Date.now() + 20000; Date.now() < end; await sleep(1000)) {
      const [list, devices] = await Promise.all([found(), listDevices()]);
      const s = list.find((x) => x.type === CONNECT && x.name === guid);
      const serial = serialOf(devices, guid, s?.address);
      if (serial) {
        remember(guid, s?.address);
        return serial;
      }
      if (s) return connectTo(s.address, guid);
    }
  }
  throw new Error("Paired, but the phone did not say where to connect. Type the IP address & Port from its Wireless debugging screen (no code) and press Connect.");
}

/**
 * { name } of a listed phone, or { address: "ip:port" }; with { code } it pairs first (a phone showing
 * a pairing code, or the address from its pairing dialog). → { serial }
 */
export async function connectPhone({ name, address, code }) {
  try {
    if (code != null && !/^\d{6}$/.test(code)) throw new Error("The pairing code has 6 digits.");
    if (address != null && !/^[\w.][\w.-]*:\d{1,5}$/.test(address)) throw new Error("Type the address as ip:port, such as 192.168.1.20:37123.");
    if (name != null) {
      const s = (await found()).find((x) => x.name === name && x.type === (code ? PAIRING : CONNECT));
      if (!s) throw new Error(`${name} is no longer on the network.`);
      address = s.address;
    }
    if (!address) throw new Error("Pick a phone or type its address.");
    return { serial: code ? await connectPaired(await pair(address, code)) : await connectTo(address, name) };
  } catch (e) {
    throw withHint(e);
  }
}

/** Only from a user click: restarts the adb server (it then inherits the Local Network permission), then reconnects phones now. */
export async function restartAdb() {
  const { adb } = await androidSdk();
  if (!adb) throw new Error("adb not found (set ANDROID_HOME)");
  await run(adb, ["kill-server"]); // fails harmlessly when no server runs
  const r = await run(adb, ["start-server"], 30000);
  if (!r.ok) throw new Error(`adb start-server failed: ${r.stderr || r.stdout || "no answer"}`);
  retryAfter.clear();
  await reconnectDropped().catch(() => {});
}

// ---- QR pairing ------------------------------------------------------------------------
// The pane shows WIFI:T:ADB;S:<name>;P:<password>;; (as Android Studio does). The phone scans it from
// Wireless debugging › Pair device with QR code and advertises _adb-tls-pairing._tcp named <name>.

let qr = null; // { name, password, payload, state: waiting | pairing | connecting | connected | error, error, serial, seen }

const randomText = (n, chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789") => Array.from({ length: n }, () => chars[randomInt(chars.length)]).join("");

export function startQr() {
  const name = `studio-${randomText(10)}`, password = randomText(10);
  const job = (qr = { name, password, payload: `WIFI:T:ADB;S:${name};P:${password};;`, state: "waiting", error: null, serial: null, seen: [] });
  (async () => {
    let s;
    for (const end = Date.now() + 120000; qr === job && Date.now() < end; await sleep(1000)) {
      const pairing = (await found()).filter((x) => x.type === PAIRING);
      job.seen = pairing.map((x) => x.name); // shown while waiting: tells a name mismatch from no mDNS at all
      if ((s = pairing.find((x) => x.name === name))) break;
    }
    if (qr !== job) return;
    if (!s) throw new Error("The phone did not show up on the network within 2 minutes. Phone and Mac must be on the same Wi-Fi.");
    job.state = "pairing";
    const guid = await pair(s.address, password);
    job.state = "connecting";
    job.serial = await connectPaired(guid);
    job.state = "connected";
  })().catch((e) => {
    job.state = "error";
    job.error = withHint(e).message;
  });
  return publicQr();
}

export const cancelQr = () => void (qr = null);
const publicQr = () => qr && { payload: qr.payload, name: qr.name, state: qr.state, error: qr.error, serial: qr.serial, seen: qr.seen };

export async function wifiState() {
  const [list, devices, known] = await Promise.all([found(), listDevices(), knownHosts()]);
  return {
    phones: list.filter((s) => s.type === CONNECT).map((s) => ({ name: s.name, model: s.model ?? null, address: s.address, paired: known.includes(s.name), serial: serialOf(devices, s.name, s.address) })),
    pairing: list.filter((s) => s.type === PAIRING && s.name !== qr?.name).map((s) => ({ name: s.name, address: s.address })),
    qr: publicQr(),
  };
}

// ---- reconnect -------------------------------------------------------------------------
// Phones connected from the pane come back by themselves after a drop (Wi-Fi blip, another tool
// restarted the adb server, a new port after wireless debugging restarted), but only while the phone
// advertises itself, at most every 10 s, and 60 s after a failed try.

const remembered = new Map(); // service name → last address
const retryAfter = new Map();
let watcher = null, busy = false;

function remember(name, address) {
  if (!name) return;
  remembered.set(name, address ?? remembered.get(name));
  watcher ??= setInterval(reconnectDropped, 10000);
}

async function reconnectDropped() {
  if (busy) return;
  busy = true;
  try {
    const [list, devices] = await Promise.all([found(), listDevices()]);
    for (const s of list) {
      if (s.type !== CONNECT || !remembered.has(s.name) || serialOf(devices, s.name, s.address) || retryAfter.get(s.name) > Date.now()) continue;
      const old = remembered.get(s.name);
      for (const d of devices) if (d.state === "offline" && (matches(d.serial, s.name, s.address) || d.serial === old)) await adb(["disconnect", d.serial]);
      await connectTo(s.address, s.name).catch(() => retryAfter.set(s.name, Date.now() + 60000));
    }
  } finally {
    busy = false;
  }
}
