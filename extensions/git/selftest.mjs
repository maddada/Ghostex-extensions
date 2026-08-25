#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseUnifiedDiff, summarizeDiff } from './src/diff-parser.mjs';

if (!process.argv.includes('--selftest')) {
  console.error('Usage: node extensions/git/selftest.mjs --selftest');
  process.exitCode = 1;
} else {
  const extensionRoot = dirname(fileURLToPath(import.meta.url));
  const fixture = readFileSync(join(extensionRoot, 'fixtures', 'sample.diff'), 'utf8');
  const files = parseUnifiedDiff(fixture);
  const summary = summarizeDiff(files);

  assert.equal(files.length, 2, 'parses both file sections');
  assert.equal(files[0].oldPath, 'src/app.js', 'normalizes the old path');
  assert.equal(files[0].newPath, 'src/app.js', 'normalizes the new path');
  assert.equal(files[0].hunks[0].oldStart, 1, 'reads the old hunk start');
  assert.equal(files[0].hunks[0].newCount, 5, 'reads the new hunk count');
  assert.deepEqual(summary, {
    files: 2,
    hunks: 2,
    additions: 3,
    deletions: 2,
  });
  assert.equal(files[1].hunks[0].lines.at(-1).type, 'meta', 'preserves no-newline markers as metadata');

  console.log('Git diff parser self-test passed.');
}
