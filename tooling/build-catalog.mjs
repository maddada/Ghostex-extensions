#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validateManifest } from './validate.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionsRoot = join(repositoryRoot, 'extensions');
const outputRoot = join(repositoryRoot, 'dist-store');
// Where each extension's folder is browsed on GitHub: its catalog entry's `sourceUrl`, which Ghostex
// 11.8 and newer link from the extension's card with the GitHub mark (older Ghostex ignores it).
const sourceBaseUrl = 'https://github.com/maddada/Ghostex-extensions/tree/main';
const screenshotExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const ignoredEntryNames = new Set(['.DS_Store', '.git', 'node_modules']);
const utf8Flag = 0x0800;
const storedMethod = 0;
const dosTime = 0;
const dosDate = (1 << 5) | 1;

function normalizeRelativePath(path) {
  return path.split(sep).join('/');
}

function listFiles(root, current = root) {
  if (!existsSync(current)) return [];
  const files = [];
  for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (ignoredEntryNames.has(entry.name)) continue;
    const absolutePath = join(current, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Symlinks are not publishable extension payloads: ${absolutePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...listFiles(root, absolutePath));
    } else if (entry.isFile()) {
      files.push({
        absolutePath,
        archivePath: normalizeRelativePath(relative(root, absolutePath)),
        mode: lstatSync(absolutePath).mode,
      });
    }
  }
  return files;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries) {
  if (entries.length > 0xffff) throw new Error('ZIP64 is not supported: too many payload files');

  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.archivePath, 'utf8');
    const data = entry.data;
    if (name.length > 0xffff) throw new Error(`ZIP path is too long: ${entry.archivePath}`);
    if (data.length > 0xffffffff) throw new Error(`ZIP64 is not supported: ${entry.archivePath}`);
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(utf8Flag, 6);
    localHeader.writeUInt16LE(storedMethod, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x0314, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(utf8Flag, 8);
    centralHeader.writeUInt16LE(storedMethod, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE((entry.mode & 0xffff) * 0x10000, 38);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralParts.push(centralHeader, name);

    localOffset += localHeader.length + name.length + data.length;
    if (localOffset > 0xffffffff) throw new Error('ZIP64 is not supported: payload is too large');
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function resolveMergeDate() {
  const configured = process.env.PR_MERGE_DATE;
  if (configured) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(configured)) {
      throw new Error('PR_MERGE_DATE must use YYYY-MM-DD');
    }
    return configured;
  }

  const gitDate = spawnSync('git', ['log', '-1', '--format=%cs'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  if (gitDate.status === 0 && /^\d{4}-\d{2}-\d{2}$/.test(gitDate.stdout.trim())) {
    return gitDate.stdout.trim();
  }
  throw new Error('Could not determine PR merge date; set PR_MERGE_DATE to YYYY-MM-DD');
}

function readRequiredFile(extensionDir, fileName) {
  const filePath = join(extensionDir, fileName);
  if (!existsSync(filePath) || !lstatSync(filePath).isFile()) {
    throw new Error(`${relative(repositoryRoot, extensionDir)} is missing ${fileName}`);
  }
  return filePath;
}

function extensionDirectories() {
  if (!existsSync(extensionsRoot)) return [];
  return readdirSync(extensionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(extensionsRoot, entry.name))
    .sort();
}

function screenshotPaths(extensionDir) {
  const metadataDir = join(extensionDir, 'metadata');
  return listFiles(metadataDir)
    .filter(({ archivePath }) =>
      screenshotExtensions.has(archivePath.slice(archivePath.lastIndexOf('.')).toLowerCase())
    )
    .map(({ absolutePath }) => normalizeRelativePath(relative(repositoryRoot, absolutePath)));
}

function catalogEntry(extensionDir, mergeDate) {
  const id = basename(extensionDir);
  const manifestPath = readRequiredFile(extensionDir, 'ghostex-extension.json');
  const readmePath = readRequiredFile(extensionDir, 'README.md');
  const changelogPath = readRequiredFile(extensionDir, 'CHANGELOG.md');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const errors = validateManifest(manifest, { folderName: id });
  if (errors.length > 0) {
    throw new Error(errors.map((error) => `${relative(repositoryRoot, manifestPath)}: ${error}`).join('\n'));
  }

  const iconPath = resolve(extensionDir, manifest.icon);
  if (!iconPath.startsWith(`${extensionDir}${sep}`)) {
    throw new Error(`${id}: manifest.icon must stay inside the extension folder`);
  }
  readRequiredFile(dirname(iconPath), basename(iconPath));
  if (manifest.server?.static) {
    const staticDirectory = resolve(extensionDir, manifest.server.static);
    if (
      !staticDirectory.startsWith(`${extensionDir}${sep}`) ||
      !existsSync(staticDirectory) ||
      !lstatSync(staticDirectory).isDirectory()
    ) {
      throw new Error(`${id}: manifest.server.static must reference a directory inside the extension`);
    }
  }

  const zipName = `${manifest.name}-${manifest.version}.zip`;
  const archiveEntries = listFiles(extensionDir).map((file) => ({
    archivePath: file.archivePath,
    mode: file.mode,
    data:
      file.absolutePath === changelogPath
        ? Buffer.from(readFileSync(changelogPath, 'utf8').replaceAll('{PR_MERGE_DATE}', mergeDate))
        : readFileSync(file.absolutePath),
  }));
  const archive = createZip(archiveEntries);
  const sha256 = createHash('sha256').update(archive).digest('hex');
  writeFileSync(join(outputRoot, zipName), archive);
  writeFileSync(join(outputRoot, `${zipName}.sha256`), `${sha256}  ${zipName}\n`);

  return {
    ...manifest,
    readme: normalizeRelativePath(relative(repositoryRoot, readmePath)),
    changelog: normalizeRelativePath(relative(repositoryRoot, changelogPath)),
    screenshots: screenshotPaths(extensionDir),
    zip: zipName,
    sha256,
    sourceUrl: `${sourceBaseUrl}/${normalizeRelativePath(relative(repositoryRoot, extensionDir))}`,
  };
}

// An extension that draws nothing in the sidebar (kind "sidebar" without sidebar or sidePanel, like
// Work items 0.3.1) fails validation in Ghostex 11.8.0 to 11.11.0, and those read a catalog in one
// piece, so one such entry would make them drop the whole catalog and fall back to catalog.json.
export function drawsNothing(entry) {
  return entry.kind === 'sidebar' && entry.sidebar === undefined && entry.sidePanel === undefined;
}

// What the store release published last (its catalog-v2.json and the zips beside it), read from the
// directory named by --previous or PREVIOUS_STORE_DIR, or null.
function readPreviousStore() {
  const flag = process.argv.indexOf('--previous');
  const directory = flag >= 0 ? process.argv[flag + 1] : process.env.PREVIOUS_STORE_DIR;
  if (!directory) return null;
  const file = join(resolve(directory), 'catalog-v2.json');
  if (!existsSync(file)) return null;
  try {
    return { directory: resolve(directory), catalog: JSON.parse(readFileSync(file, 'utf8')) };
  } catch {
    return null;
  }
}

// catalog-v2.json keeps, for an extension that now draws nothing, the version it last published
// there (which those Ghostex can read), with its zip carried over; an extension that was never
// there is left out of it.
function carriedForward(entry, previous) {
  const before = previous?.catalog?.extensions?.find((candidate) => candidate.name === entry.name);
  if (!before || drawsNothing(before) || !existsSync(join(previous.directory, before.zip))) return null;
  copyFileSync(join(previous.directory, before.zip), join(outputRoot, before.zip));
  const sum = join(previous.directory, `${before.zip}.sha256`);
  if (existsSync(sum)) copyFileSync(sum, join(outputRoot, `${before.zip}.sha256`));
  return before;
}

export function buildCatalog() {
  const mergeDate = resolveMergeDate();
  const previous = readPreviousStore();
  rmSync(outputRoot, { force: true, recursive: true });
  mkdirSync(outputRoot, { recursive: true });
  // Three catalogs go to the rolling store release, for what each Ghostex can read:
  // - catalog.json, for 11.7 and older, which read it in one piece and reject all of it when one
  //   entry has a kind they don't know: no sidebar extensions.
  // - catalog-v2.json, for 11.8.0 to 11.11.0: sidebar extensions, but none that draws nothing.
  //   Such an extension stays at the version it last published here, or is left out.
  // - catalog-v3.json (gxserver's DEFAULT_EXTENSIONS_CATALOG_URL): every extension at its newest.
  const everything = extensionDirectories().map((extensionDir) => catalogEntry(extensionDir, mergeDate));
  const catalog = {
    schemaVersion: 1,
    publishedAt: mergeDate,
    extensions: everything.filter((entry) => entry.kind !== 'sidebar'),
  };
  writeFileSync(join(outputRoot, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  const v2 = [];
  for (const entry of everything) {
    if (!drawsNothing(entry)) v2.push(entry);
    else {
      const kept = carriedForward(entry, previous);
      if (kept) v2.push(kept);
    }
  }
  const catalogV2 = { schemaVersion: 1, publishedAt: mergeDate, extensions: v2 };
  writeFileSync(join(outputRoot, 'catalog-v2.json'), `${JSON.stringify(catalogV2, null, 2)}\n`);
  const catalogV3 = { schemaVersion: 1, publishedAt: mergeDate, extensions: everything };
  writeFileSync(join(outputRoot, 'catalog-v3.json'), `${JSON.stringify(catalogV3, null, 2)}\n`);
  return catalogV3;
}

function main() {
  try {
    const catalog = buildCatalog();
    console.log(
      `Built catalog with ${catalog.extensions.length} extension${catalog.extensions.length === 1 ? '' : 's'}.`
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
