# Thread brief

Each thread's brief in the side panel, so you know its state in a few seconds without reading
the transcript: what the thread is for, its status, what's next, what's done, what's blocked
and what was parked. The thread's own agent keeps it current. Needs Ghostex 11.8 or newer.

- **Open it**: pick Thread brief in the side panel's view list. Each thread has its own brief.
- **Objective**: one sentence, changed only when the scope changes (the old one shows under it
  for a while).
- **Status**: Working, Waiting on you, Blocked or Done, with when the agent last updated it
  ("Updated by the agent 2 turns ago, at 14:05"). After 3 turns without an update it says it's
  out of date.
- **Refresh**: asks the thread, in one short message, to update its brief. With no brief yet,
  **Ask for a brief** has the thread draft one from your first message.
- **Next up**: tick, rename, add or delete steps; the first five show and the rest fold.
  Ticked steps move to **Done** (folded, newest first).
- **Blocked**: each blocked step and what it waits on.
- **Parked**: out-of-scope finds; click one to start a new thread with it as the draft.

Your changes are saved at once, and the agent rereads the brief before it writes, so your
wording wins. The brief is kept on this computer, by thread, and survives resume, restart and
compaction. A forked thread starts with a copy of its parent's brief.

## The skill

Installing Thread brief offers its **thread-brief** skill for your coding agents. Install it:
it tells the agent when and how to keep the brief (only when something material changed, within
10 next, 10 done, 10 blocked and 5 parked items). Without it the brief stays empty until you ask
the agent yourself.

## Permissions

- `sessions.read`: sees when each thread works, to count turns, and which thread a fork came from.
- `agents.message`: hears from your agents about their own thread's brief.
- `sessions.message`: when you tap Refresh, sends that thread one short message.
- `agents.start`: starts a new thread from a parked item when you click it.

Thread brief runs a small Node server while it is on; it talks only to Ghostex on this computer.

## Not yet

The coordinator roll-up, a progress badge on the sidebar card and the phone (which has no side
panel views) are left for later. Next up can't be reordered by dragging yet.
