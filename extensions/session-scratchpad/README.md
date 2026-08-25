# Session Scratchpad

Session Scratchpad is a small Markdown notebook beneath the Ghostex chat
composer. Each active session gets its own note, so changing sessions swaps the
editor to the note associated with that session.

## Using the scratchpad

Type in the editor and the note saves automatically after a short pause. Use
the Preview button to render headings, emphasis, inline and fenced code, lists,
and block quotes. Switching back to Edit keeps the same text.

Notes are stored through `ghostex.storage` under
`notes:<active-session-id>`. The extension listens for Ghostex context changes
and flushes the current note before loading another session.

## Development

The extension is dependency-free and has no build step. `src/index.html` and
`dist/index.html` are intentionally identical, self-contained files. After an
edit, copy the complete source file to `dist/`, then run the repository
validator and catalog builder.

## Permissions

None. Session context and extension-scoped storage are available without an
additional host capability.
