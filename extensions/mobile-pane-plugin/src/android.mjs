// Android side: SDK discovery, device listing, and a scrcpy-server v5.0.1 video/control session.
import { execFile, spawn } from "node:child_process";
import { access, readFile, open as openFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { connect } from "node:net";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Protocol handling below must match this exact server build (scrcpy refuses other versions).
const SCRCPY_VERSION = "5.0.1";
const LOCAL_JAR = join(dirname(fileURLToPath(import.meta.url)), "vendor", `scrcpy-server-v${SCRCPY_VERSION}.jar`);
const DEVICE_JAR = `/data/local/tmp/mobile-pane-scrcpy-${SCRCPY_VERSION}.jar`;
export const CONTROL_RESET_VIDEO = Buffer.from([17]); // ControlMessage.TYPE_RESET_VIDEO: asks for a new keyframe

export function run(cmd, args, timeout = 15000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 16 << 20 }, (error, stdout, stderr) =>
      resolve({ ok: !error, stdout: String(stdout).trim(), stderr: String(stderr).trim() }),
    );
  });
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

let sdkCache;
export async function androidSdk() {
  if (sdkCache) return sdkCache;
  const roots = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, join(homedir(), "Library/Android/sdk")].filter(Boolean);
  for (const sdk of roots) {
    if (await exists(sdk)) {
      const adb = join(sdk, "platform-tools/adb");
      const emulator = join(sdk, "emulator/emulator");
      return (sdkCache = { sdk, adb: (await exists(adb)) ? adb : null, emulator: (await exists(emulator)) ? emulator : null });
    }
  }
  return { sdk: null, adb: null, emulator: null };
}

/** `adb devices -l` → [{ serial, state, model }] */
export async function listDevices() {
  const { adb } = await androidSdk();
  if (!adb) return [];
  const { ok, stdout } = await run(adb, ["devices", "-l"]);
  if (!ok) return [];
  return stdout
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [serial, state, ...rest] = line.trim().split(/\s+/);
      const model = rest.find((r) => r.startsWith("model:"))?.slice(6).replaceAll("_", " ");
      return { serial, state, model: model ?? serial };
    });
}

/** Current display rotation 0-3 (quarter turns). Android 10+ reports it in the window manager dump. */
export async function displayRotation(serial) {
  const { adb } = await androidSdk();
  const win = (await run(adb, ["-s", serial, "shell", "dumpsys", "window", "displays"])).stdout.match(/\bmRotation=(\d)/);
  if (win) return Number(win[1]);
  const input = (await run(adb, ["-s", serial, "shell", "dumpsys", "input"])).stdout.match(/SurfaceOrientation: (\d)/); // older Androids
  return Number(input?.[1] ?? 0);
}

/**
 * Turns a phone between portrait and landscape. scrcpy's ROTATE_DEVICE freezes then re-thaws rotation
 * when auto-rotate is on, so nothing happens; then lock the next orientation instead. That switches
 * auto-rotate off on the phone, as rotating by hand on a rotation-locked phone would.
 * Returns false when auto-rotate is off: the caller can use scrcpy's ROTATE_DEVICE.
 */
export async function rotatePhone(serial) {
  const { adb } = await androidSdk();
  const sh = (...args) => run(adb, ["-s", serial, "shell", ...args]);
  if ((await sh("settings", "get", "system", "accelerometer_rotation")).stdout.trim() !== "1") return false;
  const next = String((await displayRotation(serial)) % 2 === 0 ? 1 : 0);
  const locked = await sh("cmd", "window", "user-rotation", "lock", next);
  if (!locked.ok || /Unknown|Error/i.test(locked.stdout)) {
    await sh("settings", "put", "system", "accelerometer_rotation", "0"); // before Android 11
    await sh("settings", "put", "system", "user_rotation", next);
  }
  return true;
}

// ---- emulators (AVDs) -------------------------------------------------------

const booting = new Map(); // avd name → { serial, startedAt, error }
const booted = new Set(); // serials whose sys.boot_completed was 1

/** [{ name, state: "stopped" | "booting" | "running", serial?, bootSeconds?, error? }] */
export async function listAvds() {
  const { adb, emulator } = await androidSdk();
  if (!emulator) return [];
  const names = (await run(emulator, ["-list-avds"])).stdout.split("\n").map((s) => s.trim()).filter(Boolean);
  const emulators = (await listDevices()).filter((d) => d.serial.startsWith("emulator-"));
  const running = new Map(); // avd name → device
  await Promise.all(
    emulators.map(async (d) => {
      const name = (await run(adb, ["-s", d.serial, "emu", "avd", "name"])).stdout.split("\n")[0].trim();
      if (name) running.set(name, d);
      if (d.state === "device" && !booted.has(d.serial)) {
        const prop = await run(adb, ["-s", d.serial, "shell", "getprop", "sys.boot_completed"]);
        if (prop.stdout.trim() === "1") booted.add(d.serial);
      }
    }),
  );
  return names.map((name) => {
    const device = running.get(name);
    const boot = booting.get(name);
    if (device && booted.has(device.serial)) {
      if (boot && !boot.bootSeconds) boot.bootSeconds = Math.round((Date.now() - boot.startedAt) / 100) / 10;
      return { name, state: "running", serial: device.serial, bootSeconds: boot?.bootSeconds };
    }
    if (device || (boot && !boot.error)) return { name, state: "booting", serial: device?.serial ?? boot.serial, since: boot?.startedAt };
    return { name, state: "stopped", error: boot?.error };
  });
}

/** Starts an AVD headless (Quick Boot snapshot when present). The emulator outlives this server. */
export async function startAvd(name, logDir) {
  const { emulator } = await androidSdk();
  const avds = await listAvds();
  const avd = avds.find((a) => a.name === name); // only names the SDK listed: never pass user text as flags
  if (!avd) throw new Error(`unknown AVD ${name}`);
  if (avd.state !== "stopped") return avd;
  const used = new Set(avds.map((a) => a.serial).filter(Boolean).map((s) => Number(s.split("-")[1])));
  for (const d of await listDevices()) if (d.serial.startsWith("emulator-")) used.add(Number(d.serial.split("-")[1]));
  let port = 5554;
  while (used.has(port)) port += 2; // console/adb port pairs are even/odd
  const serial = `emulator-${port}`;
  const log = await openFile(join(logDir, `emulator-${name}.log`), "w");
  // gRPC (token auth) feeds the fast video path in emulator-grpc.mjs; one gRPC port per console port.
  const grpcPort = 8554 + (port - 5554);
  const child = spawn(emulator, ["-avd", name, "-port", String(port), "-no-window", "-no-audio", "-no-boot-anim", "-gpu", "host", "-grpc", String(grpcPort), "-grpc-use-token"], {
    detached: true,
    stdio: ["ignore", log.fd, log.fd],
  });
  const entry = { serial, startedAt: Date.now(), error: null };
  booting.set(name, entry);
  booted.delete(serial);
  child.on("exit", async (code) => {
    await log.close().catch(() => {});
    if (!booted.has(serial)) {
      const tail = (await readFile(join(logDir, `emulator-${name}.log`), "utf8").catch(() => "")).trim().split("\n").slice(-3).join(" ");
      entry.error = `emulator exited (${code}) before booting: ${tail}`;
    }
  });
  child.unref();
  return { name, state: "booting", serial };
}

export async function stopAvd(serial) {
  if (!/^emulator-\d+$/.test(serial)) throw new Error("not an emulator serial");
  const { adb } = await androidSdk();
  booted.delete(serial);
  for (const [name, b] of booting) if (b.serial === serial) booting.delete(name);
  const r = await run(adb, ["-s", serial, "emu", "kill"]); // saves the Quick Boot snapshot
  if (!r.ok) throw new Error(r.stderr || r.stdout || "emu kill failed");
}

// ---- scrcpy ----------------------------------------------------------------

let localJarMd5;
async function ensureJar(adb, serial) {
  localJarMd5 ??= createHash("md5").update(await readFile(LOCAL_JAR)).digest("hex");
  const remote = await run(adb, ["-s", serial, "shell", "md5sum", DEVICE_JAR]);
  if (remote.ok && remote.stdout.startsWith(localJarMd5)) return; // already there: skip the ~700 KB push
  const push = await run(adb, ["-s", serial, "push", LOCAL_JAR, DEVICE_JAR], 60000);
  if (!push.ok) throw new Error(`adb push failed: ${push.stderr || push.stdout}`);
}

/** Byte queue that avoids re-concatenating the whole backlog on every chunk. */
export class ByteQueue {
  chunks = [];
  length = 0;
  push(chunk) {
    this.chunks.push(chunk);
    this.length += chunk.length;
  }
  take(n) {
    if (this.length < n) return null;
    let out;
    const first = this.chunks[0];
    if (first.length >= n) {
      out = first.subarray(0, n);
      if (first.length === n) this.chunks.shift();
      else this.chunks[0] = first.subarray(n);
    } else {
      out = Buffer.allocUnsafe(n);
      let off = 0;
      while (off < n) {
        const c = this.chunks[0];
        const k = Math.min(c.length, n - off);
        c.copy(out, off, 0, k);
        off += k;
        if (k === c.length) this.chunks.shift();
        else this.chunks[0] = c.subarray(k);
      }
    }
    this.length -= n;
    return out;
  }
}

function connectOnce(port) {
  return new Promise((resolve, reject) => {
    const socket = connect(port, "127.0.0.1");
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

/** With an adb forward, connect() succeeds before the device listens; the dummy byte proves it does. */
async function connectVideo(port, deadline) {
  while (Date.now() < deadline) {
    const socket = await connectOnce(port).catch(() => null);
    if (socket) {
      const first = await new Promise((resolve) => {
        socket.once("data", (d) => resolve(d));
        socket.once("close", () => resolve(null));
        socket.once("error", () => resolve(null));
      });
      if (first) {
        socket.removeAllListeners();
        return { socket, rest: first.subarray(1) }; // drop the dummy byte
      }
      socket.destroy();
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("scrcpy server did not accept the video connection");
}

/**
 * Starts scrcpy-server on `serial` and streams H.264.
 * callbacks: onSession({ width, height, deviceName }), onPacket({ config, key, data }), onClose(error?)
 */
export async function startScrcpy(serial, { maxSize = 0, maxFps = 60, bitRate = 8_000_000, video: withVideo = true } = {}, callbacks) {
  const { adb } = await androidSdk();
  if (!adb) throw new Error("adb not found (set ANDROID_HOME)");
  await ensureJar(adb, serial);

  const scid = (randomBytes(4).readUInt32BE(0) & 0x7fffffff).toString(16).padStart(8, "0");
  const fwd = await run(adb, ["-s", serial, "forward", "tcp:0", `localabstract:scrcpy_${scid}`]);
  const port = Number.parseInt(fwd.stdout, 10);
  if (!fwd.ok || !port) throw new Error(`adb forward failed: ${fwd.stderr || fwd.stdout}`);

  const params = [
    `scid=${scid}`, "log_level=info", "tunnel_forward=true", "audio=false", "control=true", "cleanup=true", "clipboard_autosync=true",
    // video=false: input only, for when frames come from elsewhere (emulator gRPC).
    ...(withVideo ? ["video_codec=h264", `max_fps=${maxFps}`, `video_bit_rate=${bitRate}`, ...(maxSize > 0 ? [`max_size=${maxSize}`] : [])] : ["video=false"]),
  ];
  const server = spawn(adb, ["-s", serial, "shell", `CLASSPATH=${DEVICE_JAR}`, "app_process", "/", "com.genymobile.scrcpy.Server", SCRCPY_VERSION, ...params], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  const log = (d) => (serverLog = (serverLog + d).slice(-4000));
  server.stdout.on("data", log);
  server.stderr.on("data", log);

  let closed = false;
  let video, control, firstBytes;
  const close = (error) => {
    if (closed) return;
    closed = true;
    video?.destroy();
    control?.destroy();
    server.kill();
    run(adb, ["-s", serial, "forward", "--remove", `tcp:${port}`]);
    callbacks.onClose?.(error);
  };
  server.on("exit", (code) => close(code ? new Error(`scrcpy server exited (${code}): ${serverLog.trim().split("\n").pop()}`) : undefined));

  try {
    if (withVideo) {
      ({ socket: video, rest: firstBytes } = await connectVideo(port, Date.now() + 10000));
      control = await connectOnce(port); // sockets must open in order: video, then control
    } else {
      ({ socket: control, rest: firstBytes } = await connectVideo(port, Date.now() + 10000)); // control is the first socket: it gets the dummy byte
    }
  } catch (error) {
    close(error);
    throw new Error(`${error.message}. Server log: ${serverLog.trim()}`);
  }
  control.setNoDelay(true);
  // Device messages (DeviceMessageWriter, v5.0.1): 0 clipboard [u32 len][utf8], 1 clipboard ack [u64],
  // 2 UHID output [u16 id][u16 size][data]. With clipboard_autosync the device sends its clipboard on change.
  // Without video, the control socket is the first one and starts with the 64-byte device name.
  const cq = new ByteQueue();
  let skip = withVideo ? 0 : 64;
  let msgType = null, need = null;
  const readDeviceMessages = () => {
    for (;;) {
      if (skip) {
        if (!cq.take(skip)) return;
        skip = 0;
      }
      if (msgType === null) {
        const t = cq.take(1);
        if (!t) return;
        msgType = t[0];
      }
      if (msgType === 0) {
        if (need === null) {
          const l = cq.take(4);
          if (!l) return;
          need = l.readUInt32BE(0);
        }
        const text = cq.take(need);
        if (!text) return;
        callbacks.onClipboard?.(text.toString("utf8"));
      } else if (msgType === 1) {
        if (!cq.take(8)) return;
      } else if (msgType === 2) {
        if (need === null) {
          const h = cq.take(4);
          if (!h) return;
          need = h.readUInt16BE(2);
        }
        if (!cq.take(need)) return;
      } else {
        return close(new Error(`unknown device message ${msgType}`));
      }
      msgType = need = null;
    }
  };
  control.on("data", (c) => {
    cq.push(c);
    readDeviceMessages();
  });
  if (!withVideo && firstBytes?.length) cq.push(firstBytes);
  control.on("error", () => close());
  if (!withVideo) {
    control.on("close", () => close());
    return { deviceName: () => null, sendControl: (buf) => !closed && control.write(buf), close: () => close() };
  }
  video.setNoDelay(true);

  // Stream: device name (64) → codec id (4) → [session packet | media packet]*
  const q = new ByteQueue();
  let deviceName = null;
  let codecSeen = false;
  let header = null;
  const pump = () => {
    if (deviceName === null) {
      const b = q.take(64);
      if (!b) return;
      deviceName = b.toString("utf8").replace(/\0.*$/s, "");
    }
    if (!codecSeen) {
      const b = q.take(4);
      if (!b) return;
      if (b.readUInt32BE(0) !== 0x68323634) return close(new Error("unexpected video codec"));
      codecSeen = true;
    }
    for (;;) {
      if (!header) {
        header = q.take(12);
        if (!header) return;
        if (header[0] & 0x80) {
          callbacks.onSession?.({ width: header.readUInt32BE(4), height: header.readUInt32BE(8), deviceName });
          header = null;
          continue;
        }
      }
      const size = header.readUInt32BE(8);
      const data = q.take(size);
      if (!data) return;
      const flags = header[0];
      header = null;
      callbacks.onPacket({ config: !!(flags & 0x40), key: !!(flags & 0x20), data });
    }
  };
  if (firstBytes.length) q.push(firstBytes);
  video.on("data", (chunk) => {
    q.push(chunk);
    pump();
  });
  video.on("close", () => close());
  video.on("error", () => close());
  pump();

  return {
    deviceName: () => deviceName,
    sendControl: (buf) => !closed && control.write(buf),
    close: () => close(),
  };
}

// Smoke check against a real device: node src/android.mjs [serial]
// Stream starts, config + keyframes arrive, and RESET_VIDEO yields a new keyframe.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const serial = process.argv[2] ?? (await listDevices()).find((d) => d.state === "device")?.serial;
  if (!serial) throw new Error("no adb device");
  const seen = { session: null, config: 0, key: 0, packets: 0, bytes: 0 };
  const t0 = Date.now();
  const session = await startScrcpy(serial, { maxSize: 1280 }, {
    onSession: (s) => (seen.session = s),
    onPacket: (p) => {
      seen.packets++;
      seen.bytes += p.data.length;
      if (p.config) seen.config++;
      if (p.key) seen.key++;
    },
    onClose: (e) => e && console.error("closed:", e.message),
  });
  console.log("started in", Date.now() - t0, "ms");
  setTimeout(() => session.sendControl(CONTROL_RESET_VIDEO), 1500);
  setTimeout(() => {
    session.close();
    console.log(seen);
    console.assert(seen.session?.width > 0, "no session packet");
    console.assert(seen.config >= 1 && seen.key >= 2, "expected config + keyframe, and a second keyframe after RESET_VIDEO");
    process.exit(seen.session && seen.config && seen.key >= 2 ? 0 : 1);
  }, 3000);
}
