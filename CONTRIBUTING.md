# Contributing to Ghostex Extensions

Every merged extension is code Ghostex users may run on their machines. The
reviewed source, committed distribution, manifest, and downloaded binaries must
therefore describe one stable, auditable artifact.

## Pull request flow

1. Fork this repository and create a branch in your fork.
2. Start from the matching template and add one folder at
   `extensions/<extension-id>/`. The manifest `name` must equal that kebab-case
   folder name.
3. Run `node tooling/validate.mjs` and your extension's documented reproducible
   build.
4. Open a pull request and apply exactly one label:
   - `new` for a new extension;
   - `update` for a normal change to a published extension;
   - `urgent` for a time-sensitive security or breakage fix.
5. Address human and automated review. Merging to `main` is the publication
   event; do not attach separately built release artifacts to the PR.

For updates, add a changelog entry using `## [Version] - {PR_MERGE_DATE}`.
Publication replaces that placeholder in the catalog artifact. Permission
additions require a version bump because users must consent to the expanded
capabilities again.

## Review expectations

Reviewers must be able to understand all behavior that will run after install.
Pull requests are checked for manifest validity, appropriate permissions,
responsive behavior across every declared placement, license compatibility,
clear setup and preference documentation, and consistency between source and
the committed distribution. Keep changes scoped to one extension unless the PR
updates shared repository tooling.

Command-server extensions are unsandboxed processes. Declare every capability
they need, explain why each permission is necessary, and treat source review as
the primary security boundary. Bridge permissions are enforced by Ghostex; the
review still covers everything a spawned process can do directly.

URL extensions declare `server.url` and ship no code of their own; Ghostex loads
that fixed remote page in the view. The URL must be absolute and use `https`
unless its host is loopback, and `url` may not be combined with `cwd`,
`readiness`, or `install`. Review covers the destination site itself, since
everything the extension runs is served from there rather than from this
repository.

## Supply-chain rules

These rules are mandatory for every extension:

1. **Self-contained bundles only.** Do not load scripts from CDNs, remotely
   import code, or evaluate fetched code. API requests may fetch data, never
   executable code. All scripts and WebAssembly must ship inside the reviewed
   extension payload.
2. **Reproducible `dist/` verified by CI.** Commit source, generated `dist/`,
   and the applicable lockfile. CI rebuilds from the reviewed source and the
   result must match committed `dist/` byte-for-byte.
3. **Pinned registry dependencies with install scripts disabled.** Use exact
   dependency versions and commit the lockfile. Git and URL dependencies are
   prohibited. CI installs registry packages with `--ignore-scripts`.
4. **Server binaries pinned by hash.** Every on-demand binary URL in
   `server.command.install` must have a platform-specific SHA-256 digest.
   Changing the URL or binary requires a reviewed pull request.
5. **No runtime code downloads, ever.** New or changed behavior must ship as a
   new reviewed extension version. An extension may not download plugins,
   updates, scripts, modules, WebAssembly, or other executable content while it
   runs.

## Extension contents

- `ghostex-extension.json`: canonical metadata, placements or terminal kind,
  runtime declaration, preferences, and least-privilege permissions.
- `icon.svg`: a legible, author-provided SVG suitable for titlebar display.
- `README.md`: user-facing purpose, setup, preferences, and permission reasons.
- `CHANGELOG.md`: versioned user-visible changes with merge-date placeholders.
- `metadata/`: store screenshots and related presentation assets.
- `src/`: complete reviewed source.
- `dist/`: self-contained, reproducibly generated code Ghostex runs.

Copy only the template you need; do not submit template placeholders unchanged.
