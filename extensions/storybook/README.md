# Storybook

Open the active project's Storybook component workshop as a full Ghostex view.
Ghostex starts Storybook on an allocated loopback port, waits until it is ready,
and stops the process when it is no longer needed.

## Requirements

The current project must have a `storybook` script that accepts Storybook's
`--port` option. For example:

```json
{
  "scripts": {
    "storybook": "storybook dev"
  }
}
```

The project must also be runnable with Bun. The extension launches
`bun storybook --port {port}` from the active project directory, so it uses the
project's own pinned Storybook installation and configuration.

## Permissions

- `exec`: starts the project's `storybook` script and keeps its local server
  running while the view is open.
