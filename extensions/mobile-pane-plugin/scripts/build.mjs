// Builds the self-contained dist/ Ghostex runs: src/ plus the pinned runtime packages (serve-sim, ws)
// from node_modules (`npm ci --ignore-scripts` first). Reproducible: same lockfile, same dist.
import { cpSync, rmSync, readFileSync, lstatSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const SCRCPY_JAR = "src/vendor/scrcpy-server-v5.0.1.jar";
const SCRCPY_SHA256 = "764eb6f79811d5211fe9df341120882ba9994c7a61b897d7bf3fb662e53bc536"; // official v5.0.1 release asset

const sha = createHash("sha256").update(readFileSync(join(root, SCRCPY_JAR))).digest("hex");
if (sha !== SCRCPY_SHA256) throw new Error(`${SCRCPY_JAR} sha256 ${sha} does not match the pinned release`);

rmSync(join(root, "dist"), { recursive: true, force: true });
cpSync(join(root, "src"), join(root, "dist"), { recursive: true });
const vendor = join(root, "dist/vendor/node_modules");
for (const [pkg, parts] of [["serve-sim", ["package.json", "dist"]], ["ws", ["package.json", "LICENSE", "index.js", "wrapper.mjs", "lib"]]]) {
  for (const part of parts) cpSync(join(root, "node_modules", pkg, part), join(vendor, pkg, part), { recursive: true });
}

// Ghostex refuses local extensions that contain symlinks.
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (lstatSync(p).isSymbolicLink()) throw new Error(`symlink in dist: ${p}`);
  return lstatSync(p).isDirectory() ? walk(p) : [p];
});
console.log(`dist/ built: ${walk(join(root, "dist")).length} files`);
