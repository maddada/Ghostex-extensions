#!/usr/bin/env node
/**
 * Reproducible build: `src/` in, self-contained `dist/` out.
 *
 * CI deletes `dist/`, reruns this from the reviewed source, and requires the
 * result to match the committed bundle byte for byte, so nothing here may
 * depend on the clock, the environment, or the machine.
 */

import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');

/**
 * The fonts that ship in `dist/fonts/`, copied byte for byte out of their
 * pinned `@fontsource` packages. Each is a Latin subset under the SIL Open Font
 * License (see THIRD_PARTY_NOTICES.md); the catalog forbids fetching fonts at
 * runtime, so this is the whole supply. `src/styles.css` declares them, and
 * the check at the end keeps the two lists from drifting apart.
 */
const FONT_FILES = {
  '@fontsource/caveat': ['caveat-latin-400-normal.woff2', 'caveat-latin-700-normal.woff2'],
  '@fontsource/inter': [
    'inter-latin-400-normal.woff2',
    'inter-latin-400-italic.woff2',
    'inter-latin-700-normal.woff2',
    'inter-latin-700-italic.woff2',
  ],
  '@fontsource/lora': [
    'lora-latin-400-normal.woff2',
    'lora-latin-400-italic.woff2',
    'lora-latin-700-normal.woff2',
    'lora-latin-700-italic.woff2',
  ],
  '@fontsource/jetbrains-mono': [
    'jetbrains-mono-latin-400-normal.woff2',
    'jetbrains-mono-latin-400-italic.woff2',
    'jetbrains-mono-latin-700-normal.woff2',
    'jetbrains-mono-latin-700-italic.woff2',
  ],
};

rmSync(dist, { force: true, recursive: true });
mkdirSync(join(dist, 'fonts'), { recursive: true });

await build({
  absWorkingDir: root,
  entryPoints: ['src/main.tsx'],
  outfile: 'dist/app.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  jsx: 'automatic',
  jsxImportSource: 'preact',
  // Left unminified on purpose: catalog reviewers read dist/ directly.
  minify: false,
  sourcemap: false,
  charset: 'utf8',
  logLevel: 'warning',
});

for (const file of ['index.html', 'styles.css']) {
  copyFileSync(join(root, 'src', file), join(dist, file));
}

for (const [pkg, files] of Object.entries(FONT_FILES)) {
  for (const file of files) {
    copyFileSync(join(root, 'node_modules', pkg, 'files', file), join(dist, 'fonts', file));
  }
}

// Every font the stylesheet asks for must ship, and nothing ships unasked.
const referenced = new Set(
  Array.from(readFileSync(join(dist, 'styles.css'), 'utf8').matchAll(/url\(["']?fonts\/([^"')]+)["']?\)/g), (match) => match[1]),
);
const shipped = new Set(readdirSync(join(dist, 'fonts')));
for (const file of referenced) {
  if (!shipped.has(file)) throw new Error(`styles.css uses fonts/${file}, which build.mjs does not ship.`);
}
for (const file of shipped) {
  if (!referenced.has(file)) throw new Error(`fonts/${file} ships but styles.css never uses it.`);
}
