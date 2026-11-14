# Workbench

Your projects as a map, and a Today list, drawn by Ghostex in the sidebar.
Needs Ghostex 11.8 or newer.

- **Workbench mode**: the map button in the sidebar's top row shows Workbench
  instead of your projects. The Map tab groups your projects by the folder they
  sit in (`~/dev/products/app` is under Products); each project shows its live
  status, and a click opens it. Press the button again to go back.
- **Today**: an editable list above your projects (and under Focus). Tick
  items, add them with Add item, and rename or delete them from their
  right-click menu. The progress bar follows what is done.
- **Side panel**: open Workbench from the side panel's view list for the same
  map and list with more room.

Turn the sidebar mode or the Today section off in Settings > Extensions >
Workbench.

## Permissions

- `projects.read`: reads your project names and folders to draw the map.
- `sessions.open`: opens a project when you click it.

Workbench runs a small Node server while it is on; it talks only to Ghostex on
this computer.
