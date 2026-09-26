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
const LICENSE_FILE = /^(LICENSE|LICENCE|COPYING)($|[.-])/i;

/**
 * The fonts copied into `dist/fonts/`, and the licence each one is under.
 * `@excalidraw/excalidraw` publishes no licence file for them, and its own MIT
 * licence does not cover them: each face keeps its own. What is written here
 * is what the font files record in their metadata, and, where upstream's
 * subsetting stripped that, what upstream's source records for the original.
 */
const FONTS = [
  ['Excalifont', 'SIL Open Font License 1.1. Copyright (c) 2024 by Excalidraw; a modification of Virgil by Ján Filípek / DizajnDesign. The shipped subsets keep only the copyright line; the licence is recorded for the original font in upstream\'s `packages/excalidraw/fonts/Excalifont/index.ts`.'],
  ['Virgil', "Excalidraw's original hand-drawn face. SIL Open Font License 1.1, as the font records. Copyright (c) 2011 by Your Own Font Foundry."],
  ['Nunito', 'SIL Open Font License 1.1, as the font records. Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito).'],
  ['Assistant', "Excalidraw's own interface font. SIL Open Font License 1.1, as the font records. Copyright 2020 The Assistant Project Authors (https://github.com/hafontia/Assistant); Copyright 2010 The Source Sans Pro Authors, with Reserved Font Name 'Source'."],
  ['Lilita', 'Lilita One. SIL Open Font License 1.1, as the font records. Copyright (c) 2011 Juan Montoreano, with Reserved Font Name "Lilita One".'],
  ['Cascadia', "Cascadia Code, by Microsoft, published under the SIL Open Font License 1.1 with Reserved Font Name Cascadia Code (https://github.com/microsoft/cascadia-code). The shipped file's own metadata carries Microsoft's generic font notice instead."],
  ['ComicShanns', 'MIT, as the font records: Copyright (c) 2018 Shannon Miwa, (c) 2023 Jesus Gonzalez, (c) 2023 Rodrigo Batista de Moraes, (c) 2024 Fini Jastrow, (c) 2024 Kyle Beechly. The MIT text is the one reproduced under the packages below.'],
  ['Liberation', 'Liberation Sans. The file is the 2007 Ascender release ("Digitized data 2007 Ascender Corporation") and refers to the Liberation font licence (http://www.ascendercorp.com/liberation.html): for the 1.x series that is the GNU General Public License version 2 with a font exception. The later 2.x series moved to the SIL Open Font License 1.1.'],
];

/** The SIL Open Font License 1.1, which most of the fonts above are under. */
const OFL_1_1 = `-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.`;

/** The MIT permission notice, which follows each MIT copyright line. */
const MIT_BODY = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

/**
 * Packages that publish no licence file of their own, with the copyright line
 * their upstream repository's LICENSE carries. Each declares MIT, and MIT asks
 * for its copyright and permission notice to travel with every copy, so the
 * notice is reproduced here rather than only named.
 */
const UPSTREAM_MIT_COPYRIGHT = [
  [/^@excalidraw\/excalidraw$/, 'Copyright (c) 2020 Excalidraw'],
  [/^@radix-ui\//, 'Copyright (c) 2022 WorkOS'],
  [/^react-remove-scroll-bar$/, 'Copyright (c) 2025 Anton Korzunov <thekashey@gmail.com>'],
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

// The last `node_modules/` in a path names the package the file belongs to:
// npm nests a second version of a dependency inside the package that needs
// it, and that copy is bundled too.
const directories = new Map();
for (const input of Object.keys(result.metafile.inputs)) {
  const found = [...input.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)].at(-1);
  if (found?.[1]) directories.set(`${input.slice(0, found.index)}node_modules/${found[1]}`, found[1]);
}

const seen = new Set();
const packages = [...directories]
  .map(([directory, name]) => {
    const absolute = join(root, directory);
    const manifest = JSON.parse(readFileSync(join(absolute, 'package.json'), 'utf8'));
    const file = readdirSync(absolute).find((entry) => LICENSE_FILE.test(entry));
    const license = spdx(manifest);
    const upstream = license === 'MIT' ? UPSTREAM_MIT_COPYRIGHT.find(([pattern]) => pattern.test(name)) : undefined;
    return {
      name,
      version: manifest.version,
      license,
      text: file
        ? readFileSync(join(absolute, file), 'utf8').trimEnd()
        : upstream
          ? `MIT License\n\n${upstream[1]}\n\n${MIT_BODY}`
          : null,
      fromUpstream: !file && Boolean(upstream),
      homepage: repository(manifest),
    };
  })
  .filter((entry) => {
    const key = `${entry.name}@${entry.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort((a, b) => (a.name === b.name ? a.version.localeCompare(b.version, 'en', { numeric: true }) : a.name < b.name ? -1 : 1));

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
  '`@excalidraw/excalidraw` publishes no licence file for the fonts inside it, and',
  'its own MIT licence does not cover them: each face keeps its own licence. What',
  'follows is what each font file records, or, where upstream\'s subsetting',
  'stripped that, what upstream\'s source records for the original font.',
);
lines.push('');
for (const [family, note] of FONTS) {
  lines.push(`- **${family}** — ${note}`);
}
lines.push('');
lines.push(SKIPPED_FONT);
lines.push('');
lines.push('### SIL Open Font License 1.1');
lines.push('');
lines.push('```');
lines.push(OFL_1_1);
lines.push('```');
lines.push('');
lines.push('## Packages');
lines.push('');

for (const entry of packages) {
  lines.push(`### ${entry.name} ${entry.version}`);
  lines.push('');
  lines.push(`Licence: ${entry.license}.${entry.homepage ? ` Source: ${entry.homepage}.` : ''}`);
  lines.push('');
  if (entry.fromUpstream) {
    lines.push(
      'The published package ships no licence file; this is the notice in its',
      'upstream repository.',
    );
    lines.push('');
  }
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
