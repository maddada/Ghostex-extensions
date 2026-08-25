#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionsRoot = join(repositoryRoot, 'extensions');
const semver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function compareIdentifier(left, right) {
  const leftNumber = /^\d+$/.test(left);
  const rightNumber = /^\d+$/.test(right);
  if (leftNumber && rightNumber) {
    const leftValue = BigInt(left);
    const rightValue = BigInt(right);
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  }
  if (leftNumber !== rightNumber) return leftNumber ? -1 : 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareVersions(left, right) {
  const leftMatch = semver.exec(left);
  const rightMatch = semver.exec(right);
  if (!leftMatch || !rightMatch) throw new Error(`Cannot compare invalid versions ${left} and ${right}`);
  for (let index = 1; index <= 3; index += 1) {
    const leftValue = BigInt(leftMatch[index]);
    const rightValue = BigInt(rightMatch[index]);
    if (leftValue !== rightValue) return leftValue < rightValue ? -1 : 1;
  }
  const leftPrerelease = leftMatch[4]?.split('.');
  const rightPrerelease = rightMatch[4]?.split('.');
  if (!leftPrerelease || !rightPrerelease) {
    if (!leftPrerelease && !rightPrerelease) return 0;
    return leftPrerelease ? -1 : 1;
  }
  for (let index = 0; index < Math.max(leftPrerelease.length, rightPrerelease.length); index += 1) {
    if (leftPrerelease[index] === undefined) return -1;
    if (rightPrerelease[index] === undefined) return 1;
    const difference = compareIdentifier(leftPrerelease[index], rightPrerelease[index]);
    if (difference !== 0) return difference;
  }
  return 0;
}

function manifestDirectories() {
  if (!existsSync(extensionsRoot)) return [];
  return readdirSync(extensionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(extensionsRoot, entry.name))
    .sort();
}

function manifestAtRef(baseRef, manifestPath) {
  const repositoryPath = relative(repositoryRoot, manifestPath).split('\\').join('/');
  const result = spawnSync('git', ['show', `${baseRef}:${repositoryPath}`], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  return JSON.parse(result.stdout);
}

export function checkPermissionBumps(baseRef) {
  if (!baseRef) throw new Error('Usage: node tooling/check-permission-bump.mjs <base-git-ref>');
  const baseCommit = spawnSync('git', ['rev-parse', '--verify', `${baseRef}^{commit}`], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  if (baseCommit.status !== 0) throw new Error(`Base git ref does not exist: ${baseRef}`);
  const failures = [];
  for (const extensionDir of manifestDirectories()) {
    const manifestPath = join(extensionDir, 'ghostex-extension.json');
    if (!existsSync(manifestPath)) continue;
    const current = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const base = manifestAtRef(baseRef, manifestPath);
    if (!base) continue;
    const basePermissions = new Set(base.permissions ?? []);
    const added = (current.permissions ?? []).filter((permission) => !basePermissions.has(permission));
    if (added.length > 0 && compareVersions(current.version, base.version) <= 0) {
      failures.push(
        `${basename(extensionDir)} adds permissions [${added.join(', ')}] but version ${current.version} is not greater than ${base.version}`
      );
    }
  }
  return failures;
}

function main() {
  try {
    const failures = checkPermissionBumps(process.argv[2]);
    if (failures.length > 0) {
      for (const failure of failures) console.error(failure);
      process.exitCode = 1;
      return;
    }
    console.log('Permission additions have valid version bumps.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
