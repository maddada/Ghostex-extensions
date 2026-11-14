---
name: sidebar-extension
description: Reads and explains the sidebar-extension Ghostex extension's panel (its Today list and project map). Use when the user asks what is on their sidebar-extension panel or what is left on today's list.
---

# sidebar-extension

This skill came with the sidebar-extension Ghostex extension. Ghostex installed it
for your agents because you said yes when you installed the extension, and it is
removed when you uninstall the extension.

## Read the panel

```bash
ghostex extensions panel get sidebar-extension
```

The answer is the panel document: its `today` block is the Today checklist
(`items[].text`, `items[].done`) and its `projects` block is the map of projects.

Only the extension itself changes its panel. To change what is on the list, tell
the user to tick, add, rename or delete items in the sidebar.
