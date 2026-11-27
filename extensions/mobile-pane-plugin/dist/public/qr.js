// Minimal QR Code encoder (ISO/IEC 18004): byte mode, error correction L, versions 1-5 (up to
// 106 bytes, one Reed-Solomon block each), so no block interleaving or version info. Enough for the
// ADB Wi-Fi pairing payload. Structure follows Project Nayuki's qrcodegen (MIT).
// ponytail: fixed mask 0 instead of the penalty search; scanners read it fine. Add the search if one does not.
// Check: node scripts/check-qr.mjs (decodes the output with macOS CoreImage).

const VERSIONS = [null, [19, 7], [34, 10], [55, 15], [80, 20], [108, 26]]; // [data, ecc] codewords at level L

/** text → square boolean matrix [row][col], true = dark, without the quiet zone. */
export function qrMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  const ver = VERSIONS.findIndex((v) => v && v[0] >= bytes.length + 2); // 4-bit mode + 8-bit length
  if (ver < 0) throw new Error("text too long for this QR encoder");
  const [nData, nEcc] = VERSIONS[ver];

  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4);
  put(bytes.length, 8);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, nData * 8 - bits.length)); // terminator
  put(0, (8 - (bits.length % 8)) % 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; data.length < nData; pad ^= 0xec ^ 0x11) data.push(pad);
  const codewords = [...data, ...rsRemainder(data, rsDivisor(nEcc))];

  const size = 17 + 4 * ver;
  const dark = Array.from({ length: size }, () => Array(size).fill(false));
  const fixed = Array.from({ length: size }, () => Array(size).fill(false));
  const set = (x, y, on) => {
    dark[y][x] = on;
    fixed[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0); // timing patterns
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) { // finders + separators
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && y >= 0 && x < size && y < size) set(x, y, d !== 2 && d !== 4);
      }
    }
  }
  if (ver > 1) { // versions 2-6 have a single alignment pattern
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(size - 7 + dx, size - 7 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }

  // Format info: level L (01), mask 0, BCH(15,5), XOR 0x5412.
  const fmt = 0b01000;
  let rem = fmt;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const f = ((fmt << 10) | rem) ^ 0x5412;
  const bit = (i) => ((f >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6));
  set(8, 8, bit(7));
  set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
  set(8, size - 8, true); // dark module

  // Data in a zigzag of two-module columns from the bottom right, then mask 0 ((x + y) even flips).
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (fixed[y][x]) continue;
        if (i < codewords.length * 8) dark[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
        i++;
        if ((x + y) % 2 === 0) dark[y][x] = !dark[y][x];
      }
    }
  }
  return dark;
}

/** QR matrix → SVG markup with a 4-module quiet zone. */
export function qrSvg(text, px = 220) {
  const m = qrMatrix(text);
  const n = m.length + 8;
  let d = "";
  m.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x + 4} ${y + 4}h1v1h-1z`)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${px}" height="${px}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree) {
  const result = Array(degree - 1).fill(0).concat([1]);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    divisor.forEach((coef, i) => (result[i] ^= gfMul(coef, factor)));
  }
  return result;
}
