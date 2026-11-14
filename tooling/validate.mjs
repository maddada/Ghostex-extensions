#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { validatePanelDocument } from "./validate-panel.mjs";
import { fileURLToPath, pathToFileURL } from "node:url";

const WEB_PLACEMENTS = new Set(["view", "chat-bar", "popup", "modal"]);
const PERMISSIONS = new Set([
  "exec",
  "cli",
  "ssh",
  "network",
  "clipboard",
  // Scoped permissions of sidebar extensions: they reach only the extension API (/api/ext/v1)
  // and the panel actions Ghostex runs.
  "projects.read",
  "sessions.read",
  "sessions.open",
  "agents.start",
]);
const PREFERENCE_TYPES = new Set([
  "textfield",
  "password",
  "checkbox",
  "dropdown",
  "file",
  "directory",
]);
const COMMON_FIELDS = new Set([
  "$schema",
  "name",
  "title",
  "description",
  "version",
  "author",
  "icon",
  "categories",
  "preferences",
  "permissions",
  "skill",
]);
const WEB_FIELDS = new Set([
  ...COMMON_FIELDS,
  "placements",
  "defaultPlacement",
  "server",
  "modal",
  "popup",
]);
const TERMINAL_FIELDS = new Set([...COMMON_FIELDS, "kind", "terminal"]);
const SIDEBAR_FIELDS = new Set([...COMMON_FIELDS, "kind", "sidebar", "sidePanel", "server"]);
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, allowed, at, errors) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${at}.${key} is not allowed`);
  }
}

function requireObject(value, at, errors) {
  if (!isObject(value)) {
    errors.push(`${at} must be an object`);
    return false;
  }
  return true;
}

function requireNonEmptyString(value, at, errors) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${at} must be a non-empty string`);
    return false;
  }
  return true;
}

function validateUniqueStringArray(value, at, options, errors) {
  if (!Array.isArray(value) || (options.nonEmpty && value.length === 0)) {
    errors.push(`${at} must be ${options.nonEmpty ? "a non-empty" : "an"} array`);
    return;
  }

  const seen = new Set();
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || item.length === 0) {
      errors.push(`${at}[${index}] must be a non-empty string`);
      continue;
    }
    if (options.allowed && !options.allowed.has(item)) {
      errors.push(`${at}[${index}] has unsupported value ${JSON.stringify(item)}`);
    }
    if (seen.has(item)) errors.push(`${at} must not contain duplicate ${JSON.stringify(item)}`);
    seen.add(item);
  }
}

function validateSize(value, at, maximumWidth, maximumHeight, errors) {
  if (!requireObject(value, at, errors)) return;
  hasOnlyKeys(value, new Set(["width", "height"]), at, errors);

  for (const [key, maximum] of [
    ["width", maximumWidth],
    ["height", maximumHeight],
  ]) {
    if (!Number.isInteger(value[key]) || value[key] < 1 || value[key] > maximum) {
      errors.push(`${at}.${key} must be an integer from 1 through ${maximum}`);
    }
  }
}

function validatePreferences(preferences, errors) {
  if (!Array.isArray(preferences)) {
    errors.push("manifest.preferences must be an array");
    return;
  }

  const names = new Set();
  for (const [index, preference] of preferences.entries()) {
    const at = `manifest.preferences[${index}]`;
    if (!requireObject(preference, at, errors)) continue;
    hasOnlyKeys(
      preference,
      new Set([
        "name",
        "title",
        "description",
        "type",
        "required",
        "default",
        "placeholder",
        "data",
      ]),
      at,
      errors,
    );

    if (
      !requireNonEmptyString(preference.name, `${at}.name`, errors) ||
      !/^[A-Za-z][A-Za-z0-9_-]*$/.test(preference.name)
    ) {
      if (typeof preference.name === "string" && preference.name.length > 0) {
        errors.push(`${at}.name must start with a letter and contain only letters, digits, _ or -`);
      }
    } else if (names.has(preference.name)) {
      errors.push(`manifest.preferences contains duplicate name ${JSON.stringify(preference.name)}`);
    } else {
      names.add(preference.name);
    }

    requireNonEmptyString(preference.title, `${at}.title`, errors);
    requireNonEmptyString(preference.description, `${at}.description`, errors);
    if (!PREFERENCE_TYPES.has(preference.type)) {
      errors.push(`${at}.type must be one of ${[...PREFERENCE_TYPES].join(", ")}`);
    }
    if ("required" in preference && typeof preference.required !== "boolean") {
      errors.push(`${at}.required must be a boolean`);
    }
    if (
      "default" in preference &&
      !["string", "boolean", "number"].includes(typeof preference.default)
    ) {
      errors.push(`${at}.default must be a string, boolean, or number`);
    }
    if ("placeholder" in preference && typeof preference.placeholder !== "string") {
      errors.push(`${at}.placeholder must be a string`);
    }
    if ("data" in preference) validatePreferenceData(preference.data, `${at}.data`, errors);
  }
}

function validatePreferenceData(data, at, errors) {
  if (!Array.isArray(data) || data.length === 0) {
    errors.push(`${at} must be a non-empty array`);
    return;
  }
  for (const [index, item] of data.entries()) {
    const itemAt = `${at}[${index}]`;
    if (!requireObject(item, itemAt, errors)) continue;
    hasOnlyKeys(item, new Set(["title", "value"]), itemAt, errors);
    requireNonEmptyString(item.title, `${itemAt}.title`, errors);
    requireNonEmptyString(item.value, `${itemAt}.value`, errors);
  }
}

function validateInstall(install, errors) {
  if (!requireObject(install, "manifest.server.install", errors)) return;
  const platforms = Object.entries(install);
  if (platforms.length === 0) errors.push("manifest.server.install must not be empty");

  for (const [platform, artifact] of platforms) {
    const at = `manifest.server.install.${platform}`;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(platform)) {
      errors.push(`${at} has an invalid platform key`);
    }
    if (!requireObject(artifact, at, errors)) continue;
    hasOnlyKeys(artifact, new Set(["url", "sha256"]), at, errors);
    if (requireNonEmptyString(artifact.url, `${at}.url`, errors)) {
      try {
        new URL(artifact.url);
      } catch {
        errors.push(`${at}.url must be an absolute URL`);
      }
    }
    if (typeof artifact.sha256 !== "string" || !/^[A-Fa-f0-9]{64}$/.test(artifact.sha256)) {
      errors.push(`${at}.sha256 must be exactly 64 hexadecimal characters`);
    }
  }
}

function isLoopbackHostname(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "[::1]" || host === "::1") return true;
  if (!/^127(?:\.\d{1,3}){3}$/.test(host)) return false;
  return host
    .split(".")
    .slice(1)
    .every((octet) => Number(octet) <= 255);
}

function validateServerUrl(value, errors) {
  const at = "manifest.server.url";
  if (!requireNonEmptyString(value, at, errors)) return;

  let url;
  try {
    url = new URL(value);
  } catch {
    errors.push(`${at} must be an absolute http or https URL`);
    return;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    errors.push(`${at} must use the http or https scheme`);
    return;
  }
  if (url.hostname.length === 0) {
    errors.push(`${at} must include a host`);
    return;
  }
  if (url.protocol === "http:" && !isLoopbackHostname(url.hostname)) {
    errors.push(`${at} must use https unless the host is loopback`);
  }
}

function validateServer(server, errors) {
  if (!requireObject(server, "manifest.server", errors)) return;
  const variants = ["static", "command", "url"].filter((key) => Object.hasOwn(server, key));
  if (variants.length !== 1) {
    errors.push("manifest.server must contain exactly one of static, command, or url");
    return;
  }

  if (variants[0] === "static") {
    hasOnlyKeys(server, new Set(["static"]), "manifest.server", errors);
    requireNonEmptyString(server.static, "manifest.server.static", errors);
    return;
  }

  if (variants[0] === "url") {
    hasOnlyKeys(server, new Set(["url"]), "manifest.server", errors);
    validateServerUrl(server.url, errors);
    return;
  }

  hasOnlyKeys(
    server,
    new Set(["command", "cwd", "readiness", "install"]),
    "manifest.server",
    errors,
  );
  requireNonEmptyString(server.command, "manifest.server.command", errors);
  if ("cwd" in server) requireNonEmptyString(server.cwd, "manifest.server.cwd", errors);

  if (requireObject(server.readiness, "manifest.server.readiness", errors)) {
    hasOnlyKeys(
      server.readiness,
      new Set(["httpGet", "timeoutSeconds"]),
      "manifest.server.readiness",
      errors,
    );
    if (
      requireNonEmptyString(
        server.readiness.httpGet,
        "manifest.server.readiness.httpGet",
        errors,
      ) &&
      !server.readiness.httpGet.startsWith("/")
    ) {
      errors.push("manifest.server.readiness.httpGet must start with /");
    }
    if (
      "timeoutSeconds" in server.readiness &&
      (!Number.isInteger(server.readiness.timeoutSeconds) || server.readiness.timeoutSeconds < 1)
    ) {
      errors.push("manifest.server.readiness.timeoutSeconds must be a positive integer");
    }
  }
  if ("install" in server) validateInstall(server.install, errors);
}

function validateTerminal(terminal, errors) {
  if (!requireObject(terminal, "manifest.terminal", errors)) return;
  hasOnlyKeys(terminal, new Set(["command", "cwd", "requires"]), "manifest.terminal", errors);
  requireNonEmptyString(terminal.command, "manifest.terminal.command", errors);
  if ("cwd" in terminal) requireNonEmptyString(terminal.cwd, "manifest.terminal.cwd", errors);
  if ("requires" in terminal) {
    validateUniqueStringArray(
      terminal.requires,
      "manifest.terminal.requires",
      { nonEmpty: false },
      errors,
    );
  }
}

function validateSidebarManifest(manifest, errors) {
  const { sidebar, sidePanel } = manifest;
  if (sidebar === undefined && sidePanel === undefined) {
    errors.push("a sidebar extension needs manifest.sidebar (a mode or sections), manifest.sidePanel, or both");
  }
  if (sidebar !== undefined && requireObject(sidebar, "manifest.sidebar", errors)) {
    hasOnlyKeys(sidebar, new Set(["mode", "sections", "panel"]), "manifest.sidebar", errors);
    const hasSections = Array.isArray(sidebar.sections) && sidebar.sections.length > 0;
    if (sidebar.mode === undefined && !hasSections) {
      errors.push("manifest.sidebar needs a mode, sections, or both");
    }
    if (sidebar.mode !== undefined && requireObject(sidebar.mode, "manifest.sidebar.mode", errors)) {
      hasOnlyKeys(sidebar.mode, new Set(["title", "icon"]), "manifest.sidebar.mode", errors);
      requireNonEmptyString(sidebar.mode.title, "manifest.sidebar.mode.title", errors);
      if ("icon" in sidebar.mode) requireSvgPath(sidebar.mode.icon, "manifest.sidebar.mode.icon", errors);
    }
    if ("sections" in sidebar) {
      if (!Array.isArray(sidebar.sections)) {
        errors.push("manifest.sidebar.sections must be an array");
      } else {
        const blocks = new Set();
        for (const [index, section] of sidebar.sections.entries()) {
          const at = `manifest.sidebar.sections[${index}]`;
          if (!requireObject(section, at, errors)) continue;
          hasOnlyKeys(section, new Set(["block", "where"]), at, errors);
          if (requireNonEmptyString(section.block, `${at}.block`, errors)) {
            if (blocks.has(section.block)) errors.push(`${at}.block repeats ${JSON.stringify(section.block)}`);
            blocks.add(section.block);
          }
          if (section.where !== "projectsTop" && section.where !== "projectsBottom") {
            errors.push(`${at}.where must be projectsTop or projectsBottom`);
          }
        }
      }
    }
    if ("panel" in sidebar) requireJsonPath(sidebar.panel, "manifest.sidebar.panel", errors);
  }
  if (sidePanel !== undefined && requireObject(sidePanel, "manifest.sidePanel", errors)) {
    hasOnlyKeys(sidePanel, new Set(["title", "icon", "scope", "panel"]), "manifest.sidePanel", errors);
    requireNonEmptyString(sidePanel.title, "manifest.sidePanel.title", errors);
    if ("icon" in sidePanel) requireSvgPath(sidePanel.icon, "manifest.sidePanel.icon", errors);
    if ("scope" in sidePanel && sidePanel.scope !== "global" && sidePanel.scope !== "session") {
      errors.push("manifest.sidePanel.scope must be global or session");
    }
    if ("panel" in sidePanel) requireJsonPath(sidePanel.panel, "manifest.sidePanel.panel", errors);
  }
  if ("server" in manifest) {
    if (isObject(manifest.server) && Object.hasOwn(manifest.server, "url")) {
      errors.push("manifest.server of a sidebar extension is a command or a static folder, not a url");
    } else {
      validateServer(manifest.server, errors);
    }
  }
}

function requireRelativePath(value, at, errors) {
  if (!requireNonEmptyString(value, at, errors)) return false;
  if (value.startsWith("/") || value.split(/[\\/]/).includes("..")) {
    errors.push(`${at} must stay inside the extension folder`);
    return false;
  }
  return true;
}

function requireSvgPath(value, at, errors) {
  if (requireRelativePath(value, at, errors) && !value.toLowerCase().endsWith(".svg")) {
    errors.push(`${at} must reference an SVG file`);
  }
}

function requireJsonPath(value, at, errors) {
  if (requireRelativePath(value, at, errors) && !value.toLowerCase().endsWith(".json")) {
    errors.push(`${at} must reference a JSON file`);
  }
}

export function validateManifest(manifest, options = {}) {
  const errors = [];
  if (!requireObject(manifest, "manifest", errors)) return errors;

  const isTerminal = manifest.kind === "terminal-pane";
  const isSidebar = manifest.kind === "sidebar";
  const allowedFields = isTerminal ? TERMINAL_FIELDS : isSidebar ? SIDEBAR_FIELDS : WEB_FIELDS;
  hasOnlyKeys(manifest, allowedFields, "manifest", errors);

  for (const field of ["name", "title", "description", "version", "author", "icon"]) {
    requireNonEmptyString(manifest[field], `manifest.${field}`, errors);
  }
  if (typeof manifest.name === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name)) {
    errors.push("manifest.name must be kebab-case");
  }
  if (typeof manifest.version === "string" && !SEMVER.test(manifest.version)) {
    errors.push("manifest.version must be valid Semantic Versioning 2.0.0");
  }
  if (typeof manifest.icon === "string" && !/\.svg$/.test(manifest.icon)) {
    errors.push("manifest.icon must reference an SVG path");
  }
  if ("$schema" in manifest && typeof manifest.$schema !== "string") {
    errors.push("manifest.$schema must be a string");
  }

  validateUniqueStringArray(
    manifest.categories,
    "manifest.categories",
    { nonEmpty: true },
    errors,
  );
  if ("permissions" in manifest) {
    validateUniqueStringArray(
      manifest.permissions,
      "manifest.permissions",
      { nonEmpty: false, allowed: PERMISSIONS },
      errors,
    );
  }
  if ("preferences" in manifest) validatePreferences(manifest.preferences, errors);
  if ("skill" in manifest) validateSkill(manifest.skill, errors);

  if (isTerminal) {
    validateTerminal(manifest.terminal, errors);
  } else if (isSidebar) {
    validateSidebarManifest(manifest, errors);
  } else {
    if ("kind" in manifest) errors.push('manifest.kind must be "terminal-pane" or "sidebar" when present');
    validateUniqueStringArray(
      manifest.placements,
      "manifest.placements",
      { nonEmpty: true, allowed: WEB_PLACEMENTS },
      errors,
    );
    if (!WEB_PLACEMENTS.has(manifest.defaultPlacement)) {
      errors.push(`manifest.defaultPlacement must be one of ${[...WEB_PLACEMENTS].join(", ")}`);
    } else if (
      Array.isArray(manifest.placements) &&
      !manifest.placements.includes(manifest.defaultPlacement)
    ) {
      errors.push("manifest.defaultPlacement must be included in manifest.placements");
    }
    validateServer(manifest.server, errors);
    if ("modal" in manifest) validateSize(manifest.modal, "manifest.modal", 1400, 900, errors);
    if ("popup" in manifest) validateSize(manifest.popup, "manifest.popup", 420, 640, errors);
  }

  if (options.folderName && manifest.name !== options.folderName) {
    errors.push(
      `manifest.name ${JSON.stringify(manifest.name)} must match folder ${JSON.stringify(options.folderName)}`,
    );
  }
  return errors;
}

export function validateManifestFile(manifestPath) {
  const inputPath = resolve(manifestPath);
  const absolutePath =
    existsSync(inputPath) && statSync(inputPath).isDirectory()
      ? join(inputPath, "ghostex-extension.json")
      : inputPath;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(absolutePath, "utf8"));
  } catch (error) {
    return [`${absolutePath}: ${error.message}`];
  }

  const errors = validateManifest(manifest, { folderName: basename(dirname(absolutePath)) });
  if (errors.length === 0 && manifest.kind === "sidebar") {
    errors.push(...validateSidebarFiles(manifest, dirname(absolutePath)));
  }
  if (errors.length === 0 && manifest.skill) {
    errors.push(...validateSkillFiles(manifest.skill, dirname(absolutePath)));
  }
  return errors.map((error) => `${absolutePath}: ${error}`);
}

/**
 * An agent skill the extension ships (Ghostex 11.8 and newer): a folder in the package with SKILL.md.
 * Ghostex asks whether to install it when the extension is installed, and removes it with the extension.
 */
function validateSkill(skill, errors) {
  if (!requireObject(skill, "manifest.skill", errors)) return;
  hasOnlyKeys(skill, new Set(["name", "path"]), "manifest.skill", errors);
  if (typeof skill.name !== "string" || skill.name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name)) {
    errors.push("manifest.skill.name must be a kebab-case name of at most 64 characters");
  }
  requireRelativePath(skill.path, "manifest.skill.path", errors);
}

/** The skill folder holds SKILL.md, whose frontmatter `name` is the manifest's, as Ghostex checks at install. */
function validateSkillFiles(skill, extensionDir) {
  const path = join(extensionDir, skill.path, "SKILL.md");
  if (!existsSync(path)) return [`manifest.skill.path ${skill.path} has no SKILL.md`];
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path, "utf8"));
  const name = frontmatter && /^name:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(frontmatter[1]);
  if (!name) return [`${skill.path}/SKILL.md needs a name: in its frontmatter`];
  if (name[1] !== skill.name) {
    return [`${skill.path}/SKILL.md is named ${JSON.stringify(name[1])}, but manifest.skill.name is ${JSON.stringify(skill.name)}`];
  }
  return [];
}

/** The panel files and icons a sidebar extension ships, checked as Ghostex checks them at install. */
function validateSidebarFiles(manifest, extensionDir) {
  const errors = [];
  const declared = new Set(manifest.permissions ?? []);
  const readPanel = (relativePath, at) => {
    const path = join(extensionDir, relativePath);
    if (!existsSync(path)) {
      errors.push(`${at} ${relativePath} does not exist`);
      return null;
    }
    let document;
    try {
      document = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      errors.push(`${relativePath}: ${error.message}`);
      return null;
    }
    const panelErrors = validatePanelDocument(document, { permissions: declared });
    errors.push(...panelErrors.map((error) => `${relativePath}: ${error}`));
    return panelErrors.length === 0 ? document : null;
  };
  for (const [icon, at] of [
    [manifest.sidebar?.mode?.icon, "manifest.sidebar.mode.icon"],
    [manifest.sidePanel?.icon, "manifest.sidePanel.icon"],
  ]) {
    if (icon && !existsSync(join(extensionDir, icon))) errors.push(`${at} ${icon} does not exist`);
  }
  if (manifest.sidebar?.panel) {
    const document = readPanel(manifest.sidebar.panel, "manifest.sidebar.panel");
    for (const section of manifest.sidebar.sections ?? []) {
      if (document && !document.blocks.some((block) => block.id === section.block)) {
        errors.push(`manifest.sidebar.sections names block ${JSON.stringify(section.block)}, which ${manifest.sidebar.panel} doesn't have`);
      }
    }
  }
  if (manifest.sidePanel?.panel) readPanel(manifest.sidePanel.panel, "manifest.sidePanel.panel");
  return errors;
}

function defaultManifestPaths() {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const paths = [];
  for (const parent of ["templates", "extensions"]) {
    const parentPath = join(repositoryRoot, parent);
    if (!existsSync(parentPath)) continue;
    for (const entry of readdirSync(parentPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = join(parentPath, entry.name, "ghostex-extension.json");
      if (existsSync(manifestPath)) paths.push(manifestPath);
    }
  }
  return paths.sort();
}

function main() {
  const panelFlag = process.argv.indexOf("--panel");
  if (panelFlag !== -1) {
    // node tooling/validate.mjs --panel panel.json [--permissions a,b]: one panel document.
    const panelPath = process.argv[panelFlag + 1];
    const permissionsFlag = process.argv.indexOf("--permissions");
    const permissions =
      permissionsFlag === -1 ? PERMISSIONS : new Set((process.argv[permissionsFlag + 1] ?? "").split(",").filter(Boolean));
    let errors;
    try {
      errors = validatePanelDocument(JSON.parse(readFileSync(resolve(panelPath), "utf8")), { permissions });
    } catch (error) {
      errors = [error.message];
    }
    if (errors.length > 0) {
      for (const error of errors) console.error(`${panelPath}: ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`Validated panel ${panelPath}.`);
    }
    return;
  }
  const manifestPaths = process.argv.slice(2);
  const paths = manifestPaths.length > 0 ? manifestPaths : defaultManifestPaths();
  if (paths.length === 0) {
    console.error("No extension manifests found.");
    process.exitCode = 1;
    return;
  }

  const errors = paths.flatMap(validateManifestFile);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log(`Validated ${paths.length} extension manifest${paths.length === 1 ? "" : "s"}.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
