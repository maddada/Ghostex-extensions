# Canvas

Canvas is an infinite drawing board inside Ghostex. Open it as a view, next to
Agents, Code, Kanban and Docs, and sketch: freehand ink, boxes, arrows, text,
images, all with real [Excalidraw](https://github.com/excalidraw/excalidraw)
running inside the extension. It keeps your place — everything on the board and
the part of it you were looking at are saved as you work and restored when you
come back.

Keep as many boards as you like, and give a board to a project if you want one
there. Give any board a picture of your own as its background, and it sits
behind the drawing rather than in it.

Canvas asks for no permissions and reaches no network. Everything it runs,
Excalidraw and its fonts included, ships inside `dist/`.

## Setup

Install the extension, then pin it so it appears in the titlebar:

```sh
gx extensions install-local extensions/canvas
gx extensions state canvas --set pinned=true
```

There is nothing to configure and nothing to sign in to.

## Drawing

The drawing is Excalidraw's, unchanged: the toolbar across the top, the
properties panel that appears beside a selection, undo and redo, the shape
library, the command palette, the context menu, and every keyboard shortcut it
ships with. Its own help dialog — the `?` in the corner, or the menu — is the
reference, and it is right, because nothing about the drawing is reimplemented
here.

A few things are turned off, because a Ghostex extension with no permissions
cannot honestly offer them:

| Off | Why |
| --- | --- |
| Text to diagram, and the Mermaid converter | Both sit behind Excalidraw's AI features, which call a server. |
| Live embedded links (YouTube, Figma, and the rest) | An embed is a frame fetched over the network. |
| Open, Save to file, Export to file | Files are Ghostex's business; a board saves itself into the host store. |
| Excalidraw's canvas background picker | Canvas paints that canvas transparent so a picture can sit behind it, and offers the colour in its own Background panel instead. |

Everything else is there, including **Export image**, which hands you a PNG or
SVG through the browser, and the shape library, which is stored locally.

The dotted grid is off unless you turn it on — right-click the board, or the
menu. Light and dark are Excalidraw's own toggle, remembered per board.

## Boards

The board's name is in the top-right corner, beside Excalidraw's Library
button. Click it for the menu:

| In the menu | What it does |
| --- | --- |
| The list of boards | Switches to one. The open board has a ✓. |
| New board… | Names and opens an empty board. |
| Rename this board… | Renames the open one. |
| Copy this board as JSON | Puts the open board on the clipboard as an `.excalidraw` file. |
| Link this board to *project* | Ties the open board to the Ghostex project you have open. |
| Delete this board… | Asks first, then deletes the board and its background. |

Every board has its own contents, its own view, its own undo history and its own
background picture. Switching boards saves the one you are leaving first.

Canvas always has a board open: delete the last one and a fresh empty board takes
its place. The board you had open is the one that reopens next time.

### Boards and projects

A board can belong to the Ghostex project you have open. When it does, the
switcher shows that project at the top of the menu and offers its board — or
offers to create one, named after the project and linked in a single click.

A project has at most one board, so linking a board to a project that already
has one moves the link; the old board keeps everything on it, unlinked.

Nothing switches on its own. Changing project in Ghostex never moves the board
out from under you while you are drawing; the menu just starts offering the
other one.

## The background picture

The **Background** button, beside the board name, opens the panel for the open
board's backdrop.

**The colour** at the top is what the board sits on. Six are a click away —
black, Ghostex's own near-black, slate, sepia, paper and white — and the `+`
opens a picker for any other. It matters most with a cut-out: a PNG with
transparency shows this colour through its holes, so a logo on a transparent
background sits on the colour you chose rather than on whatever was there.

**The picture** goes in front of it. Choose a PNG, JPEG or WebP, or drop one
anywhere on the board. It is scaled down
to fit and compressed, then drawn behind Excalidraw's canvas — behind everything,
not on it: nothing can select it, nothing can move it, and it is never part of
what you draw or export.

Four sliders — contrast, brightness, saturation and opacity — keep the drawing
readable over it. They are filters applied when the picture is drawn, so the
picture itself is never changed and every adjustment undoes by moving the slider
back. **Reset sliders** returns all four to neutral, and **Remove** takes the
picture away while keeping the colour — they are two separate choices.

A backdrop belongs to one board. Each board can have its own colour, its own
picture, both, or neither.

## Copying a board out

**Copy this board as JSON** in the board menu puts the open board on the
clipboard as an `.excalidraw` file: Excalidraw's own format, with the board's
name in it. Paste it into excalidraw.com, into a Ghostex drawing, or into a
file — it opens anywhere Excalidraw runs.

It copies the board that is open and nothing else: not your other boards, not
the background picture.

## Boards from before Excalidraw

Canvas 0.1 had a drawing engine of its own — sticky notes, ink, four shapes and
text labels. Every board saved by it is converted the first time 0.2 opens it,
and written back in the new shape, so the conversion happens once:

| Was | Becomes |
| --- | --- |
| A sticky note | A filled rounded rectangle with the note's writing bound inside it, keeping the paper colour. |
| Freehand ink | A freedraw stroke, drawn through the same points. |
| A rectangle, ellipse, line or arrow | The same shape in Excalidraw, keeping its sketch. |
| A text label | Text on the board. |
| Where you were looking | The same view, in Excalidraw's terms. |

Two things do not survive, and cannot. **Markdown is now plain text**: every
character you typed is still in the note, but it reads as the source it was
written in rather than as a rendered document, and the change is not
reversible. **Per-note fonts and the default font are gone**, because Excalidraw
brings its own fonts and its own way of choosing them.

Colours are mapped to Excalidraw's nearest swatch rather than carried across as
hex values. Excalidraw stores every colour as though the board were light and
inverts the canvas to draw a dark one, so a verbatim copy of Canvas 0.1's
near-white ink would come out black and invisible.

## Permissions

None. Canvas asks for no host capabilities. It uses only `ghostex.storage`,
which needs no permission, to keep boards in Ghostex's own extension store.

It reaches no network either. Excalidraw normally falls back to a CDN when it
cannot find a font file; `build.mjs` removes that fallback from the bundle at
build time and points Excalidraw at `dist/fonts/` instead, so the shipped code
has no font URL in it at all. The build also refuses to finish if `dist/` so
much as names a host `build.mjs` has not already accounted for.

Copying a board as JSON is not the `clipboard` permission either: that one is
about Ghostex's own clipboard bridge, and Canvas never calls it. The copy is the
page's own `navigator.clipboard`.

## Storage

Three kinds of key in the Ghostex extension store.

`boards` is the index: which boards exist, what they are called, which project
each is linked to, and which one to reopen. A board's name lives only here, so
the two can never disagree.

`board:<id>` is one board's contents: `schemaVersion`, the Excalidraw elements
on it, the pictures pasted into it, and the slice of Excalidraw's app state
worth keeping — where the board is scrolled, its zoom, its theme, and the
settings the next shape is drawn with. What is selected, what dialog is open and
where the pointer is are about this moment rather than about the board, and are
deliberately dropped.

`background:<id>` is a board's backdrop — the colour, the picture as a
compressed data URL, and the four slider values — in a key of its own, so the
board document that saves on every drag never carries the picture. A board on
the default colour with no picture has no such key at all, and a board saved
before colours existed reads back on the default it was already drawn on.

Writes are debounced, so a whole drag is one save, while creating, renaming,
switching or deleting a board is written straight away. Excalidraw reports a
change for things that leave the board exactly as it was — a selection, a
pointer moving — so a board is only written when its contents actually moved.

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
committed bundle byte for byte; CI verifies this. Most of what lands there is
not ours: `@excalidraw/excalidraw` publishes only a prebuilt bundle, so the
build inlines chunks upstream already minified, and the reviewable surface is
`build.mjs` plus `src/` — what is pulled in, what is patched out, and what is
copied. Everything in the bundle is pinned to an exact version and listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), which is generated — Excalidraw
brings some sixty packages of its own, and a hand-kept list would be wrong within
one upgrade:

```sh
node notices.mjs > THIRD_PARTY_NOTICES.md
```

The build makes exactly two changes to upstream's bytes, both of them removing
the font CDN described under **Permissions**, and both asserted to match exactly
once so a version bump fails the build rather than quietly restoring it. It
copies Excalidraw's stylesheet and its Latin font families into `dist/`, skipping
only Xiaolai, the CJK fallback, which is twelve megabytes of per-glyph subsets;
and it refuses to finish if the fonts it ships and the fonts the bundle asks for
have drifted apart.

`npm test` runs the suite in jsdom against a fake `window.ghostex` bridge with
in-memory storage. Excalidraw itself is stood in for there — it wants a canvas,
fonts and a worker that jsdom has none of — so the tests cover everything around
the drawing: the boards, the project links, the conversion of old boards, and
what reaches the host store.

From the repository root:

```sh
node tooling/validate.mjs extensions/canvas/ghostex-extension.json
node tooling/verify-dist.mjs
```
