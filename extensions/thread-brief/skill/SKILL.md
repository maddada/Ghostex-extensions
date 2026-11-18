---
name: work-items
description: Keeps this session's work items current in Ghostex's Work panel (the Work button in the window's header) with `ghostex work item` and `ghostex work topic`. Use when Ghostex says this session keeps work items, once the session has a real task, at the end of a turn in which a line of work started, moved, finished or needs the user, or when the user asks what this session is doing and what is left. Not for coordinators (they have their own playbook) or a coordinator's threads.
---

# Work items

Ghostex shows this session's work items in the Work panel (the Work button in the window's
header, beside Session details), so the user sees in a few seconds what this session is doing,
what waits on them, and what is done. You keep them current with `ghostex work`. They are the
same work items a coordinator keeps, in the same panel; `ghostex work --help` has every command.

Only ordinary sessions keep their own. If you are a coordinator, follow your playbook instead; if
a coordinator started you as one of its threads, skip this skill: your coordinator's Work panel
tracks your work, and `ghostex needs-you add` puts what you need from the user before them.

## 1. When

Once the session has a real task (not for a greeting or a quick question), add an item for it.
Then, at the end of a turn, update only what moved: an item started, a step finished, something
needs the user, an item finished. Never run a separate summary step for it, and leave it alone
for small talk or a question you answered without doing work.

## 2. One item per line of work

An item is a line of work named the way the user would name it ("Export button on Windows"),
never a step, a test run or a question. Start one with:

```bash
ghostex work item add "Export button on Windows" --now "Reproducing the path bug"
```

It prints its number (`W3`). Use `--later next` (or `parked`, `backlog`) for work you found but
are not doing now. Set the panel's Topic, what this session is about in one line, once:

```bash
ghostex work topic "Fix exports on Windows"
```

A Topic the user wrote stays theirs: Ghostex refuses to replace it, so if it no longer fits, ask
them in your reply.

## 3. Keep it current

- `ghostex work item now W3 "<where it stands>"`: one line that replaces the last. In progress
  means you are on it right now; anything the user must try or decide is an ask, not a now line.
- `ghostex work item step W3 "<step>" [--done]`: the steps worth showing; `--chore` keeps a
  rebuild or a test run out of sight.
- `ghostex work item wait W3 --on "<what>"`: it waits on something outside (another item `W4`,
  a question `Q12`, or words).
- `ghostex work item done W3 "<the one line worth keeping>"`: finished; today's show under
  Finished.
- `ghostex work item drop W3`: no longer wanted (`restore` brings it back for 7 days).

## 4. Asking the user

What you need from the user is an ask on its item, shown as a row above their chat box with
one-click answers:

```bash
ghostex work item ask W3 "Use cursor paging for the export?" \
  --detail "Offset paging skips rows when the list changes during an export." \
  --answers "Cursor,Offset" --recommended Cursor
```

The title is one short plain question; the rest goes in `--detail`. Add `--holds` when the work
stops until they answer. Their answer arrives as a message: "W3 Q12: Cursor" (already recorded).
`ghostex work next-tag` prints the next free question tag if you also ask in your reply.

## 5. Leading other sessions

When you hand work to another session (`ghostex agents send`), attach it to the item with
`--thread <session>` on `add`, `now` or `edit`: the item then shows that session's live state.
For a note that needs nothing from a session right now, use `ghostex agents send <session>
--with-next "<note>"`: it waits for that session's next message instead of starting a turn.

## 6. The user's edits win

The user can answer, dismiss, snooze, finish or drop items and rewrite the Topic in the panel.
Read the list before you change things after a while away:

```bash
ghostex work list
```

Never put back what the user finished, dropped or answered.

## 7. Not a coordinator

You keep your own items only. You don't start threads, keep a playbook or memory, or use the
coordinator-only commands (`ghostex coordinator start-thread`, `link`, `resolve` and the rest).

## 8. When it is off

With Work items turned off in Settings > Extensions, `ghostex work item` refuses in an ordinary
session and this skill is taken away; carry on without it.
