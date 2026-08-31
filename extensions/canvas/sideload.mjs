#!/usr/bin/env node
/**
 * Sideloads the built extension into the running Ghostex.
 *
 * `gx extensions install-local` copies the whole folder and refuses any
 * symlink inside it, so a development folder with `node_modules/` cannot be
 * installed directly. This stages exactly the payload Ghostex runs — manifest,
 * icon, docs, and `dist/` — into a clean temporary folder named after the
 * extension, and installs that.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const extensionId = 'canvas';
const payload = [
  'ghostex-extension.json',
  'icon.svg',
  'README.md',
  'CHANGELOG.md',
  'THIRD_PARTY_NOTICES.md',
  'dist',
  'metadata',
];

if (!existsSync(join(root, 'dist', 'app.js'))) {
  console.error('dist/ is missing or stale. Run `npm run build` first.');
  process.exit(1);
}

const workDir = mkdtempSync(join(tmpdir(), 'ghostex-canvas-sideload-'));
const staged = join(workDir, extensionId);
mkdirSync(staged);

try {
  for (const entry of payload) {
    const source = join(root, entry);
    if (existsSync(source)) cpSync(source, join(staged, entry), { recursive: true });
  }

  const result = spawnSync('gx', ['extensions', 'install-local', staged], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);

  console.log(`Installed ${extensionId}. Pin it with: gx extensions state ${extensionId} --set pinned=true`);
} finally {
  rmSync(workDir, { force: true, recursive: true });
}
