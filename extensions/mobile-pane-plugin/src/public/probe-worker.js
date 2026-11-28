// Capability probe: prove the video path works off the UI thread —
// WebCodecs H.264 encode → decode → paint on a transferred OffscreenCanvas.
const pct = (xs, p) => (xs.length ? xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))] : null);

async function supported(codec, hardwareAcceleration = "prefer-hardware") {
  try {
    const r = await VideoDecoder.isConfigSupported({ codec, optimizeForLatency: true, hardwareAcceleration });
    return r.supported;
  } catch (e) {
    return `error: ${e.message}`;
  }
}

async function roundTrip(canvas, hardwareAcceleration) {
  const W = 1280, H = 720, N = 60;
  const ctx = canvas.getContext("2d");
  const src = new OffscreenCanvas(W, H);
  const sctx = src.getContext("2d");
  const submitted = new Map();
  const latencies = [];
  let decoded = 0;
  let decodeError = null;

  const decoder = new VideoDecoder({
    output: (frame) => {
      latencies.push(performance.now() - submitted.get(frame.timestamp));
      if (canvas.width !== frame.displayWidth) (canvas.width = frame.displayWidth), (canvas.height = frame.displayHeight);
      ctx.drawImage(frame, 0, 0);
      frame.close();
      decoded++;
    },
    error: (e) => (decodeError = e.message),
  });
  // Annex-B with no description, like scrcpy's raw stream.
  decoder.configure({ codec: "avc1.42e01f", optimizeForLatency: true, hardwareAcceleration });

  const encoder = new VideoEncoder({
    output: (chunk) => {
      submitted.set(chunk.timestamp, performance.now());
      decoder.decode(chunk);
    },
    error: (e) => (decodeError = `encoder: ${e.message}`),
  });
  encoder.configure({ codec: "avc1.42e01f", width: W, height: H, bitrate: 4_000_000, framerate: 60, latencyMode: "realtime", avc: { format: "annexb" } });

  for (let i = 0; i < N; i++) {
    sctx.fillStyle = `hsl(${(i * 6) % 360} 70% 45%)`;
    sctx.fillRect(0, 0, W, H);
    sctx.fillStyle = "#fff";
    sctx.font = "bold 120px system-ui";
    sctx.fillText(`frame ${i}`, 80, 400);
    const frame = new VideoFrame(src, { timestamp: i * 16_667 });
    encoder.encode(frame, { keyFrame: i === 0 });
    frame.close();
    await new Promise((r) => setTimeout(r, 16)); // pace like a 60 fps stream
  }
  await encoder.flush();
  await decoder.flush();
  encoder.close();
  decoder.close();
  return { frames: N, decoded, decodeError, decodeLatencyMs: { p50: pct(latencies, 0.5), p95: pct(latencies, 0.95) } };
}

self.onmessage = async ({ data }) => {
  const out = { workerOk: true, offscreenTransferred: !!data.canvas };
  out.videoDecoder = typeof VideoDecoder === "function";
  out.videoEncoder = typeof VideoEncoder === "function";
  try {
    out.webgl2 = !!new OffscreenCanvas(1, 1).getContext("webgl2");
  } catch {
    out.webgl2 = false;
  }
  if (out.videoDecoder) {
    out.h264High = await supported("avc1.640028");
    out.h264Baseline = await supported("avc1.42e01f");
    out.h264AnyBackend = await supported("avc1.640028", "no-preference");
  }
  if (out.videoDecoder && out.videoEncoder && data.canvas) {
    for (const [key, hw] of [["roundTripHardware", "prefer-hardware"], ["roundTripSoftware", "prefer-software"]]) {
      try {
        out[key] = await roundTrip(data.canvas, hw);
      } catch (e) {
        out[key] = { error: e.message };
      }
    }
  }
  self.postMessage(out);
};
