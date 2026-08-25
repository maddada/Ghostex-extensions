# Static Extension

This template is a dependency-free popup served directly by Ghostex. It has no
background process and requests no host capabilities.

## Start a new extension

1. Copy this folder to `extensions/<your-kebab-case-id>`.
2. Set manifest `name` to that exact folder name and replace the metadata.
3. Replace `icon.svg`, then edit `src/index.html`.
4. Reproduce `dist/` with `cp src/index.html dist/index.html`.
5. Document every preference and permission, then run
   `node tooling/validate.mjs extensions/<your-kebab-case-id>/ghostex-extension.json`
   from the repository root.

The page must remain self-contained. Bundle scripts, styles, and WebAssembly
into `dist/`; API calls may fetch data but must never fetch executable code.

## Preferences

`greeting` demonstrates a text preference. Remove it if your extension has no
preferences.

## Permissions

None.
