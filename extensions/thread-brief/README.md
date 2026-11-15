# Thread brief

Each session's brief in the side panel, so you know where it stands in a few seconds without
reading the transcript: what it is for, its status, what's next, what's done, what's blocked and
what was parked. The session's own agent keeps it current. Needs Ghostex 11.8 or newer.

- **It starts on its own**: while Thread brief is on, every agent session Ghostex starts or
  resumes is told it has a brief, and writes one once it has a task. Turn Thread brief off or
  uninstall it and the next start or resume is told nothing; no session is touched.
- **Ordinary sessions only**: a coordinator and a coordinator's threads keep no brief, since the
  coordinator's Work panel already tracks them.
- **Open it**: pick Thread brief in the side panel's view list. Each session has its own brief.
- **Briefs**: the button in the sidebar's top row lists every session with a brief, its
  objective and how many of its steps are done (3/7). Click one to open it. On the phone, the
  same list is behind the extension's button in the sessions list's header.
- **Objective**: one sentence. Click it to rewrite it; yours stays until you change it, and the
  agent asks before suggesting another. When the agent changes it, the old one shows under it.
- **Status**: Working, Waiting on you, Blocked or Done, with when it was last updated
  ("Updated by the agent 2 turns ago, at 14:05"). After 3 turns without an update it says it's
  out of date.
- **Refresh**: asks the session, in one short message, to update its brief. With no brief yet,
  **Ask for a brief** has it draft one from your first message.
- **Next up**: tick, rename, add or delete steps; the first five show and the rest fold.
  Ticked steps move to **Done** (folded, newest first).
- **Blocked**: each blocked step and what it waits on.
- **Parked**: out-of-scope finds; click one to start a new session with it as the draft.

Your changes are saved at once, and the agent rereads the brief before it writes, so your
wording wins. The brief is kept on this computer, by session, and survives resume, restart and
compaction. A forked session starts with a copy of its parent's brief.

## The skill

Installing Thread brief offers its **thread-brief** skill for your coding agents. Install it:
it tells the agent when and how to keep the brief (only when something material changed, within
10 next, 10 done, 10 blocked and 5 parked items). Without it, an agent can still read its brief
with `ghostex extensions message thread-brief read`, which says what to send.

## Permissions

- `sessions.read`: sees when each session works (to count turns), which ones are coordinators
  and threads, and which session a fork came from.
- `sessions.open`: opens a session when you click it in the Briefs list.
- `agents.message`: hears from your agents about their own session's brief.
- `sessions.message`: when you tap Refresh, sends that session one short message.
- `agents.start`: starts a new session from a parked item when you click it.
- `agents.note`: adds one line to what new agent sessions are told when they start, so they
  keep their brief without being asked.

Thread brief runs a small Node server while it is on; it talks only to Ghostex on this computer.

## Want the objectives in your Projects list too?

Thread brief keeps them in its Briefs list. To see each session's objective in your Projects
list instead, copy this to an agent and it will build you a small sidebar extension of your own:

```text
Build me a Ghostex sidebar extension called "Objectives" that adds a section at the top of my
Projects list: one row per session that has a Thread brief, showing the session (so Ghostex draws
its name and live status), its objective as the subtitle and its done count (like 3/7) at the end.
Start from the sidebar template in https://github.com/maddada/Ghostex-extensions
(templates/sidebar-extension). Read the briefs from Thread brief's briefs.json in Ghostex's
extensions data folder (~/.local/share/ghostex/extensions/data/thread-brief/briefs.json on macOS
and Linux), and redraw the section when that file changes. Ask for sessions.read and
sessions.open only. Then install it from the folder for me to try.
```

## Not yet

The coordinator roll-up and a progress count on the sidebar's session rows are left out, and
the phone shows the Briefs list but not a session's whole brief (the phone has no side panel
views). Next up can't be reordered by dragging yet.
