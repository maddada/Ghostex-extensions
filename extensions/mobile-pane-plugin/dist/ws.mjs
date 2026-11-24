// Minimal WebSocket server side (RFC 6455) for loopback use.
// ponytail: no fragmentation/extensions; client→server messages are small JSON. Swap for `ws` if that changes.
import { createHash } from "node:crypto";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function frameHeader(opcode, len) {
  const head = len < 126 ? Buffer.alloc(2) : len < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
  head[0] = 0x80 | opcode;
  if (len < 126) head[1] = len;
  else if (len < 65536) (head[1] = 126), head.writeUInt16BE(len, 2);
  else (head[1] = 127), head.writeBigUInt64BE(BigInt(len), 2);
  return head;
}

function readFrame(buf) {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  const masked = buf[1] & 0x80;
  let len = buf[1] & 0x7f;
  let off = 2;
  if (len === 126) {
    if (buf.length < 4) return null;
    len = buf.readUInt16BE(2);
    off = 4;
  } else if (len === 127) {
    if (buf.length < 10) return null;
    len = Number(buf.readBigUInt64BE(2));
    off = 10;
  }
  const maskOff = off;
  if (masked) off += 4;
  if (buf.length < off + len) return null;
  const payload = Buffer.from(buf.subarray(off, off + len));
  if (masked) for (let i = 0; i < len; i++) payload[i] ^= buf[maskOff + (i & 3)];
  return { opcode, payload, size: off + len };
}

/** Accepts the upgrade and returns a tiny socket API, or null if the request is not a WebSocket. */
export function acceptWebSocket(request, socket) {
  const key = request.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return null;
  }
  const accept = createHash("sha1").update(key + GUID).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  socket.setNoDelay(true);

  const ws = {
    onmessage: () => {},
    onclose: () => {},
    closed: false,
    /** Bytes queued in the kernel/user buffers; used for backpressure. */
    get buffered() {
      return socket.writableLength;
    },
    sendBinary(...parts) {
      if (ws.closed) return;
      const len = parts.reduce((n, p) => n + p.length, 0);
      socket.cork();
      socket.write(frameHeader(0x2, len));
      for (const p of parts) socket.write(p);
      socket.uncork();
    },
    sendText(text) {
      if (ws.closed) return;
      const payload = Buffer.from(text);
      socket.write(Buffer.concat([frameHeader(0x1, payload.length), payload]));
    },
    close() {
      if (ws.closed) return;
      ws.closed = true;
      socket.end(frameHeader(0x8, 0));
      ws.onclose();
    },
  };

  let pending = Buffer.alloc(0);
  socket.on("data", (chunk) => {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    let frame;
    while ((frame = readFrame(pending))) {
      pending = pending.subarray(frame.size);
      if (frame.opcode === 0x8) return ws.close();
      if (frame.opcode === 0x9) socket.write(Buffer.concat([frameHeader(0xa, frame.payload.length), frame.payload]));
      else if (frame.opcode === 0x1 || frame.opcode === 0x2) ws.onmessage(frame.opcode === 0x1 ? frame.payload.toString() : frame.payload);
    }
  });
  const gone = () => {
    if (ws.closed) return;
    ws.closed = true;
    ws.onclose();
  };
  socket.on("close", gone);
  socket.on("error", () => socket.destroy());
  return ws;
}
