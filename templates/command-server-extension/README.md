# Command Server Extension

This template starts a dependency-free Node HTTP server on the loopback port
allocated by Ghostex. Ghostex substitutes `{port}`, starts the command on first
open, polls `/` for readiness, and owns process shutdown.

## Start a new extension

1. From the repository root, run
   `node tooling/new-extension.mjs command-server <your-kebab-case-id>`.
2. Replace the generated manifest metadata.
3. Replace `icon.svg`, then develop the server in `src/server.mjs`.
4. Reproduce `dist/` with `cp src/server.mjs dist/server.mjs`.
5. Keep `{port}` in the launch command, document each permission, and run the
   repository validator.

Use `{projectPath}`, `{projectName}`, `{sessionId}`, `{worktree}`, and
`{worktreeBranch}` in `server.command` or `server.cwd` when project context is
needed. The spawned process also receives Ghostex context and scoped API values
through `GHOSTEX_*` environment variables.

If the extension downloads a required server binary at install time, add
`server.install` entries with an immutable URL and SHA-256 for every supported
platform. Runtime code downloads are never allowed.

## Permissions

None. A command-server process itself is unsandboxed and is disclosed during
installation even when no bridge permissions are requested.
