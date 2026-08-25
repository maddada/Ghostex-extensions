#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validateManifest } from './validate.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionsRoot = join(repositoryRoot, 'extensions');
const extensionIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const templates = new Map([
  ['static', 'static-extension'],
  ['command-server', 'command-server-extension'],
  ['terminal', 'terminal-extension'],
]);

function usage() {
  return [
    'Usage: node tooling/new-extension.mjs <template> <extension-id>',
    '',
    `Templates: ${[...templates.keys()].join(', ')}`,
    'Extension ids must be kebab-case and become both the folder and manifest name.',
  ].join('\n');
}

export function scaffoldExtension(templateName, extensionId) {
  const templateDirectoryName = templates.get(templateName);
  if (!templateDirectoryName) {
    throw new Error(`Unknown template ${JSON.stringify(templateName)}.\n\n${usage()}`);
  }
  if (!extensionIdPattern.test(extensionId)) {
    throw new Error(`Extension id ${JSON.stringify(extensionId)} must be kebab-case.`);
  }

  const sourceDirectory = join(repositoryRoot, 'templates', templateDirectoryName);
  const destinationDirectory = join(extensionsRoot, extensionId);
  if (existsSync(destinationDirectory)) {
    throw new Error(`Extension already exists: extensions/${extensionId}`);
  }

  const sourceManifestPath = join(sourceDirectory, 'ghostex-extension.json');
  const manifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
  manifest.name = extensionId;
  const errors = validateManifest(manifest, { folderName: extensionId });
  if (errors.length > 0) {
    throw new Error(errors.map((error) => `ghostex-extension.json: ${error}`).join('\n'));
  }

  mkdirSync(extensionsRoot, { recursive: true });
  try {
    cpSync(sourceDirectory, destinationDirectory, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    writeFileSync(
      join(destinationDirectory, 'ghostex-extension.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  } catch (error) {
    rmSync(destinationDirectory, { force: true, recursive: true });
    throw error;
  }

  return destinationDirectory;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    console.log(usage());
    return;
  }
  if (args.length !== 2) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  try {
    scaffoldExtension(args[0], args[1]);
    console.log(`Created extensions/${args[1]} from the ${args[0]} template.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
