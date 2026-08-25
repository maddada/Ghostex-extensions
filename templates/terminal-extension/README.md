# Terminal Extension

This manifest-only template runs a command in a real Ghostex terminal. Users
choose whether terminal extensions open as a split to the right or a new tab.

## Start a new extension

1. From the repository root, run
   `node tooling/new-extension.mjs terminal <your-kebab-case-id>`.
2. Replace the generated manifest metadata.
3. Replace `icon.svg` and set `terminal.command`.
4. Add executable names to `terminal.requires` so Ghostex can report missing
   dependencies before launch.
5. Document each permission and run the repository validator.

The command and optional `cwd` support `{projectPath}`, `{projectName}`,
`{sessionId}`, `{worktree}`, and `{worktreeBranch}`. This template starts in the
active project path.

## Permissions

- `exec`: runs the declared command in a terminal pane.
