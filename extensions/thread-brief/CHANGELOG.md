# Changelog

## [Work items: work items for any session] - {PR_MERGE_DATE}

- Thread brief is now Work items. Ordinary sessions keep their own work items with Ghostex's own
  commands (`ghostex work item …`), in the same Work panel, dock rows and phone sheet as a
  coordinator's, under a Topic you can rewrite with a click.
- A Work button in the window's header opens the panel. The Briefs button and list in the sidebar
  are gone, and the extension runs no server.
- The skill is now **work-items**, and it is in place only while the extension is on.
- Each session's brief becomes its work items once, and the old file is kept.
- The brief's side panel, its Status, Refresh and "out of date" are gone, and so are the
  permissions they needed (agents.message, sessions.message, agents.start, sessions.read,
  sessions.open).

## [Starts on its own, Briefs list, editable objective] - {PR_MERGE_DATE}

- Sessions start their brief on their own while Thread brief is on: it adds one line to what
  new agent sessions are told (a new permission, Tell new agent sessions about it). Off or
  uninstalled, no session is told anything.
- Only ordinary sessions keep a brief; coordinators and their threads are left to the
  coordinator's Work panel.
- A Briefs button in the sidebar's top row lists every session with a brief, its objective and
  its done count; the phone shows it too. Opening a session from it needs Open projects and
  sessions.
- Click the objective to rewrite it; yours stays until you change it.
- The README has a prompt to build your own extension that shows the objectives in the
  Projects list.

## [Initial] - {PR_MERGE_DATE}

- Initial release: each thread's brief in the side panel, kept by the agent through the
  thread-brief skill.
