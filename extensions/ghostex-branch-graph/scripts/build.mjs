import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
await mkdir(new URL('dist/', root), { recursive: true });
for (const name of ['index.html', 'app.js', 'styles.css', 'graph.mjs', 'theme.mjs', 'bridge.mjs', 'remote.mjs', 'quick.mjs']) {
  await cp(new URL(`src/${name}`, root), new URL(`dist/${name}`, root));
}
// The helper is executed through Ghostex's official exec bridge. No daemon,
// external server, npm dependencies, or absolute development paths are needed at runtime.
const helper = await readFile(new URL('src/repository.mjs', root), 'utf8');
await writeFile(new URL('dist/helper-source.mjs', root), `export default ${JSON.stringify(helper)};\n`);
await mkdir(new URL('dist/quick/', root), { recursive: true });
for (const name of ['styles.css', 'theme.mjs', 'bridge.mjs', 'remote.mjs', 'quick.mjs', 'helper-source.mjs']) {
  await cp(new URL(`dist/${name}`, root), new URL(`dist/quick/${name}`, root));
}
await cp(new URL('src/quick.html', root), new URL('dist/quick/index.html', root));
console.log(`Built ${fileURLToPath(new URL('dist/', root))}`);
