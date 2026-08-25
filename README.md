# Ghostex Extensions

Ghostex Extensions is the public, reviewed catalog for extensions that run in
[Ghostex](https://github.com/maddada/Ghostex). Each extension lives in its own
folder, declares its capabilities in `ghostex-extension.json`, and ships the
exact code Ghostex will run.

Extensions can provide responsive web interfaces in one or more placements
(`view`, `chat-bar`, `popup`, or `modal`) or run a command in a real Ghostex
terminal pane. Web interfaces use either Ghostex's built-in static file server
or an extension-owned command server.

## Repository layout

```text
extensions/<extension-id>/
├── ghostex-extension.json
├── icon.svg
├── README.md
├── CHANGELOG.md
├── metadata/
├── dist/
└── src/
```

- `schemas/ghostex-extension.schema.json` is the canonical manifest schema.
- `templates/` contains complete starting points for static web, command-server,
  and terminal-pane extensions.
- `tooling/validate.mjs` validates manifests without third-party dependencies.
- `extensions/` contains published extensions, one kebab-case folder per id.

The manifest `name` must exactly match its folder name. Extension icons are
author-provided SVG files. Store screenshots belong in `metadata/`; audited
source belongs in `src/`; the self-contained runnable output belongs in
`dist/`.

## Validate an extension

```sh
node tooling/validate.mjs extensions/my-extension/ghostex-extension.json
```

With no arguments, the validator checks every manifest under `templates/` and
`extensions/`.

## Publishing

Publishing follows a fork-and-pull-request workflow. Open a PR and apply exactly
one of the `new`, `update`, or `urgent` labels. Review covers the source,
permissions, bundled output, dependencies, and supply-chain integrity. Merging
to `main` publishes the extension: CI validates and rebuilds it, substitutes
`{PR_MERGE_DATE}` in the published changelog, creates a versioned zip and
SHA-256 digest, and updates the catalog consumed by Ghostex.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full review and security rules.

## License

This repository is available under the [MIT License](LICENSE). Individual
extension authors must ensure everything they submit can be redistributed
under compatible terms.
