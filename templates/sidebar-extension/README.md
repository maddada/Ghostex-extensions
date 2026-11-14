# Sidebar Extension

This template puts native content in the Ghostex sidebar: its own sidebar mode (a
top-row button that swaps the whole list, like Bots) and a Today section above
your projects. Ghostex draws the panel with its own rows, menus and tooltips, so
it looks like Ghostex in both themes. Needs Ghostex 11.8 or newer.

## How it works

- `panel.json` is the first panel document
  (`schemas/ghostex-sidebar-panel.schema.json`). The v1 blocks are rows,
  checklist, map, progress, text, buttons and empty.
- An editable checklist needs no code: Ghostex applies the user's ticks, adds,
  renames and deletes itself, saves them, and tells the extension.
- The optional server (`src/server.mjs`) runs while the extension is on. Ghostex
  gives it `GHOSTEX_API_URL` and `GHOSTEX_API_TOKEN`, which reach the extension
  API for this extension only:

  | Call | Does |
  | --- | --- |
  | `GET /api/ext/v1/panel` | The panel and its revision |
  | `PUT /api/ext/v1/panel` `{document, baseRevision?}` | Replaces the panel |
  | `PATCH /api/ext/v1/panel` `{blocks?, removeBlocks?, title?, tabs?, baseRevision?}` | Replaces blocks by id, removes blocks |
  | `GET /api/ext/v1/projects` | Your projects (needs `projects.read`) |
  | `GET /api/ext/v1/sessions?project=` | Your sessions and what they are doing (needs `sessions.read`) |
  | `GET /api/ext/v1/events` | Server-sent events: `panelChanged`, `checklistEdited`, `panelAction`, `projectsChanged`, `sessionsChanged` |

  Add `surface=sidePanel` (and `session=<projectId>:<sessionId>` for a
  per-session side panel) to the panel calls for a side panel view.
- From a shell inside the server's process, `ghostex extensions panel
  get|set|patch|events <id>` wraps the same calls. Only the extension's own
  process changes its panel; agents and scripts can read it and follow its
  events.

A panel that only shows its own JSON needs no server: drop `server` from the
manifest.

## Start a new extension

1. From the repository root, run
   `node tooling/new-extension.mjs sidebar <your-kebab-case-id>`.
2. Replace the generated manifest metadata and `icon.svg`.
3. Edit `panel.json` and check it with
   `node tooling/validate.mjs --panel extensions/<id>/panel.json`.
4. Develop the server in `src/server.mjs`, then reproduce `dist/` with
   `cp src/server.mjs dist/server.mjs`.
5. Run `node tooling/validate.mjs`.

## Permissions

- `projects.read`: read your project names and folders, to draw the map.
- `sessions.open`: open a project when you click it in the panel.

The server process itself is unsandboxed and is disclosed during installation.
