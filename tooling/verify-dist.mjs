#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionsRoot = join(repositoryRoot, 'extensions');
const lockfiles = ['bun.lock', 'bun.lockb', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
const ignoredCopyNames = new Set(['.git', 'node_modules']);
const exactVersion =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const buildRecipeOverrides = new Map([
  // TODO(extension maintainers): add [extension-id, { install, build }] when
  // the package manager defaults below do not match the documented build.
]);

function extensionDirectories() {
  if (!existsSync(extensionsRoot)) return [];
  return readdirSync(extensionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(extensionsRoot, entry.name))
    .sort();
}

function assertPinnedDependencies(extensionDir) {
  const packagePath = join(extensionDir, 'package.json');
  if (!existsSync(packagePath)) return;
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
      if (typeof version !== 'string' || !exactVersion.test(version)) {
        throw new Error(
          `${relative(repositoryRoot, packagePath)}: ${section}.${name} must be an exact registry version`
        );
      }
    }
  }
}

function defaultRecipe(extensionDir, lockfile) {
  const packagePath = join(extensionDir, 'package.json');
  if (!existsSync(packagePath)) {
    throw new Error(`${relative(repositoryRoot, extensionDir)} has ${lockfile} but no package.json`);
  }
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (typeof packageJson.scripts?.build !== 'string' || packageJson.scripts.build.length === 0) {
    throw new Error(`${relative(repositoryRoot, packagePath)} must document the reproducible build in scripts.build`);
  }

  if (lockfile === 'bun.lock' || lockfile === 'bun.lockb') {
    return {
      install: ['bun', 'install', '--frozen-lockfile', '--ignore-scripts'],
      build: ['bun', 'run', 'build'],
    };
  }
  if (lockfile === 'package-lock.json') {
    return {
      install: ['npm', 'ci', '--ignore-scripts'],
      build: ['npm', 'run', 'build'],
    };
  }
  if (lockfile === 'pnpm-lock.yaml') {
    return {
      install: ['corepack', 'pnpm', 'install', '--frozen-lockfile', '--ignore-scripts'],
      build: ['corepack', 'pnpm', 'run', 'build'],
    };
  }
  return {
    install: ['corepack', 'yarn', 'install', '--frozen-lockfile', '--ignore-scripts'],
    build: ['corepack', 'yarn', 'run', 'build'],
  };
}

function buildRecipe(extensionDir, lockfile) {
  const recipe = buildRecipeOverrides.get(basename(extensionDir)) ?? defaultRecipe(extensionDir, lockfile);
  for (const key of ['install', 'build']) {
    if (!Array.isArray(recipe[key]) || recipe[key].some((part) => typeof part !== 'string' || !part)) {
      throw new Error(`${basename(extensionDir)} build recipe ${key} must be a non-empty argv array`);
    }
  }
  if (!recipe.install.includes('--ignore-scripts')) {
    throw new Error(`${basename(extensionDir)} install recipe must include --ignore-scripts`);
  }
  return recipe;
}

function runCommand(command, cwd) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command.join(' ')} failed with exit code ${result.status}`);
  }
}

function copyExtension(source, destination) {
  cpSync(source, destination, {
    recursive: true,
    filter: (path) => !ignoredCopyNames.has(basename(path)),
  });
}

function directorySnapshot(root, current = root) {
  if (!existsSync(current)) return new Map();
  const snapshot = new Map();
  for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolutePath = join(current, entry.name);
    const relativePath = relative(root, absolutePath).split(sep).join('/');
    if (entry.isSymbolicLink()) {
      throw new Error(`Symlinks are not supported in reproducible dist/: ${absolutePath}`);
    }
    if (entry.isDirectory()) {
      snapshot.set(`${relativePath}/`, null);
      for (const [path, value] of directorySnapshot(root, absolutePath)) snapshot.set(path, value);
    } else if (entry.isFile()) {
      snapshot.set(relativePath, readFileSync(absolutePath));
    }
  }
  return snapshot;
}

function compareDirectories(expectedDir, actualDir) {
  const expected = directorySnapshot(expectedDir);
  const actual = directorySnapshot(actualDir);
  const paths = [...new Set([...expected.keys(), ...actual.keys()])].sort();
  const differences = [];
  for (const path of paths) {
    if (!expected.has(path)) differences.push(`unexpected generated path: ${path}`);
    else if (!actual.has(path)) differences.push(`missing generated path: ${path}`);
    else {
      const expectedValue = expected.get(path);
      const actualValue = actual.get(path);
      if ((expectedValue === null) !== (actualValue === null)) {
        differences.push(`path type differs: ${path}`);
      } else if (expectedValue !== null && !expectedValue.equals(actualValue)) {
        differences.push(`content differs: ${path}`);
      }
    }
  }
  return differences;
}

function verifyExtension(extensionDir) {
  assertPinnedDependencies(extensionDir);
  const sourceDirectory = join(extensionDir, 'src');
  if (!existsSync(sourceDirectory) || !lstatSync(sourceDirectory).isDirectory()) return false;
  const presentLockfiles = lockfiles.filter((name) => {
    const path = join(extensionDir, name);
    return existsSync(path) && lstatSync(path).isFile();
  });
  if (presentLockfiles.length === 0) return false;
  if (presentLockfiles.length > 1) {
    throw new Error(`${relative(repositoryRoot, extensionDir)} must contain exactly one supported lockfile`);
  }

  const committedDist = join(extensionDir, 'dist');
  if (!existsSync(committedDist) || !lstatSync(committedDist).isDirectory()) {
    throw new Error(`${relative(repositoryRoot, extensionDir)} must commit dist/`);
  }

  const temporaryRoot = mkdtempSync(join(tmpdir(), 'ghostex-extension-dist-'));
  const temporaryExtension = join(temporaryRoot, basename(extensionDir));
  try {
    copyExtension(extensionDir, temporaryExtension);
    rmSync(join(temporaryExtension, 'dist'), { force: true, recursive: true });
    const recipe = buildRecipe(extensionDir, presentLockfiles[0]);
    runCommand(recipe.install, temporaryExtension);
    runCommand(recipe.build, temporaryExtension);
    const differences = compareDirectories(committedDist, join(temporaryExtension, 'dist'));
    if (differences.length > 0) {
      throw new Error(
        `${relative(repositoryRoot, extensionDir)}/dist is not reproducible:\n${differences.map((item) => `  - ${item}`).join('\n')}`
      );
    }
    return true;
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

export function verifyDistributions() {
  let verified = 0;
  let skipped = 0;
  for (const extensionDir of extensionDirectories()) {
    if (verifyExtension(extensionDir)) verified += 1;
    else skipped += 1;
  }
  return { verified, skipped };
}

function main() {
  try {
    const result = verifyDistributions();
    console.log(
      `Verified ${result.verified} reproducible dist${result.verified === 1 ? '' : 's'}; ${result.skipped} had no source lockfile build.`
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
