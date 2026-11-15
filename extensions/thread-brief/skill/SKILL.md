---
name: thread-brief
description: Keeps this session's brief (objective, status, next up, done, blocked, parked) current in Ghostex's Thread brief side panel. Use when Ghostex says this session has a thread brief, at the end of a turn in which something material changed, when the user asks you to update or write your thread brief, or when they ask what this session is for and what is left. Not for coordinators or their threads.
---

# Thread brief

Ghostex shows this thread's brief in the side panel (the Thread brief view), so the user can
see in a few seconds what the thread is for, what is done, what is left, what is blocked and
what was parked. You keep it current. You reach only your own thread's brief: Ghostex tells the
extension which thread you are.

Only ordinary sessions keep a brief. If you are a coordinator, or a coordinator started you as
one of its threads, skip this skill: the coordinator's Work panel tracks that work, and the
extension refuses your messages.

## When to write the first one

When Ghostex tells you this session has a thread brief, write it once the session has a real
task (not for a greeting or a quick question): draft the objective from the user's request and
the steps you can see, then keep it current as below.

## When to update it

At the end of a turn, and only when something material changed:

- you finished, started or dropped a step;
- the scope changed (then change the objective);
- you hit a blocker, or one cleared;
- you found something out of scope worth doing later (park it);
- the status changed (working, waiting on the user, blocked, done).

Don't update it for small talk, a question you answered without doing work, or a turn where
nothing on the brief moved. Never run a separate summary step for it.

When the user asks you to write or refresh your brief (Ghostex's Refresh button sends that
request), do it now and always send it back, even when nothing changed: that marks it fresh.
With no brief yet, draft the objective from the user's first message in this thread.

## How

1. Read it first, every time (the user may have ticked, renamed, added or deleted items):

   ```bash
   ghostex extensions message thread-brief read
   ```

   The answer has `revision`, `objective`, `status`, and the lists `next`, `done`, `blocked`
   and `parked`. Each item has an `id`; items with `"userEdited": true` or `"source": "user"`
   are the user's.

2. Send the whole brief back with that revision:

   ```bash
   ghostex extensions message thread-brief update - <<'EOF'
   {
     "revision": 3,
     "objective": "Make the export button work on Windows.",
     "status": "working",
     "next": [{ "id": "next-abc", "text": "Fix the path joining" }, "Add a test for UNC paths"],
     "done": [{ "id": "next-xyz", "text": "Reproduce the bug" }],
     "blocked": [{ "text": "Sign the installer", "waitingOn": "the signing certificate" }],
     "parked": ["Export to PDF as well"]
   }
   EOF
   ```

   - Keep every item you are not changing, with its `id`. A plain string is a new item.
   - Done goes newest first.
   - The user's items stay as the user wrote them: keep their text. If Ghostex answers
     `keptUserText`, it kept the user's wording for those items; that is expected.
   - If it answers that the brief changed since you read it, read it again, keep the user's
     changes, and send your update with the new revision.

## Keep it scannable

- Objective: one sentence. Change it only when the scope changes. When the user wrote it
  (`"objectiveByUser": true`), it stays theirs: Ghostex keeps their wording, and if it no longer
  fits, ask them in your reply instead.
- Status: `working`, `waiting` (waiting on the user), `blocked` or `done`.
- At most 10 items in next up, 10 in done (drop the oldest), 10 in blocked, 5 in parked.
- Each item is one short line (200 characters at most), in the user's words where you can.
- Next up is ordered: the next step first.
- Not a task manager and not a summary of the transcript: no dates, owners or narrative.
