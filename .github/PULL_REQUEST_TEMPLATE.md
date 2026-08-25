## Extension change

Apply exactly one publishing label to this pull request: `new`, `update`, or
`urgent`.

### Checklist

- [ ] The extension folder is kebab-case and matches the manifest `name`.
- [ ] `node tooling/validate.mjs` passes.
- [ ] The README documents setup, preferences, and every requested permission.
- [ ] The changelog includes `## [Version] - {PR_MERGE_DATE}`.
- [ ] All runtime code is self-contained; there are no CDN scripts, remote code
      imports, fetched-code evaluation, or runtime code downloads.
- [ ] `src/`, `dist/`, and the applicable lockfile are committed, and a clean CI
      rebuild matches `dist/` byte-for-byte.
- [ ] Registry dependencies use exact versions and install with
      `--ignore-scripts`; there are no git or URL dependencies.
- [ ] Downloaded server binaries have per-platform URLs and SHA-256 hashes.
- [ ] Permissions are least-privilege; any permission increase includes a
      version bump.
- [ ] The extension works at every declared placement and contains no unchanged
      template placeholders.

### Review notes

Describe the behavior change, how to reproduce the build, and why each declared
permission is required.
