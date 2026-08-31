# Canvas

Canvas is an infinite pan-and-zoom board inside Ghostex. Open it as a view, next
to Agents, Code, Kanban, and Docs, write sticky notes anywhere on it, and it
keeps your place: the board, your notes, and the part of it you were looking at
are saved as you work and restored when you come back. Keep as many boards as
you like, and give a board to a project if you want one there.

Notes are markdown: write structure, links, code and task lists, and the note
shows them rendered on coloured paper. You do not have to know the syntax — the
bar above a note you are editing writes it for you. Draw on the same board with a
pen, hand-drawn shapes and text labels, and rub any of it out with the eraser.
Pick the font notes are written in, and give any board a picture of your own as
its background, from the settings panel inside the canvas.

## Setup

Install the extension, then pin it so it appears in the titlebar:

```sh
gx extensions install-local extensions/canvas
gx extensions state canvas --set pinned=true
```

There is nothing to configure and nothing to sign in to.

## Using the board

| Gesture | What it does |
| --- | --- |
| Trackpad or wheel scroll | Pan the board |
| Hold <kbd>Space</kbd> and drag | Pan the board |
| Middle-button drag | Pan the board |
| <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + scroll, or trackpad pinch | Zoom around the pointer |
| <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>+</kbd> / <kbd>-</kbd> / <kbd>0</kbd> | Zoom in, out, back to 100% |
| <kbd>Shift</kbd> + <kbd>1</kbd> | Zoom to fit |

The toolbar in the bottom-left corner does the same things with the pointer, and
shows the current zoom. The status in the top-right corner reads `Saved` once
your changes are stored, and says so plainly when they are not.

## Boards

The board's name sits in the top-left corner. Click it for the board switcher:
every board you have, and everything you can do to the one that is open.

| In the menu | What it does |
| --- | --- |
| A board's name | Opens it, with everything on it |
| **New board…** | Names a new, empty board and opens it |
| **Rename this board…** | Renames the open board |
| **Copy this board as JSON** | Copies the open board to the clipboard |
| **Delete this board…** | Deletes it, after asking |
| **Link this board to …** | Ties the open board to the project Ghostex has open |

Canvas reopens the board you had open last. Each board is separate: its notes,
its view, and its undo history are its own.

### A board for a project

When Ghostex has a project open, the menu says so at the top. If that project
has a board, the menu offers to open it; if it has none, **New board for
`<project>`** makes one and links it in a click. A linked board is marked with a
◆ next to its name, and the switcher lists which project each board belongs to.

Linking never switches boards on its own: changing project in Ghostex leaves
whatever you are working on open, and offers the project's board in the menu.
A project has one board — linking a second board to it moves the link, and the
first board keeps everything on it. Boards with no project carry on unchanged,
and if Ghostex has no project open, the menu says nothing about projects.

## Copying a board out

Boards live in Ghostex's own extension store, which has no export of its own.
**Copy this board as JSON** in the switcher menu is the way out: it puts the
open board on the clipboard as the same document Ghostex stores — its name, its
schema version, everything on it, and where you were looking — laid out to be
read. Paste it into a file, a note or a gist and the board is backed up. A line
along the bottom of the board says which board was copied, or says plainly that
the copy did not go through.

A board's background picture is not in the copy. It is stored apart from the
board for the same reason it is left out here: it is megabytes of image data,
and it would bury the part you can actually read.

## Notes

Double-click anywhere on the board to write a note there, or use **Note** in the
tool bar at the top to put one in the middle of the view. Double-clicking makes
a note only while **Select** is the tool in hand.

| Gesture | What it does |
| --- | --- |
| Double-click the board | New note, ready to type in |
| Double-click a note | Type in it |
| Drag a note | Move it, and whatever is selected with it |
| Drag a corner handle | Resize it |
| Click a note | Select it |
| <kbd>Shift</kbd> + click | Add it to the selection, or take it out |
| Click the board | Deselect |
| **Edit** in the bar above a selected note | Edit its markdown |
| **Done** in that bar | Back to the rendered note |
| A button on the format bar above it | Write that markdown into the note |
| A swatch in the note's bar | Paint the note that colour |
| <kbd>C</kbd> | Cycle the selected note to the next colour |
| **Aa** in that bar | Write this one note in a font of its own |
| The × in that bar | Delete it |
| <kbd>Esc</kbd> | Stop typing |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete whatever is selected |
| <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo |
| <kbd>⇧</kbd> + <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Z</kbd> | Redo |

Undo and redo cover every change to the board — adding, moving, resizing,
typing, colouring, ticking, deleting — and one drag is one undo, not one per
pixel. They do not move the view: undo puts your notes back, and leaves you
looking where you are looking. Undo also puts the selection back: undo a
Delete and what came back is selected, ready to be moved instead.

## Selecting

With **Select** in hand, everything on the board can be picked up the same
way — notes, ink, shapes and labels. A selected drawing shows a box; a selected
note shows its bar and handles.

| Gesture | What it does |
| --- | --- |
| Click a note, a stroke, a shape or a label | Select it |
| <kbd>Shift</kbd> + click | Add it to the selection, or take it out again |
| Drag on empty board | Drag out a box: everything wholly inside it is selected |
| <kbd>Shift</kbd> + drag on empty board | Add what the box surrounds to the selection |
| Drag a selected item | Move the whole selection with it |
| Click one item of a selection | Select just that one |
| Click the board | Deselect everything |
| <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>A</kbd> | Select everything on the board |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete the selection |
| Arrow keys | Nudge the selection by 1; with <kbd>Shift</kbd>, by 5 |
| <kbd>Esc</kbd> | Back to **Select** with nothing selected |

A group moves as one: drag any member and the rest follow, and a group drag or
a group delete is one undo. Ink is painted on top of notes, so where a stroke
crosses a note a click picks up the stroke; click the note away from the ink to
pick up the note. Picking a drawing tool lets go of the selection.

## Keyboard

The tool keys are Excalidraw's, so that muscle memory carries over. Each tool
button's tooltip shows its keys.

| Key | Tool |
| --- | --- |
| <kbd>V</kbd> or <kbd>1</kbd> | Select |
| <kbd>P</kbd> or <kbd>7</kbd> | Pen |
| <kbd>R</kbd> or <kbd>2</kbd> | Rect |
| <kbd>O</kbd> or <kbd>4</kbd> | Ellipse |
| <kbd>L</kbd> or <kbd>6</kbd> | Line |
| <kbd>A</kbd> or <kbd>5</kbd> | Arrow |
| <kbd>T</kbd> or <kbd>8</kbd> | Text |
| <kbd>E</kbd> or <kbd>0</kbd> | Eraser |

Keys only act on the board: while you are typing in a note or a label they are
letters. Zoom, undo and redo keys are listed with the gestures above.

## Markdown in a note

A note holds markdown and shows it rendered. Double-click it (or press **Edit**)
to see the source, <kbd>Esc</kbd> or **Done** to go back. Headings,
**bold**, `code`, fenced code blocks, lists, quotes, tables and links all work.

You do not have to know any of that syntax. While the source is open, a second
bar sits above the note with a button for each piece of markdown:

| Button | What it writes |
| --- | --- |
| Bold | `**bold**` |
| Italic | `*italic*` |
| Heading | `# heading`, then `##`, then `###`, then plain text again |
| Bullet list | `- item` |
| Task list | `- [ ] task` |
| Inline code | `` `code` `` |
| Code block | a fenced block around the lines you picked |
| Link | `[text](url)`, with the address left selected to paste over |

A button works on whatever is selected, or on the line the caret is in, and puts
you back where you were in the text. Press it again to take the markdown off,
and <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Z</kbd> takes one press back. A heading
and a list item are different kinds of line, so making a line into one takes the
other off rather than stacking them up.

Task lists are live. Write

```markdown
- [ ] write the note
- [x] read it back
```

and the rendered note shows real checkboxes: click one and it ticks the matching
line in the markdown, so the note text stays the one source of truth. Ticking is
an ordinary edit, so <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Z</kbd> takes it back.

Every rendered note is sanitized with DOMPurify before it reaches the board:
scripts, event handlers and `javascript:` links in a note never run, and a
link in a note opens away from the board rather than replacing it.

## Note colours

Notes come on six papers — butter, apricot, rose, mint, sky and lilac. Select
a note and pick a swatch from the bar above it, or press <kbd>C</kbd> to cycle
to the next colour. The colour is part of the note, so it is saved and restored
with everything else, and undo takes a recolour back.

## Drawing

The tool bar at the top says what the pointer does. **Select** picks things up
and moves them, and everything else draws:

| Tool | What it does |
| --- | --- |
| **Pen** | Freehand ink. It thins and thickens with how fast you draw |
| **Rect**, **Ellipse**, **Line**, **Arrow** | Drag out a hand-drawn shape |
| **Text** | Click, type a label straight onto the board, <kbd>Esc</kbd> when done |
| **Eraser** | Drag across ink, shapes and labels to rub them out |

While a drawing tool is out it owns the pointer: notes stay where they are and
you draw straight over them. Pick **Select** to move things again. A tool stays
in hand until you change it, so three rectangles are three drags, not three
trips to the tool bar. Placing a label is the exception — it hands the pointer
back to **Select** so your next click does not start another one.

Holding <kbd>Shift</kbd> while you drag squares a rectangle, rounds an ellipse
into a circle, and snaps a line or arrow to the nearest 15°. Space-drag,
middle-drag and scroll still pan while a drawing tool is out, and
<kbd>⌘</kbd>/<kbd>Ctrl</kbd> + scroll still zooms.

Every stroke, shape and label is one undo: a whole scribble goes back in one
<kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Z</kbd>, and so does a whole eraser sweep,
however many things it took. Back in **Select**, a stroke, shape or label is
picked up, moved and deleted like a note — see *Selecting* above.

The eraser does not touch notes. A note holds writing you cannot draw again,
and it already has a ✕ in its own bar and the <kbd>Delete</kbd> key.

## Ink

The row under the tool bar appears for the tools that draw, and holds six inks
— chalk, coral, amber, sage, azure and violet — and three weights. Whatever is
picked there is what the next stroke, shape or label is drawn in; a label's
weight sets how big its text is. Like note paper, the ink is stored by *name*,
so the palette can be restyled later without rewriting saved boards.

## Settings

**Settings**, at the end of the zoom toolbar in the bottom-left corner, opens a
panel with every look option Canvas has. Nothing about how the board looks is
fixed in the code: what the panel shows is what you can change, and every value
is saved and comes back with the board. <kbd>Esc</kbd> or a click on the board
closes it.

### Fonts

The **Text** section lists the fonts notes and labels can be written in, each
shown in itself. Four ship inside the extension — Caveat (hand-drawn), Inter
(sans), Lora (serif) and JetBrains Mono (mono), all under the SIL Open Font
License — and three are the system's own sans, serif and mono. Picking one
makes it the font for every note and label on every board.

A single note can have a font of its own: select it and press **Aa** in the bar
above it. That note keeps its font when the default changes; **Default** in the
same menu hands it back. A note's font is part of the note, so it is saved with
it and undo takes it back.

Nothing is ever fetched. A font is only loaded from `dist/fonts/` the first time
something on the board is written in it.

### A background for a board

The **Background** section belongs to the board that is open, and says which one.
**Choose picture…** takes a PNG, JPEG or WebP, and so does dropping one
anywhere on the board. The picture is shrunk to at most 2048 pixels on its long
side, compressed, and kept with that board only; it sits behind the board like a
wallpaper, filling the view, and never moves with the pan or zoom.

Four sliders keep what is on the board readable over it: **Contrast**,
**Brightness**, **Saturation** and **Opacity**. They are filters drawn over the
picture, not changes to it, so moving one back is all it takes to undo it, and
**Reset sliders** moves them all back at once. **Remove** takes the picture off
the board. Changing the picture keeps the sliders where you had them.

## Preferences

None in Ghostex's own settings. Everything about how Canvas looks is in the
settings panel inside the canvas, where it can be changed without a new consent
prompt, and where a board can carry settings of its own.

## Permissions

None. Canvas asks for no host capabilities. It uses only `ghostex.storage`,
which needs no permission, to keep boards in Ghostex's own extension store.
Everything it runs ships in `dist/`: no CDN scripts, no remote imports, no
network access of any kind.

Copying a board as JSON is not the `clipboard` permission either: that one is
about Ghostex's own clipboard bridge, and Canvas never calls it. The copy is
the page's own — `navigator.clipboard`, and the older selection copy behind it
for a view that refuses the first.

## Storage

Four kinds of key in the Ghostex extension store. `boards` is the index: which
boards exist, what they are called, which project each is linked to, and which
one to reopen. Each board's contents are one key of their own, `board:<id>`,
holding a versioned document — `schemaVersion`, its notes, and the saved
viewport. A board's name lives only in the index, so the two can never disagree.
`settings` holds what applies everywhere: today, the default font. A board's
background is `background:<id>` — the picture as a compressed data URL and the
four slider values — in a key of its own, so the board document that saves on
every drag never carries the picture. A board with no picture has no such key
until it is deleted; a removed picture leaves `null` behind, and so does
deleting a board, for its contents and its background both.

A note stores its markdown as you typed it and the *name* of its colour, never a
hex value, so the palette can be restyled without rewriting saved boards. The
same goes for a font: a note that chose one stores its name, and a note that did
not stores nothing and follows the default. Ink
stores the points it was drawn through, trimmed and rounded so a board file is
not paying for samples nobody can see; a shape stores the two corners it was
dragged between plus the seed that makes rough.js draw the same sketch every
time, so a shape never re-rolls its wobble when the board is reopened. Boards
written by an older version are migrated on load.

Writes are debounced, so a burst of panning or a whole drag is one save, while
creating, renaming, switching, or deleting a board is written straight away.
The store has no delete, so a deleted board's key stays behind holding `null`.
Boards survive Ghostex restarts and extension updates, and are removed when the
extension is uninstalled. Undo history is not stored: reopening the view gives
you the board as you left it, with a fresh undo stack.

## Development

Requires Node.js 22. From this folder:

```sh
npm ci --ignore-scripts   # install pinned dependencies
npm run check             # typecheck, tests, and the reproducible build
```

`npm run build` rebuilds `dist/` from `src/` with esbuild and must produce the
committed bundle byte for byte; CI verifies this. The bundle contains Preact,
marked, DOMPurify, Rough.js and perfect-freehand, all pinned to exact versions
and listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The build also
copies the four bundled fonts out of their pinned `@fontsource` packages into
`dist/fonts/`, and refuses to finish if `src/styles.css` and `build.mjs` disagree
about which files those are. `npm test` runs the suite in jsdom against a fake
`window.ghostex` bridge with in-memory storage, so the whole extension is
exercised headlessly.

From the repository root:

```sh
node tooling/validate.mjs extensions/canvas/ghostex-extension.json
node tooling/verify-dist.mjs
```
