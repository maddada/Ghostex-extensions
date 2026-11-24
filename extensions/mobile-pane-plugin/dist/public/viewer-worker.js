// Video path, entirely off the UI thread: WebSocket → VideoDecoder → OffscreenCanvas.
// Wire format per binary message: [flags u8][server receive time f64 LE][payload]
// flags: 1 config (SPS/PPS), 2 keyframe, 8 JPEG seed. Video is always Annex-B: the server converts
// iOS avcC, because Ghostex's CEF rejects decoder configs with an avcC description.
let ws, canvas, ctx, decoder;
let codec = null;
let configBytes = null;
let waitingForKey = true;
let paused = false;
let lastKeyRequest = 0;
let ts = 0;
// iOS reports landscape as an orientation while frames stay in the native portrait layout;
// we turn them upright while drawing (degrees clockwise, as serve-sim's preview does).
let rotation = 0;
const ROTATION = { landscape_left: 90, landscape_right: -90, portrait_upside_down: 180 };
const recvTimes = new Map(); // decoder timestamp → server receive time
const MAX_DECODE_QUEUE = 2; // beyond this we are behind: skip to a fresh keyframe instead of piling up latency
const now = () => performance.timeOrigin + performance.now();
const stats = { painted: 0, decoded: 0, dropped: 0, resets: 0, bytes: 0, maxQueue: 0, latency: [] };
let reportCount = 0;

const post = (msg) => self.postMessage(msg);

self.onmessage = ({ data }) => {
  if (data.type === "start") start(data);
  else if (data.type === "control") ws?.readyState === 1 && ws.send(data.buf); // input from the UI thread
  else if (data.type === "bench-tap") benchTap(data.buf);
  else if (data.type === "pause") paused = true;
  else if (data.type === "resume") {
    paused = false;
    waitingForKey = true;
    requestKey(true);
  }
};

function start({ url, canvas: c }) {
  canvas = c;
  ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";
  ws.onmessage = ({ data }) => (typeof data === "string" ? onText(JSON.parse(data)) : onPacket(data));
  ws.onclose = () => post({ type: "closed" });
  setInterval(report, 1000);
}

function onText(msg) {
  if (msg.type === "session") {
    rotation = ROTATION[msg.orientation] ?? 0;
    post(msg);
  }
  else if (msg.type === "closed") post({ type: "error", message: msg.error ?? "stream ended" });
  else if (msg.type === "clipboard") post(msg);
}

function requestKey(force = false) {
  const t = performance.now();
  if (!force && t - lastKeyRequest < 500) return;
  lastKeyRequest = t;
  stats.resets++;
  if (ws.readyState === 1) ws.send(JSON.stringify({ type: "resetVideo" }));
}

// "avc1.PPCCLL" from the SPS NAL unit inside the Annex-B config packet.
function codecFromConfig(bytes) {
  const hex = (b) => b.toString(16).padStart(2, "0");
  for (let i = 0; i + 6 < bytes.length; i++) {
    if (bytes[i] === 0 && bytes[i + 1] === 0 && bytes[i + 2] === 1 && (bytes[i + 3] & 0x1f) === 7) {
      return `avc1.${hex(bytes[i + 4])}${hex(bytes[i + 5])}${hex(bytes[i + 6])}`;
    }
  }
  return "avc1.640028";
}

// No usable H.264 decoder here: tell the page, which reconnects with a stream that needs none.
let reportedUnsupported = false;
function unsupported(message) {
  codec = null;
  if (!reportedUnsupported) post({ type: "decoder-unsupported", message });
  reportedUnsupported = true;
}

function ensureDecoder(newCodec) {
  if (!decoder || decoder.state === "closed") {
    decoder = new VideoDecoder({
      output: onFrame,
      error: (e) => {
        if (/not supported/i.test(e.message)) return unsupported(e.message);
        post({ type: "error", message: `decoder: ${e.message}` });
        codec = null; // reconfigure on the next config packet
        waitingForKey = true;
        requestKey(true);
      },
    });
    codec = null;
  }
  if (codec === newCodec) return;
  if (decoder.state === "configured") decoder.reset();
  // No hardwareAcceleration hint and no isConfigSupported gate: in Ghostex's CEF the query always
  // says false while the hardware decoder works (seen on Ghostex 11.15).
  try {
    decoder.configure({ codec: newCodec, optimizeForLatency: true });
  } catch (e) {
    return unsupported(e.message);
  }
  codec = newCodec;
  post({ type: "codec", codec });
}

function onPacket(buf) {
  const flags = new Uint8Array(buf, 0, 1)[0];
  const recvTime = new DataView(buf).getFloat64(1, true);
  const payload = new Uint8Array(buf, 9);
  stats.bytes += buf.byteLength;

  if (flags & 16) {
    // Raw RGBA from the emulator's gRPC: [u16 width][u16 height] after the time, then pixels.
    const dv = new DataView(buf);
    const w = dv.getUint16(9, true), h = dv.getUint16(11, true);
    if (paused) return;
    const frame = new VideoFrame(new Uint8Array(buf, 13), { format: "RGBA", codedWidth: w, codedHeight: h, timestamp: (ts += 16_667) });
    stats.decoded++;
    draw(frame, w, h);
    frame.close();
    stats.latency.push(now() - recvTime);
    stats.painted++;
    if (bench) checkBench(recvTime);
    return;
  }
  if (flags & 8) {
    // A JPEG: the current screen before the first keyframe decodes, or every frame in MJPEG mode
    // (no H.264 decoder). Drawn only while no H.264 decoder is configured.
    if (codec || paused) return;
    createImageBitmap(new Blob([payload], { type: "image/jpeg" })).then((bmp) => {
      if (!codec && canvas) {
        draw(bmp, bmp.width, bmp.height);
        stats.painted++;
        stats.latency.push(now() - recvTime);
        if (bench) checkBench(recvTime);
      }
      bmp.close();
    }, () => {});
    return;
  }
  if (flags & 1) {
    configBytes = payload.slice();
    ensureDecoder(codecFromConfig(configBytes));
    waitingForKey = true;
    return;
  }
  const key = !!(flags & 2);
  if (paused || !codec) {
    waitingForKey = true;
    return;
  }
  if (waitingForKey && !key) {
    stats.dropped++;
    return;
  }
  stats.maxQueue = Math.max(stats.maxQueue, decoder.decodeQueueSize);
  if (decoder.decodeQueueSize > MAX_DECODE_QUEUE) {
    stats.dropped++;
    waitingForKey = true;
    requestKey();
    return;
  }
  waitingForKey = false;
  let data = payload;
  if (key && configBytes) {
    // WebCodecs (Annex-B, no description) needs SPS/PPS in front of the IDR.
    data = new Uint8Array(configBytes.length + payload.length);
    data.set(configBytes, 0);
    data.set(payload, configBytes.length);
  }
  ts += 16_667;
  recvTimes.set(ts, recvTime);
  try {
    decoder.decode(new EncodedVideoChunk({ type: key ? "key" : "delta", timestamp: ts, data }));
  } catch (e) {
    post({ type: "error", message: `decode: ${e.message}` });
    waitingForKey = true;
    requestKey();
  }
}

// Draw as soon as a frame is decoded: waiting for requestAnimationFrame cost a full frame of
// latency (p50 16 ms vs ~2 ms) in testing. The compositor shows it at the next vsync anyway.
function draw(src, w, h) {
  const sideways = rotation === 90 || rotation === -90;
  const cw = sideways ? h : w;
  const ch = sideways ? w : h;
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  if (!rotation) return ctx.drawImage(src, 0, 0);
  ctx.setTransform(1, 0, 0, 1, cw / 2, ch / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(src, -w / 2, -h / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function onFrame(frame) {
  stats.decoded++;
  draw(frame, frame.displayWidth, frame.displayHeight);
  const recvTime = recvTimes.get(frame.timestamp);
  recvTimes.delete(frame.timestamp);
  if (recvTime) stats.latency.push(now() - recvTime);
  frame.close();
  stats.painted++;
  if (bench) checkBench(recvTime);
}

// ---- latency benchmark: input sent → pixel changed on this canvas ----------------
// The device shows /touchtest.html, which flips the whole screen black ↔ white per touch.
// Send time and paint time come from this worker's clock; the frame's server receive time
// splits the total into device side (input → render → encode → adb → server) and viewer side.
let bench = null;

const centerLuma = () => {
  const d = ctx.getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1).data;
  return (d[0] + d[1] + d[2]) / 3;
};

function benchTap(buf) {
  bench = { base: centerLuma(), sentAt: now() };
  ws.send(buf);
  setTimeout(() => {
    if (bench && now() - bench.sentAt >= 1990) {
      bench = null;
      post({ type: "bench-result", result: null });
    }
  }, 2000);
}

function checkBench(recvTime) {
  if (Math.abs(centerLuma() - bench.base) < 100) return;
  const paintedAt = now();
  const r = { totalMs: paintedAt - bench.sentAt, deviceMs: recvTime ? recvTime - bench.sentAt : null, viewerMs: recvTime ? paintedAt - recvTime : null };
  bench = null;
  post({ type: "bench-result", result: r });
}

function pct(xs, p) {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))] * 10) / 10;
}

function report() {
  const out = {
    type: "stats",
    fps: stats.painted,
    decodedFps: stats.decoded,
    dropped: stats.dropped,
    resets: stats.resets,
    kbps: Math.round((stats.bytes * 8) / 1000),
    maxQueue: stats.maxQueue,
    latencyMs: { p50: pct(stats.latency, 0.5), p95: pct(stats.latency, 0.95) },
    codec,
    size: canvas ? `${canvas.width}x${canvas.height}` : null,
  };
  post(out);
  // Every 5 s the server keeps a copy so the numbers can be read outside the view.
  if (++reportCount % 5 === 0) fetch("/stats", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(out) }).catch(() => {});
  Object.assign(stats, { painted: 0, decoded: 0, dropped: 0, resets: 0, bytes: 0, maxQueue: 0, latency: [] });
}
