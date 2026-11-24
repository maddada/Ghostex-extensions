// Android emulator fast path: frames straight from the emulator's gRPC `streamScreenshot` (raw RGBA,
// scaled by the emulator), skipping the guest's software H.264 encoder and adb.
// Measured on an API 37 emulator: 814x1810 at 60 fps (scrcpy managed ~35) and tap → frame 68 ms p50 (scrcpy 81 ms).
// Needs an emulator started with `-grpc <port> -grpc-use-token` (startAvd does that).
import http2 from "node:http2";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { androidSdk, run } from "./android.mjs";

const DISCOVERY_DIR = join(homedir(), "Library/Caches/TemporaryItems/avd/running");
const SERVICE = "/android.emulation.control.EmulatorController";

/** { port, token } from the emulator's discovery file, or null when gRPC is off. */
export async function grpcEndpoint(serial) {
  const consolePort = serial.match(/^emulator-(\d+)$/)?.[1];
  if (!consolePort) return null;
  for (const name of await readdir(DISCOVERY_DIR).catch(() => [])) {
    if (!name.endsWith(".ini")) continue;
    const conf = Object.fromEntries(
      (await readFile(join(DISCOVERY_DIR, name), "utf8").catch(() => "")).split("\n").filter(Boolean).map((l) => l.split(/=(.*)/s)),
    );
    if (conf["port.serial"] === consolePort && conf["grpc.port"] && conf["grpc.token"]) return { port: Number(conf["grpc.port"]), token: conf["grpc.token"] };
  }
  return null;
}

// ---- minimal protobuf -----------------------------------------------------------

const varint = (n) => {
  const out = [];
  do {
    let b = n & 0x7f;
    n = Math.floor(n / 128);
    if (n) b |= 0x80;
    out.push(b);
  } while (n);
  return Buffer.from(out);
};
const fieldVarint = (f, v) => Buffer.concat([varint(f << 3), varint(v)]);

function* fields(buf) {
  let i = 0;
  const read = () => {
    let r = 0, mul = 1, b;
    do {
      b = buf[i++];
      r += (b & 0x7f) * mul;
      mul *= 128;
    } while (b & 0x80);
    return r;
  };
  while (i < buf.length) {
    const key = read();
    const type = key & 7;
    if (type === 0) yield [key >>> 3, read()];
    else if (type === 2) {
      const len = read();
      yield [key >>> 3, buf.subarray(i, i + len)];
      i += len;
    } else if (type === 1) i += 8;
    else if (type === 5) i += 4;
    else return;
  }
}

/** Server-streaming gRPC call; onMessage gets each protobuf payload. */
function call(session, token, method, request, onMessage, onEnd) {
  const req = session.request({ ":method": "POST", ":path": `${SERVICE}/${method}`, "content-type": "application/grpc", te: "trailers", authorization: `Bearer ${token}` });
  const head = Buffer.alloc(5);
  head.writeUInt32BE(request.length, 1);
  req.end(Buffer.concat([head, request]));
  // Join chunks once per message: joining per 16 KB chunk is O(n²) for 6 MB frames (cost 50 ms in the spike).
  let chunks = [], total = 0, need = 0;
  req.on("data", (c) => {
    chunks.push(c);
    total += c.length;
    for (;;) {
      if (!need && total >= 5) {
        const h = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
        chunks = [h];
        need = 5 + h.readUInt32BE(1);
      }
      if (!need || total < need) break;
      const all = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
      onMessage(all.subarray(5, need));
      const rest = all.subarray(need);
      chunks = rest.length ? [rest] : [];
      total = rest.length;
      need = 0;
    }
  });
  req.on("trailers", (t) => t["grpc-status"] && t["grpc-status"] !== "0" && onEnd(new Error(`gRPC ${method}: ${t["grpc-message"] ?? t["grpc-status"]}`)));
  req.on("close", () => onEnd());
  req.on("error", (e) => onEnd(e));
  return req;
}

async function deviceSize(serial) {
  const { adb } = await androidSdk();
  const out = (await run(adb, ["-s", serial, "shell", "wm", "size"])).stdout;
  const m = out.match(/Override size: (\d+)x(\d+)/) ?? out.match(/Physical size: (\d+)x(\d+)/);
  if (!m) throw new Error("could not read the screen size");
  return { width: Number(m[1]), height: Number(m[2]) };
}

/**
 * Streams RGBA frames. callbacks: onSession({ width, height, device }), onFrame(rgba, width, height), onClose(error?)
 * onSession fires again after a rotation, with swapped sizes.
 */
export async function startGrpcStream(serial, { maxSize = 0 } = {}, callbacks) {
  const endpoint = await grpcEndpoint(serial);
  if (!endpoint) throw new Error("emulator gRPC is not enabled");
  const device = await deviceSize(serial);
  const scale = maxSize > 0 ? Math.min(1, maxSize / Math.max(device.width, device.height)) : 1;
  const width = Math.round((device.width * scale) / 2) * 2;
  const height = Math.round((device.height * scale) / 2) * 2;

  const session = http2.connect(`http://127.0.0.1:${endpoint.port}`);
  let closed = false;
  const close = (error) => {
    if (closed) return;
    closed = true;
    session.close();
    callbacks.onClose?.(error);
  };
  session.on("error", (e) => close(e));

  // The emulator fits a rotated screen into the requested box (540x1200 became 540x243), so a change of
  // orientation re-requests the stream with the box turned too.
  let box = { width, height, device };
  let req = null;
  const start = () => {
    // ImageFormat { format = RGBA8888 (1), width = 3, height = 4 }
    const request = Buffer.concat([fieldVarint(1, 1), fieldVarint(3, box.width), fieldVarint(4, box.height)]);
    const mine = call(session, endpoint.token, "streamScreenshot", request, (msg) => {
      if (req !== mine) return;
      let image = null, w = box.width, h = box.height;
      for (const [f, v] of fields(msg)) {
        if (f === 4) image = v;
        else if (f === 1) for (const [g, u] of fields(v)) (g === 3 ? (w = u) : g === 4 ? (h = u) : 0);
      }
      if (!image || image.length !== w * h * 4) return;
      if (w > h !== box.width > box.height) {
        box = { width: box.height, height: box.width, device: { width: box.device.height, height: box.device.width } };
        callbacks.onSession?.(box);
        start();
        mine.close();
        return;
      }
      callbacks.onFrame(image, w, h);
    }, (error) => req === mine && close(error));
    req = mine;
  };
  callbacks.onSession?.(box);
  start();

  return { close: () => close() };
}
