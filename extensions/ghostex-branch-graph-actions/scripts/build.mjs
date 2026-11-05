import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
await mkdir(new URL('dist/', root), { recursive: true });
for (const name of ['index.html', 'quick.mjs', 'remote.mjs', 'bridge.mjs', 'styles.css', 'theme.mjs']) {
  await cp(new URL(`src/${name}`, root), new URL(`dist/${name}`, root));
}
// Embed the reviewed local helper; no runtime dependencies or downloads.
const helper = await readFile(new URL('src/repository.mjs', root), 'utf8');
await writeFile(new URL('dist/helper-source.mjs', root), `export default ${JSON.stringify(helper)};\n`);
console.log('Built Git quick-actions popup.');
