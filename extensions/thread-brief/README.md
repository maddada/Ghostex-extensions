# Work items

Ordinary sessions keep their own work items, the way a coordinator does: one item per line of
work, what each one asks of you, and what is finished, in the same Work panel. Needs a Ghostex
with work items for any session (`ghostex work --help` lists the commands). Version 0.3.1 draws
nothing in the sidebar, which only a newer Ghostex accepts, so it is published only in the store
catalog that Ghostex reads first (`catalog-v3.json`). Ghostex 11.8.0 to 11.11.0 read the older
catalog, which keeps Work items at 0.3.0 (with its Work list in the sidebar): they stay on it and
are not offered 0.3.1. Going back to one of those with 0.3.1 installed breaks its list of installed extensions
until Work items is uninstalled or Ghostex is updated again.

- **Turn it on, and that's it**: while Work items is on, every ordinary agent session Ghostex
  starts or resumes is told it keeps work items, and its **work-items** skill is in place. Turn
  it off and no session is told anything, the skill is taken away, and sessions work exactly as
  before.
- **The Work button**: in the window's header, beside Session details. It opens the session's
  Work panel beside the chat (or as a card when the window is narrow), with a count of what waits
  on you. Work and Session details share that spot, one at a time.
- **The Work panel**: the session's items by who has the ball: Needs you, Blocked, In progress,
  Waiting, Later and Finished today. At the top, the **Topic**: what the session is about, in one
  line. Click it to rewrite it; yours stays until you change it.
- **What it asks you**: shows as a row above the chat box, with its answers, Reply and Dismiss,
  as a coordinator's asks do. On the phone too.
- **Nothing in the sidebar**: Work items adds no button or list to the sidebar; Briefs and the
  Work list it replaced are gone.
- **Coordinators** keep theirs as before, and a coordinator's threads keep none of their own:
  the coordinator's Work panel tracks them.

## From Thread brief

Work items is what Thread brief became (0.3.0). When this version is installed and on, Ghostex
converts every session's brief once: the objective becomes the Topic, Next up items Later (up
next), Blocked items Waiting on what they waited on, Parked items Later (parked), and Done items
Finished. The old file is kept as `briefs.converted.json` in the extension's data folder.

## The skill

Installing Work items offers its **work-items** skill for your coding agents. It tells an agent
when and how to keep its items with `ghostex work item` and `ghostex work topic`. It is in place
only while Work items is on.

## Permissions

- `agents.note`: adds one line to what new agent sessions are told when they start, so they keep
  their work items without being asked.

Work items runs no server and draws nothing of its own.
