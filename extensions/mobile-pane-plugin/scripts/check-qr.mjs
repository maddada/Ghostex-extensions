// Self-check for src/public/qr.js: encodes payloads of every supported version, writes PNGs and
// decodes them with macOS CoreImage (CIDetector). macOS only (needs swift).
import { deflateSync, crc32 } from "node:zlib";
import { writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { qrMatrix } from "../src/public/qr.js";

function png(m, scale = 8) {
  const n = (m.length + 8) * scale;
  const raw = Buffer.alloc(n * (n + 1), 255);
  for (let y = 0; y < n; y++) {
    raw[y * (n + 1)] = 0; // filter: none
    for (let x = 0; x < n; x++) if (m[Math.floor(y / scale) - 4]?.[Math.floor(x / scale) - 4]) raw[y * (n + 1) + 1 + x] = 0;
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0);
  ihdr.writeUInt32BE(n, 4);
  ihdr[8] = 8; // 8-bit grayscale
  return Buffer.concat([Buffer.from("\x89PNG\r\n\x1a\n", "latin1"), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const dir = mkdtempSync(join(tmpdir(), "qr-check-"));
const payloads = ["A", "WIFI:T:ADB;S:studio-x;P:1;;", "WIFI:T:ADB;S:studio-Ab3dE6gH9k;P:Xy7Zq2Wm4N;;", "x".repeat(40), "x".repeat(70), "é".repeat(53)];
const files = payloads.map((p, i) => {
  const f = join(dir, `${i}.png`);
  writeFileSync(f, png(qrMatrix(p)));
  return f;
});
const swift = `import CoreImage
for path in CommandLine.arguments.dropFirst() {
  let img = CIImage(contentsOf: URL(fileURLWithPath: path))!
  let det = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: nil)!
  let s = (det.features(in: img).first as? CIQRCodeFeature)?.messageString ?? "<none>"
  print(s.data(using: .utf8)!.base64EncodedString())
}`;
const out = execFileSync("swift", ["-", ...files], { input: swift }).toString().trim().split("\n");
payloads.forEach((p, i) => {
  const got = Buffer.from(out[i], "base64").toString();
  console.assert(got === p, `payload ${i} (version ${(qrMatrix(p).length - 17) / 4}): decoded ${JSON.stringify(got)}`);
  if (got !== p) process.exitCode = 1;
});
console.log(process.exitCode ? "QR check failed" : `QR check ok: ${payloads.length} payloads decoded`);
