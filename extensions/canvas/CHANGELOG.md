# Changelog

## [0.2.0] - {PR_MERGE_DATE}

- Canvas now draws with real [Excalidraw](https://github.com/excalidraw/excalidraw)
  0.18.1 instead of a drawing engine of its own. The whole of it comes across:
  the toolbar, the properties panel, the shape library, the command palette,
  the context menu, undo and redo, and every keyboard shortcut Excalidraw
  ships. Nothing about drawing is reimplemented here any more.
- Everything around the drawing is unchanged: named boards, the switcher, links
  to the Ghostex project you have open, per-board background pictures with
  their four sliders, autosave to Ghostex storage, and the save state on the
  board. The switcher and the Background button moved to the top-right corner,
  beside Excalidraw's Library button.
- Boards saved by 0.1 are converted the first time 0.2 opens one, and written
  back converted, so it happens once. Notes become filled rectangles with their
  writing bound inside and their paper colour kept; ink becomes freedraw;
  rectangles, ellipses, lines and arrows become their Excalidraw equivalents,
  keeping their sketch; labels become text; and the view you were on is carried
  across. Colours land on Excalidraw's nearest swatch rather than being copied
  as hex, because Excalidraw stores colours for a light board and inverts the
  canvas to draw a dark one.
- **Markdown notes are gone.** A converted note keeps every character that was
  typed into it, but as the text it was written in rather than a rendered
  document — headings, links, code and task lists read as their source. This is
  not reversible. Coloured paper survives as a rectangle's fill; the per-note
  format bar, the live task-list checkboxes, and the note and label fonts do
  not: Excalidraw brings its own fonts and its own way of choosing them.
- A board's background is now a colour as well as a picture. Six colours are a
  click away in the Background panel and the `+` opens a picker for any other.
  It is what a picture's transparency shows through, so a cut-out sits on the
  colour you chose rather than on whatever happened to be behind it. Removing a
  picture keeps the colour. Excalidraw's own canvas-background picker is hidden,
  because Canvas paints that canvas transparent to put the picture behind it —
  this is what replaces it.
- **Copy this board as JSON** now copies an `.excalidraw` file, so a copied
  board pastes into excalidraw.com, into a Ghostex drawing, or into a file.
- The dotted grid is off unless you turn it on, in Excalidraw's own context
  menu. Light and dark are its own toggle, remembered per board.
- Still no permissions and still no network. Excalidraw's fallback to a font
  CDN is patched out of the bundle at build time and pointed at `dist/fonts/`
  instead, and the build refuses to finish if `dist/` names a host it has not
  already accounted for. Excalidraw's own online features — text to diagram,
  the Mermaid converter, and live embedded links — are turned off for the same
  reason, and the Mermaid converter is left out of the bundle entirely rather
  than shipping six megabytes of code nothing can reach.

## [0.1.0] - {PR_MERGE_DATE}

- Initial release: an infinite pan-and-zoom canvas in a Ghostex view.
- Pan with a trackpad or wheel scroll, space-drag, or a middle-button drag.
- Zoom around the pointer with ⌘/Ctrl-scroll or a trackpad pinch, plus a zoom
  toolbar, zoom-to-fit, and the usual zoom keyboard shortcuts.
- Named boards: a switcher in the top-left corner lists every board, creates,
  renames, and deletes them (with a confirmation), and reopens the board you
  had open last. Each board keeps its own notes, view, and undo history.
- A board can be linked to the Ghostex project you have open: the switcher
  surfaces that project's board, or creates and links one in a click. Changing
  project never switches the board out from under you.
- Sticky notes: double-click the board or use the toolbar to add one, drag to
  move, corner handles to resize, click to select, a × button or the Delete
  key to remove, and editing in place.
- Notes are markdown, shown rendered: headings, emphasis, code, quotes, tables,
  lists and links, with an Edit / Done flip between the source and the note.
  Every note is sanitized with DOMPurify before it reaches the board.
- A format bar above a note while its source is open: bold, italic, heading,
  bullet list, task list, inline code, code block and link each write their own
  markdown into the selection, or into the line the caret is in, and hand the
  selection straight back. Pressing a button again takes the markdown off, and
  each press is one undo step.
- Live task lists: clicking a checkbox in a note ticks the matching `- [ ]` line
  in its markdown, and undo takes the tick back.
- Six note colours on the bar above a selected note, plus C to cycle through
  them.
- Drawing tools in the bar at the top: a pen for freehand ink that thins and
  thickens with the speed of the stroke, hand-drawn rectangles, ellipses, lines
  and arrows, and text labels typed straight onto the board.
- Six inks and three weights for everything drawn, on a row that appears for
  the tools that use it. Hold Shift while dragging to square a rectangle, round
  an ellipse, or snap a line or arrow to 15°.
- An eraser that rubs out ink, shapes and labels as you sweep across them.
  Notes it leaves alone: those have their own ✕ and the Delete key.
- Selection across every kind of item: with Select in hand, a click picks up a
  note, a stroke, a shape or a label; shift-click adds or removes one; a drag on
  empty board draws a box that selects everything wholly inside it. Dragging any
  selected item moves the whole selection, Delete removes it, and ⌘/Ctrl-A
  selects everything.
- Excalidraw's tool keys (V/1, P/7, R/2, O/4, L/6, A/5, T/8, E/0), shown on each
  tool's tooltip; Escape returns to Select with nothing selected; the arrow keys
  nudge the selection by 1, or by 5 with Shift.
- A settings panel inside the canvas, opened from the zoom toolbar, holding every
  look option: nothing about the board's look is fixed in the code, and every
  value is saved and restored.
- Fonts: notes and labels are written in a font picked from a list — Caveat,
  Inter, Lora and JetBrains Mono ship inside the extension under the SIL Open
  Font License, next to the system's own sans, serif and mono. One is the
  default for every board; a single note can pick its own from the Aa button in
  its bar, and keeps it when the default changes.
- A background picture per board: choose a PNG, JPEG or WebP in the panel or
  drop one on the board. It is shrunk and compressed, kept in a storage key of
  its own so board saves stay small, and drawn behind the board like a
  wallpaper. Contrast, brightness, saturation and opacity sliders adjust it as
  filters, never touching the picture, with a reset and a remove.
- Undo and redo (⌘/Ctrl-Z and ⇧⌘/Ctrl-Z) across every change to the board, with
  a whole drag, resize, typing burst, stroke, or eraser sweep as a single step.
  Undo restores the selection too, so an undone Delete hands the items back
  selected.
- The board, its notes, and its viewport autosave to Ghostex storage and restore
  on reload, with the save state visible on the board.
- **Copy this board as JSON** in the board switcher puts the open board on the
  clipboard as the same versioned document that is stored, with its name, and
  says on the board whether the copy landed. It asks for no permission: the
  copy is the page's own, not Ghostex's clipboard capability.
