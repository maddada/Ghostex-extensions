# Changelog

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
