// Run: what a folder is, which variants it can install, and which tools build it.
// The Gradle side is answered by Gradle itself (mobile-pane-variants.gradle), not by parsing builds.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { androidSdk } from "./android.mjs";

const MODES = ["debug", "profile", "release"];
const FVM_HOME = join(homedir(), "fvm");

function expandHome(value) {
  return value === "~" || value.startsWith("~/") ? join(homedir(), value.slice(1)) : value;
}

async function exists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function readText(path) {
  return (await readFile(path, "utf8").catch(() => "")).replace(/^\uFEFF/, "");
}

async function readJson(path, fallback) {
  const text = await readText(path);
  if (!text.trim()) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function exec(cmd, args, { cwd, env, timeout = 15000 } = {}) {
  return new Promise((resolvePromise) => {
    execFile(cmd, args, { cwd, env, timeout, maxBuffer: 32 << 20 }, (error, stdout, stderr) => {
      resolvePromise({
        ok: !error,
        code: error?.code ?? 0,
        stdout: String(stdout),
        stderr: String(stderr),
      });
    });
  });
}

// ---- project detection ------------------------------------------------------

/** A leading ~, a real path, must be a directory. Flutter (pubspec + android/) or Gradle (settings.gradle[.kts]). */
export async function detectProject(input) {
  const given = expandHome(String(input ?? "").trim());
  if (!given) throw new Error("Not a Flutter or Android Gradle project: (empty path)");
  let path = resolve(given);
  let info;
  try {
    info = await stat(path);
  } catch {
    throw new Error(`Not a Flutter or Android Gradle project: ${path}`);
  }
  if (!info.isDirectory()) throw new Error(`Not a directory: ${path}`);
  path = await realpath(path);

  // Picking <flutter project>/android means the Flutter project.
  if (basename(path) === "android" && (await isFile(join(dirname(path), "pubspec.yaml")))) {
    path = await realpath(dirname(path));
  }

  const fvmVersion = await readFvmVersion(path);
  if (await isFile(join(path, "pubspec.yaml"))) {
    if (!(await exists(join(path, "android")))) throw new Error("Flutter project has no android/ folder");
    return {
      path,
      name: basename(path),
      type: "flutter",
      fvmVersion,
      flutterSdk: await flutterSdkFor(fvmVersion),
    };
  }

  if ((await isFile(join(path, "settings.gradle"))) || (await isFile(join(path, "settings.gradle.kts")))) {
    return { path, name: basename(path), type: "gradle", fvmVersion: null, flutterSdk: null };
  }

  throw new Error(`Not a Flutter or Android Gradle project: ${path}`);
}

async function readFvmVersion(path) {
  const rc = await readJson(join(path, ".fvmrc"), null);
  const pinned = rc?.flutter ?? rc?.flutterSdkVersion;
  if (typeof pinned === "string" && pinned.trim()) return pinned.trim();
  const legacy = await readJson(join(path, ".fvm", "fvm_config.json"), null);
  const old = legacy?.flutterSdkVersion;
  return typeof old === "string" && old.trim() ? old.trim() : null;
}

/**
 * The SDK a Flutter project would run with. Pinned versions are used only from the fvm cache; a pin
 * that is not installed is reported, never silently replaced by the default SDK (the view offers Install).
 */
async function flutterSdkFor(pinned) {
  const versions = process.env.FVM_CACHE_PATH ? expandHome(process.env.FVM_CACHE_PATH) : join(FVM_HOME, "versions");
  if (pinned) {
    const bin = join(versions, pinned, "bin", "flutter");
    const installed = await isFile(bin);
    return { pinned, installed, bin: installed ? bin : null };
  }
  const fallback = join(FVM_HOME, "default", "bin", "flutter");
  if (await isFile(fallback)) return { pinned: null, installed: true, bin: fallback };
  const onPath = await findOnPath("flutter");
  return { pinned: null, installed: Boolean(onPath), bin: onPath };
}

/** First executable `name` in PATH, then in `extra` dirs (the server gets Ghostex's PATH, not the shell's). */
export async function findOnPath(name, extra = []) {
  for (const dir of new Set([...(process.env.PATH ?? "").split(":"), ...extra].filter(Boolean))) {
    const candidate = join(dir, name);
    if ((await isFile(candidate)) && (await access(candidate, fsConstants.X_OK).then(() => true, () => false))) return candidate;
  }
  return null;
}

// ---- variants ---------------------------------------------------------------

/** Gradle asks Gradle (cached by build-file fingerprint; `stale` takes any cached answer); Flutter is a fast file read. */
export async function listVariants(project, dataDir, { refresh = false, stale = false } = {}) {
  if (project.type === "flutter") return flutterVariants(project);
  if (!(await exists(join(project.path, "gradlew")))) throw new Error(`No gradlew in ${project.path}`);

  const cacheFile = join(dataDir, "run-variants.json");
  const cache = await readJson(cacheFile, {});
  const fingerprint = await variantFingerprint(project.path);
  const cached = cache[project.path];
  if (!refresh && cached && (stale || cached.fingerprint === fingerprint) && Array.isArray(cached.variants)) {
    return { type: "gradle", cachedAt: cached.cachedAt ?? new Date().toISOString(), variants: cached.variants };
  }

  const { env } = await toolchain(project);
  const script = join(dirname(fileURLToPath(import.meta.url)), "mobile-pane-variants.gradle");
  const result = await exec("sh", [
    "gradlew", "-q", "--console=plain", "--no-configuration-cache",
    "--init-script", script, "mobilePaneVariants",
  ], { cwd: project.path, env, timeout: 300000 });
  const output = `${result.stdout}\n${result.stderr}`.replace(/\r/g, "").trim();
  const variants = result.stdout
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.startsWith("MOBILE_PANE_VARIANT\t"))
    .map((line) => {
      const [, module, name, flavor, buildType, applicationId, installTask] = line.split("\t");
      return { module, name, flavor, buildType, applicationId, installTask };
    });
  if (!variants.length) {
    const tail = output.split("\n").slice(-30).join("\n");
    throw new Error(`Gradle listed no installable variants${result.ok ? "" : ` (exit ${result.code})`}:\n${tail}`);
  }

  const cachedAt = new Date().toISOString();
  cache[project.path] = { fingerprint, cachedAt, variants };
  await mkdir(dataDir, { recursive: true });
  await writeFile(cacheFile, `${JSON.stringify(cache, null, 2)}\n`);
  return { type: "gradle", cachedAt, variants };
}

async function flutterVariants(project) {
  const android = join(project.path, "android", "app");
  const buildFile = (await isFile(join(android, "build.gradle.kts")))
    ? join(android, "build.gradle.kts")
    : join(android, "build.gradle");
  const flavors = parseFlavors(await readText(buildFile));
  const entries = await readdir(join(project.path, "lib"), { withFileTypes: true }).catch(() => []);
  const targets = entries
    .filter((e) => e.isFile() && /^main.*\.dart$/.test(e.name))
    .map((e) => `lib/${e.name}`)
    .sort();
  const presets = parseLaunchJson(await readText(join(project.path, ".vscode", "launch.json")));
  return { type: "flutter", cachedAt: new Date().toISOString(), flavors, modes: [...MODES], targets, presets };
}

/** Names of the direct children of productFlavors { } (Groovy bare/quoted names, KTS create/register). */
export function parseFlavors(src) {
  src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"])\/\/.*$/gm, "$1");
  const m = /\bproductFlavors\s*\{/.exec(src);
  if (!m) return [];
  let depth = 1, top = "";
  for (let i = m.index + m[0].length; i < src.length && depth; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    if (depth === 1 && c !== "}") top += c;
    else if (depth === 2 && c === "{") top += "{";
  }
  const re = /(?:(?:create|register|maybeCreate|getByName)\s*\(\s*["']([^"']+)["']\s*\)|^\s*["']?([A-Za-z_][\w-]*)["']?)\s*\{/gm;
  return [...top.matchAll(re)].map(([, a, b]) => a ?? b);
}

/** .vscode/launch.json (JSONC) → Dart configurations as presets with flavor, mode, target and extra args. */
export function parseLaunchJson(src) {
  let data;
  try {
    data = JSON.parse(stripTrailingCommas(stripJsonComments(String(src ?? ""))));
  } catch {
    return [];
  }
  const configurations = Array.isArray(data?.configurations) ? data.configurations : [];
  const presets = [];
  for (const config of configurations) {
    if (!config || config.type !== "dart") continue;
    const tokens = [];
    for (const key of ["toolArgs", "args"]) {
      if (Array.isArray(config[key])) for (const arg of config[key]) if (typeof arg === "string") tokens.push(arg);
    }
    let flavor = null;
    let target = null;
    const args = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === "--flavor" && i + 1 < tokens.length) flavor = tokens[++i];
      else if (token.startsWith("--flavor=")) flavor = token.slice("--flavor=".length);
      else if ((token === "--target" || token === "-t") && i + 1 < tokens.length) target = tokens[++i];
      else if (token.startsWith("--target=")) target = token.slice("--target=".length);
      else args.push(token);
    }
    if (!target && typeof config.program === "string" && config.program) target = config.program;
    presets.push({
      name: typeof config.name === "string" && config.name ? config.name : `Preset ${presets.length + 1}`,
      flavor,
      mode: MODES.includes(config.flutterMode) ? config.flutterMode : "debug",
      target,
      args,
    });
  }
  return presets;
}

function stripJsonComments(src) {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i++;
    } else {
      out += c;
    }
  }
  return out;
}

function stripTrailingCommas(src) {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === ",") {
      let j = i + 1;
      while (j < src.length && /\s/.test(src[j])) j++;
      if (src[j] !== "}" && src[j] !== "]") out += c;
    } else {
      out += c;
    }
  }
  return out;
}

const SKIP_DIRS = new Set(["build", ".gradle", ".git", "node_modules"]);
const BUILD_FILE = /^(settings|build)\.gradle(\.kts)?$/;

/** sha1 of the sorted relative path:mtimeMs of the files that can change the variant list. */
async function variantFingerprint(root) {
  const files = [];
  async function walk(dir, depth) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = relative(root, full).split(sep).join("/");
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && depth < 3) await walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile() && !entry.isSymbolicLink()) continue;
      const relevant =
        BUILD_FILE.test(entry.name) ||
        entry.name === "gradle.properties" ||
        /(^|\/)gradle\/[^/]+\.toml$/.test(rel) ||
        /^(buildSrc|build-logic)\//.test(rel);
      if (!relevant) continue;
      const info = await stat(full).catch(() => null);
      files.push(`${rel}:${Math.round(info?.mtimeMs ?? 0)}`);
    }
  }
  await walk(root, 0);
  files.sort();
  return createHash("sha1").update(`${root}\n${files.join("\n")}`).digest("hex");
}

// ---- toolchain --------------------------------------------------------------

/** JAVA_HOME, ANDROID_HOME, the Flutter binary and an explicit PATH for every spawned command. */
export async function toolchain(project) {
  const javaHome = await findJavaHome();
  if (!javaHome) throw new Error("No Java found for Gradle. Install a JDK (brew install openjdk@17) or set JAVA_HOME.");
  const { sdk } = await androidSdk();
  if (!sdk) throw new Error("No Android SDK found. Install the Android SDK or set ANDROID_HOME.");

  const notes = [];
  let flutter = null;
  if (project.type === "flutter") {
    const fsdk = project.flutterSdk ?? (await flutterSdkFor(project.fvmVersion));
    flutter = fsdk.bin;
    if (fsdk.pinned && !fsdk.installed) notes.push(`Flutter ${fsdk.pinned} pinned in .fvmrc is not installed. Install it from the Run panel.`);
    else if (!flutter) notes.push("No Flutter SDK found. Install Flutter or run fvm install stable.");
  }

  const PATH = [...new Set([
    join(sdk, "platform-tools"),
    join(javaHome, "bin"),
    ...(flutter ? [dirname(flutter)] : []),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    ...(process.env.PATH ?? "").split(":").filter(Boolean),
  ])].join(":");
  const env = { ...process.env, ANDROID_HOME: sdk, JAVA_HOME: javaHome, PATH };
  return { env, flutter, notes };
}

async function findJavaHome() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(expandHome(process.env.JAVA_HOME));
  candidates.push(
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
    join(homedir(), "Applications/Android Studio.app/Contents/jbr/Contents/Home"),
  );
  const javaHome = await exec("/usr/libexec/java_home", [], { timeout: 5000 });
  if (javaHome.ok && javaHome.stdout.trim()) candidates.push(javaHome.stdout.trim());
  candidates.push(
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home",
  );
  for (const dir of await readdir("/Library/Java/JavaVirtualMachines").catch(() => [])) {
    candidates.push(join("/Library/Java/JavaVirtualMachines", dir, "Contents", "Home"));
  }
  for (const dir of candidates) if (await isFile(join(dir, "bin", "java"))) return dir;
  return null;
}

// ---- recent projects --------------------------------------------------------

/** Newest first: [ { path, name, type, last, usedAt } ]. */
export async function recentProjects(dataDir) {
  const stored = await readJson(join(dataDir, "run-projects.json"), []);
  const list = Array.isArray(stored) ? stored : Array.isArray(stored?.projects) ? stored.projects : [];
  return list
    .filter((entry) => entry && typeof entry.path === "string")
    .sort((a, b) => String(b.usedAt ?? "").localeCompare(String(a.usedAt ?? "")))
    .slice(0, 10);
}

/** Upserts the project, keeps the previous selection when `last` is not given, caps the list at 10. */
export async function rememberProject(dataDir, project, last) {
  const list = await recentProjects(dataDir);
  const previous = list.find((entry) => entry.path === project.path);
  const merged = {
    path: project.path,
    name: project.name,
    type: project.type,
    last: last !== undefined ? last : (previous?.last ?? null),
    usedAt: new Date().toISOString(),
  };
  const rest = list.filter((entry) => entry.path !== project.path);
  const next = [merged, ...rest].slice(0, 10);
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, "run-projects.json"), `${JSON.stringify(next, null, 2)}\n`);
}

// ---- CLI --------------------------------------------------------------------

function selfCheck() {
  let failed = 0;
  const check = (ok, message) => {
    if (!ok) {
      failed++;
      console.error(`FAIL ${message}`);
    }
  };

  const groovy = `
    android {
      productFlavors {
        dev {
          dimension "d"
          applicationIdSuffix ".dev"
        }
        fruitsProd { dimension "d" }
      }
    }`;
  check(JSON.stringify(parseFlavors(groovy)) === JSON.stringify(["dev", "fruitsProd"]), "Groovy bare flavor names");

  const kts = `
    android {
      flavorDimensions += "d"
      productFlavors {
        create("dev-ai") {
          dimension = "d"
          resValue(
            type = "string",
            name = "app_name",
            value = "Dev AI")
        }
        register("pwp") { dimension = "d" }
        // create("gone") { dimension = "d" }
        /* maybeCreate("also_gone") { } */
      }
    }`;
  check(JSON.stringify(parseFlavors(kts)) === JSON.stringify(["dev-ai", "pwp"]), "KTS create/register, comments skipped");
  check(JSON.stringify(parseFlavors("android { buildTypes { } }")) === "[]", "No productFlavors block → []");

  const launch = `{
    // Dart launch preset
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Uchi Fruits dev",
        "request": "launch",
        "type": "dart",
        "flutterMode": "debug",
        "toolArgs": ["--flavor", "fruitsDev", "--dart-define=APP_FLAVOR=fruitsDev"],
      },
      { "name": "Other", "type": "node", "args": [] },
      { "name": "Target", "type": "dart", "program": "lib/main_prod.dart", "flutterMode": "release", "args": ["--flavor=prod", "--dart-define=A=1"] }
    ],
  }`;
  const presets = parseLaunchJson(launch);
  check(presets.length === 2, "launch.json: only dart configurations");
  check(presets[0]?.flavor === "fruitsDev" && presets[0]?.mode === "debug" && presets[0]?.target === null, "launch.json: --flavor x + flutterMode");
  check(JSON.stringify(presets[0]?.args) === JSON.stringify(["--dart-define=APP_FLAVOR=fruitsDev"]), "launch.json: extra args kept");
  check(presets[1]?.flavor === "prod" && presets[1]?.target === "lib/main_prod.dart" && presets[1]?.mode === "release", "launch.json: --flavor=x, program, release");
  check(JSON.stringify(parseLaunchJson("{ nope")) === "[]", "launch.json: bad JSON → []");

  if (failed) {
    console.error(`self-check failed: ${failed}`);
    process.exitCode = 1;
  } else {
    console.log("self-check ok");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === "--self-check") {
    selfCheck();
  } else if (!arg) {
    console.error("usage: node src/project.mjs <project path> | --self-check");
    process.exitCode = 1;
  } else {
    const dataDir = process.env.GHOSTEX_EXTENSION_DATA_DIR || join(homedir(), ".local/share/ghostex/extensions/data/mobile-pane-plugin");
    const project = await detectProject(arg);
    const variants = await listVariants(project, dataDir);
    const tools = await toolchain(project);
    console.log(JSON.stringify({ project, variants, toolchain: { flutter: tools.flutter, notes: tools.notes, JAVA_HOME: tools.env.JAVA_HOME } }, null, 2));
  }
}
