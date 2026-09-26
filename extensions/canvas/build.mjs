#!/usr/bin/env node
/**
 * Reproducible build: `src/` in, self-contained `dist/` out.
 *
 * CI deletes `dist/`, reruns this from the reviewed source, and requires the
 * result to match the committed bundle byte for byte, so nothing here may
 * depend on the clock, the environment, or the machine.
 *
 * Most of `dist/` is not ours. `@excalidraw/excalidraw` publishes only a
 * prebuilt bundle — there is no source in the package — so what esbuild does
 * here is inline chunks that upstream already minified, and the reviewable
 * surface is this file plus `src/`: what we pull in, what we patch out, and
 * what we copy. `UPSTREAM_PATCHES` is the whole of what we change in upstream's
 * bytes, and every one of them fails the build if it stops matching.
 */

import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const excalidraw = join(root, 'node_modules', '@excalidraw', 'excalidraw');
const prod = join(excalidraw, 'dist', 'prod');

/**
 * The changes made to upstream's published bytes, by the chunk they land in.
 *
 * Every `from` is an exact string out of the pinned 0.18.1 bundle and must
 * match exactly once, so a version bump fails this build rather than quietly
 * undoing any of it.
 */
const UPSTREAM_PATCHES = {
  /**
   * Excalidraw's font loader builds a list of URLs to try for every font file,
   * and always appends a hard-coded esm.sh URL as its last resort. Canvas
   * declares no `network` permission, so a bundle that can reach out to a CDN
   * would be a lie: the fallback is removed and the constant it read is
   * emptied, leaving `window.EXCALIDRAW_ASSET_PATH` — set to this page's own
   * folder in `index.html` — as the only place a font can come from.
   */
  'chunk-K2UTITRG.js': [
    {
      what: 'the esm.sh fallback URL',
      from: '`https://esm.sh/${M.PKG_NAME?`${M.PKG_NAME}@${M.PKG_VERSION}`:"@excalidraw/excalidraw"}/dist/prod/`',
      to: '""',
    },
    {
      // Emptying the constant alone is not enough: `new URL(path, "")` throws,
      // so the last-resort push has to go with it.
      what: 'the fallback URL push',
      from: 'r.push(new URL(n,jn.ASSETS_FALLBACK_URL)),r',
      to: 'r',
    },
  ],
  /**
   * Upstream bakes its own build-time environment into the published bundle,
   * and that includes a live Firebase web config — an API key, a project and a
   * database URL — for the collaboration room store. It is Excalidraw's, it is
   * public in their repository, and nothing here can reach it: Canvas never
   * collaborates. But a credential-shaped string has no business in a bundle
   * this extension publishes, so the config is emptied. It is read with
   * `JSON.parse`, and `{}` parses.
   */
  'chunk-ZUYEQ4TG.js': [
    {
      what: "the collaboration server's Firebase config",
      // Matched by its field name rather than its contents, so the key itself
      // is nowhere in this repository and a rotated one is still removed.
      from: /VITE_APP_FIREBASE_CONFIG:'[^']*'/,
      to: 'VITE_APP_FIREBASE_CONFIG:"{}"',
    },
  ],
  /**
   * The library menu offers "Publish selected" once library items are picked,
   * and its dialog uploads them, a preview picture and the author's details to
   * Excalidraw's public library backend. That is a network write no prop can
   * turn off, so the menu item goes and the dialog behind it can never open.
   */
  'index.js': [
    {
      what: "the library menu's Publish item",
      from: 'h&&Mt(Ce.Item,{icon:Cb,onSelect:()=>T(!0),"data-testid":"lib-dropdown--remove",children:g("buttons.publishLibrary")})',
      to: 'null',
    },
  ],
};

/**
 * The font families that ship, copied byte for byte out of the pinned package.
 *
 * Everything Excalidraw can draw with is here except Xiaolai, its CJK
 * fallback: that one family is 12MB of per-glyph subsets, twenty-five times
 * the rest put together, and it is only ever fetched for Chinese, Japanese or
 * Korean text, which falls back to the system font without it. The check at
 * the end keeps this list and what the bundle actually asks for from drifting
 * apart.
 */
const FONT_FAMILIES = [
  'Assistant',
  'Cascadia',
  'ComicShanns',
  'Excalifont',
  'Liberation',
  'Lilita',
  'Nunito',
  'Virgil',
];
const SKIPPED_FONT_FAMILIES = ['Xiaolai'];

/**
 * Turning a prompt into a diagram is Excalidraw's one online feature: both the
 * AI diagram tab and the Mermaid one sit behind `aiEnabled`, which `app.tsx`
 * turns off because this extension holds no `network` permission. The Mermaid
 * converter is a lazy import behind that switch, so bundling it would commit
 * six megabytes of unreachable code; this leaves a stub in its place that says
 * so if it is ever reached.
 */
const stubDiagramFromText = {
  name: 'stub-diagram-from-text',
  setup(esbuild) {
    esbuild.onResolve({ filter: /^@excalidraw\/mermaid-to-excalidraw/ }, () => ({
      path: 'mermaid-to-excalidraw',
      namespace: 'canvas-stub',
    }));
    esbuild.onLoad({ filter: /^mermaid/, namespace: 'canvas-stub' }, () => ({
      loader: 'js',
      contents:
        'export const parseMermaidToExcalidraw = () => {\n' +
        "  throw new Error('Canvas ships without the Mermaid converter.');\n" +
        '};\n',
    }));
    // Every language that does not ship: empty, so Excalidraw falls back per key.
    esbuild.onLoad({ filter: /^dropped-language$/, namespace: 'canvas-stub' }, () => ({
      loader: 'js',
      contents: 'export default {};\n',
    }));
  },
};

/**
 * The one translation that ships.
 *
 * Excalidraw lazily imports a chunk per language and picks one from its
 * `langCode` prop, which Canvas never sets — so it stays on its own default,
 * English, and the other fifty-three chunks are 1.3MB and half the file count
 * of `dist/` that nothing can ever reach. They are stubbed rather than
 * bundled. If `langCode` is ever passed, a stubbed language reads as English
 * rather than as blank text, because Excalidraw falls back per key.
 */
const SHIPPED_LOCALE = /[\\/]locales[\\/]en-[A-Z0-9]+\.js$/;

const dropUnreachableLocales = {
  name: 'drop-unreachable-locales',
  setup(esbuild) {
    // Every dropped language resolves to the *same* module, so esbuild emits
    // one shared chunk for all fifty-three rather than fifty-three stubs.
    esbuild.onResolve(
      { filter: /[\\/]locales[\\/][a-zA-Z-]+-[A-Z0-9]+\.js$/ },
      (args) =>
        SHIPPED_LOCALE.test(args.path) || !args.importer.includes(`${sep}@excalidraw${sep}`)
          ? null
          : { path: 'dropped-language', namespace: 'canvas-stub' },
    );
  },
};

/**
 * Applies UPSTREAM_PATCHES as each chunk is loaded, before esbuild parses it —
 * a replace on the built output would break the moment esbuild renamed one of
 * upstream's minified identifiers.
 */
const patchUpstream = {
  name: 'patch-upstream',
  setup(esbuild) {
    esbuild.onLoad({ filter: /@excalidraw[\\/]excalidraw[\\/]dist[\\/]prod[\\/].*\.js$/ }, (args) => {
      let contents = readFileSync(args.path, 'utf8');
      const chunk = Object.keys(UPSTREAM_PATCHES).find((name) => args.path.endsWith(name));
      if (!chunk) {
        if (contents.includes('esm.sh')) {
          throw new Error(`${relative(root, args.path)} reaches a CDN and build.mjs does not patch it.`);
        }
        return null;
      }
      for (const patch of UPSTREAM_PATCHES[chunk]) {
        const hits =
          typeof patch.from === 'string'
            ? contents.split(patch.from).length - 1
            : [...contents.matchAll(new RegExp(patch.from, 'g'))].length;
        if (hits !== 1) {
          throw new Error(`Expected ${patch.what} in ${chunk} exactly once, found ${hits}.`);
        }
        contents = contents.replace(patch.from, patch.to);
      }
      return { contents, loader: 'js' };
    });
  },
};

rmSync(dist, { force: true, recursive: true });
mkdirSync(dist, { recursive: true });

await build({
  absWorkingDir: root,
  entryPoints: { app: 'src/main.tsx' },
  outdir: 'dist',
  bundle: true,
  // Excalidraw font subsetting runs in a module worker that loads itself by
  // `import.meta.url`, and its locales are lazy imports, so the bundle has to
  // stay a split module graph. An IIFE would inline both and break the worker.
  format: 'esm',
  splitting: true,
  platform: 'browser',
  target: ['chrome120'],
  jsx: 'automatic',
  jsxImportSource: 'react',
  // React and Excalidraw both read this; without it React ships its dev build.
  define: { 'process.env.NODE_ENV': '"production"' },
  // Our own code is left readable for reviewers. Everything upstream arrives
  // minified already, and nothing here re-minifies it.
  minify: false,
  sourcemap: false,
  charset: 'utf8',
  logLevel: 'warning',
  plugins: [stubDiagramFromText, dropUnreachableLocales, patchUpstream],
});

for (const file of ['index.html', 'styles.css']) {
  copyFileSync(join(root, 'src', file), join(dist, file));
}

// Excalidraw's own stylesheet, beside ours rather than merged into it, so a
// reviewer can diff it against the package and see it is untouched. It asks
// for `./fonts/Assistant/*`, which is why the fonts land next to it.
copyFileSync(join(prod, 'index.css'), join(dist, 'excalidraw.css'));

for (const family of FONT_FAMILIES) {
  const source = join(prod, 'fonts', family);
  mkdirSync(join(dist, 'fonts', family), { recursive: true });
  for (const file of readdirSync(source).sort()) {
    copyFileSync(join(source, file), join(dist, 'fonts', family, file));
  }
}

// Every font the bundle asks for must ship, and nothing may ship unasked.
// Excalidraw names its font files in both CSS and JavaScript, so both are read.
const referenced = new Map();
for (const file of walk(dist)) {
  if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
  for (const [, family, name] of readFileSync(file, 'utf8').matchAll(
    /fonts\/([A-Za-z]+)\/([A-Za-z0-9._-]+\.woff2)/g,
  )) {
    if (!referenced.has(family)) referenced.set(family, new Set());
    referenced.get(family).add(name);
  }
}

for (const family of referenced.keys()) {
  if (!FONT_FAMILIES.includes(family) && !SKIPPED_FONT_FAMILIES.includes(family)) {
    throw new Error(`Excalidraw asks for the font family ${family}, which build.mjs neither ships nor skips.`);
  }
}
for (const family of FONT_FAMILIES) {
  const wanted = referenced.get(family);
  if (!wanted) throw new Error(`fonts/${family} ships but nothing in dist/ ever asks for it.`);
  const shipped = new Set(readdirSync(join(dist, 'fonts', family)));
  for (const file of wanted) {
    if (!shipped.has(file)) throw new Error(`dist/ asks for fonts/${family}/${file}, which build.mjs does not ship.`);
  }
  for (const file of shipped) {
    if (!wanted.has(file)) throw new Error(`fonts/${family}/${file} ships but nothing in dist/ ever asks for it.`);
  }
}

/**
 * Every host `dist/` is allowed to so much as name, and why.
 *
 * Excalidraw is a whole application, and its bundle carries the addresses its
 * own UI would use. None of them is fetched here — `app.tsx` turns off
 * collaboration, the diagram-from-text tabs and embedded links, and the font
 * CDN and library publishing, which no prop turns off, are patched out above — but
 * the strings are in the code, and pretending otherwise would be worse than
 * listing them. An upgrade that introduces a new host fails this build, so
 * someone has to look at it rather than ship it unread.
 */
const ALLOWED_HOSTS = new Map([
  ['www.w3.org', 'the SVG and XML namespaces, which are names and not addresses'],
  ['github.com', "links in Excalidraw's own menus and error messages"],
  ['gist.github.com', 'one of the link types Excalidraw can embed'],
  ['discord.gg', "a link in Excalidraw's menus"],
  ['x.com', "a link in Excalidraw's menus"],
  ['twitter.com', "a link in Excalidraw's menus"],
  ['platform.twitter.com', 'one of the link types Excalidraw can embed'],
  ['react.dev', "React's own error messages"],
  ['bugs.chromium.org', 'a browser bug referenced in a workaround comment'],
  ['docs.excalidraw.com', "links in Excalidraw's own menus"],
  ['plus.excalidraw.com', 'the upstream paid product, linked from menus we replace'],
  ['app.excalidraw.com', 'the upstream web app, linked from menus we replace'],
  ['libraries.excalidraw.com', "the shape library browser behind Excalidraw's library button"],
  ['json.excalidraw.com', 'the share-a-link backend, reachable only while collaborating'],
  ['oss-collab.excalidraw.com', 'the collaboration server, and Canvas never collaborates'],
  ['oss-ai.excalidraw.com', 'the diagram-from-text backend, and `aiEnabled` is false'],
  [
    'us-central1-excalidraw-room-persistence.cloudfunctions.net',
    "the library publishing backend, whose only way in, the library menu's Publish item, is patched out",
  ],
  ['www.youtube.com', 'one of the link types Excalidraw can embed'],
  ['youtube.com', 'one of the link types Excalidraw can embed'],
  ['player.vimeo.com', 'one of the link types Excalidraw can embed'],
  ['www.figma.com', 'one of the link types Excalidraw can embed'],
  ['reddit.com', 'one of the link types Excalidraw can embed'],
  ['embed.reddit.com', 'one of the link types Excalidraw can embed'],
  ['giphy.com', 'one of the link types Excalidraw can embed'],
  ['mermaid.js.org', 'documentation linked from a dialog `aiEnabled` keeps shut'],
]);

for (const file of walk(dist)) {
  if (file.endsWith('.woff2')) continue;
  const text = readFileSync(file, 'utf8');
  if (text.includes('esm.sh')) {
    throw new Error(`${relative(root, file)} still reaches esm.sh; the font CDN patch did not hold.`);
  }
  for (const [, host] of text.matchAll(/\bhttps?:\/\/([a-z0-9.-]+)/gi)) {
    if (!ALLOWED_HOSTS.has(host.toLowerCase())) {
      throw new Error(`${relative(root, file)} names ${host}, which build.mjs has never accounted for.`);
    }
  }
}

function* walk(directory) {
  for (const entry of readdirSync(directory).sort()) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}
