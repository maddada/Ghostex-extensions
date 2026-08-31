#!/usr/bin/env node
/**
 * Regenerates THIRD_PARTY_NOTICES.md from what actually lands in `dist/`.
 *
 *     node notices.mjs > THIRD_PARTY_NOTICES.md
 *
 * Excalidraw brings some sixty packages of its own, and hand-maintaining that
 * list would be wrong within one upgrade. So this asks esbuild — the same
 * build, with nothing written to disk — which files it pulled in, walks them
 * back to the packages they came from, and prints each one's licence as the
 * package itself ships it. Run it whenever a dependency changes.
 */

import { build } from 'esbuild';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const modules = join(root, 'node_modules');
const LICENSE_FILE = /^(LICENSE|LICENCE|COPYING)($|\.)/i;

/**
 * The fonts copied into `dist/fonts/`, and what is actually known about them.
 * `@excalidraw/excalidraw` publishes no licence file of any kind — not for
 * itself and not per font — so what is recorded here is what upstream's own
 * source records, and nothing is claimed beyond it.
 */
const FONTS = [
  ['Excalifont', 'The hand-drawn face Excalidraw draws with by default. Upstream records "Copyright (c) 2024 by Excalidraw. All rights reserved." in the font itself.'],
  ['Nunito', 'Google Fonts, by Vernon Adams, Cyreal and Jacques Le Bailly.'],
  ['Liberation', 'Liberation Sans, by Steve Matteson for Ascender Corporation.'],
  ['Cascadia', 'Cascadia Code, by Microsoft.'],
  ['ComicShanns', 'By Shannon Miwa. Upstream records "MIT License" in the font itself.'],
  ['Assistant', "Google Fonts, by Ben Nathan. Excalidraw's own interface font."],
  ['Virgil', "Excalidraw's original hand-drawn face, kept for boards that used it."],
  ['Lilita', 'Lilita One, Google Fonts, by Juan Montoreano.'],
];

/** The one family deliberately left behind, and why the list is short by it. */
const SKIPPED_FONT = 'Xiaolai, the CJK fallback, is not shipped: it is twelve megabytes of per-glyph subsets, and text in Chinese, Japanese or Korean falls back to the system font without it.';

const stubDiagramFromText = {
  name: 'stub-diagram-from-text',
  setup(esbuild) {
    esbuild.onResolve({ filter: /^@excalidraw\/mermaid-to-excalidraw/ }, (args) => ({
      path: args.path,
      namespace: 'canvas-stub',
    }));
    esbuild.onLoad({ filter: /.*/, namespace: 'canvas-stub' }, () => ({
      loader: 'js',
      contents: 'export const parseMermaidToExcalidraw = () => {};',
    }));
  },
};

const result = await build({
  absWorkingDir: root,
  entryPoints: { app: 'src/main.tsx' },
  outdir: 'dist',
  bundle: true,
  format: 'esm',
  splitting: true,
  platform: 'browser',
  target: ['chrome120'],
  jsx: 'automatic',
  jsxImportSource: 'react',
  define: { 'process.env.NODE_ENV': '"production"' },
  minify: false,
  write: false,
  metafile: true,
  logLevel: 'warning',
  plugins: [stubDiagramFromText],
});

const names = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  const found = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(input);
  if (found?.[1]) names.add(found[1]);
}

const packages = [...names].sort().map((name) => {
  const directory = join(modules, name);
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  const file = readdirSync(directory).find((entry) => LICENSE_FILE.test(entry));
  return {
    name,
    version: manifest.version,
    license: spdx(manifest),
    text: file ? readFileSync(join(directory, file), 'utf8').trimEnd() : null,
    homepage: repository(manifest),
  };
});

const lines = [];
lines.push('# Third-party notices');
lines.push('');
lines.push(
  `Canvas bundles Excalidraw, React, and the ${packages.length - 2} packages Excalidraw`,
  'itself depends on, all of them pinned to exact versions in `package.json` and',
  'inlined into `dist/` by `build.mjs`. `dist/fonts/` carries the typefaces',
  "Excalidraw draws with, copied byte for byte out of the same package. Nothing",
  'else third-party ships in the extension payload.',
);
lines.push('');
lines.push('This file is generated. To bring it back in step with the bundle:');
lines.push('');
lines.push('```sh');
lines.push('node notices.mjs > THIRD_PARTY_NOTICES.md');
lines.push('```');
lines.push('');
lines.push('## Fonts');
lines.push('');
lines.push(
  '`@excalidraw/excalidraw` publishes no licence file — not for itself and not for',
  'the fonts inside it — so what follows is what upstream\'s own source records,',
  'and nothing is claimed beyond it. The npm package declares itself MIT, which is',
  'the licence the font files are distributed under here.',
);
lines.push('');
for (const [family, note] of FONTS) {
  lines.push(`- **${family}** — ${note}`);
}
lines.push('');
lines.push(SKIPPED_FONT);
lines.push('');
lines.push('## Packages');
lines.push('');

for (const entry of packages) {
  lines.push(`### ${entry.name} ${entry.version}`);
  lines.push('');
  lines.push(`Licence: ${entry.license}.${entry.homepage ? ` Source: ${entry.homepage}.` : ''}`);
  lines.push('');
  if (entry.text) {
    lines.push('```');
    lines.push(entry.text);
    lines.push('```');
  } else {
    lines.push(
      `The published package ships no licence file; \`${entry.name}\` declares`,
      `\`"license": "${entry.license}"\` in its \`package.json\`.`,
    );
  }
  lines.push('');
}

process.stdout.write(`${lines.join('\n').trimEnd()}\n`);

/** The licence a package declares, in either of the two shapes npm allows. */
function spdx(manifest) {
  if (typeof manifest.license === 'string') return manifest.license;
  if (Array.isArray(manifest.licenses)) return manifest.licenses.map((one) => one.type).join(' OR ');
  if (Array.isArray(manifest.license)) return manifest.license.map((one) => one.type).join(' OR ');
  return 'not declared';
}

function repository(manifest) {
  const url = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
  if (typeof url !== 'string') return null;
  return url.replace(/^git\+/, '').replace(/\.git$/, '');
}

// Referenced so a missing `node_modules` fails loudly rather than half-printing.
if (!existsSync(modules)) throw new Error('Run `npm ci --ignore-scripts` first.');
