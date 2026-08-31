/**
 * One sticky note on the board: drag it to move, grab a corner to resize,
 * double-click to write in it.
 *
 * A note holds markdown and shows it rendered; double-clicking flips it to the
 * source, and Escape or the Done button flips it back. Checkboxes in the preview
 * are live — clicking one edits the markdown behind it, so the note text stays
 * the single source of truth.
 *
 * While the source is open a second bar appears above the first and writes
 * markdown into the selection, so none of the syntax has to be known by heart.
 * It is not a rich text editor: `format.ts` decides what each button types, and
 * the note is still the markdown it produced.
 *
 * Notes live inside the world layer, which is already transformed, so their
 * geometry is plain world coordinates and their text scales with the board.
 * Only the chrome the user grabs — the selection outline, the resize handles
 * and the bars above the note — is divided by the zoom, so it keeps its size on
 * screen at every zoom level.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
  NOTE_COLORS,
  RESIZE_HANDLES,
  resizeRect,
  type NoteColor,
  type NoteItem,
  type Rect,
  type ResizeHandle,
} from './board.js';
import { FONTS, fontFor, fontStack, type FontName } from './fonts.js';
import { applyFormat, type FormatKind, type Selected } from './format.js';
import { CLICK_SLOP_PX } from './interactions.js';
import { TASK_ATTRIBUTE, renderMarkdown } from './markdown.js';
import type { Point } from './viewport.js';

/** On-screen size of the note's chrome, in pixels, at any zoom. */
const HANDLE_PX = 10;
const OUTLINE_PX = 2;
/** Gap between the note's top edge and the bars floating above it. */
const BAR_GAP_PX = 8;

/**
 * The format bar, left to right. Each glyph is as close to the markdown that
 * button writes as one control can get, and the tooltip spells the syntax out:
 * for someone who does not know markdown yet, the bar is also how it is learnt.
 */
const FORMATS: readonly { kind: FormatKind; name: string; syntax: string; glyph: string }[] = [
  { kind: 'bold', name: 'Bold', syntax: '**bold**', glyph: 'B' },
  { kind: 'italic', name: 'Italic', syntax: '*italic*', glyph: 'I' },
  { kind: 'heading', name: 'Heading', syntax: '#, ##, ###', glyph: 'H' },
  { kind: 'bullet', name: 'Bullet list', syntax: '- item', glyph: '•' },
  { kind: 'task', name: 'Task list', syntax: '- [ ] task', glyph: '☑' },
  { kind: 'code', name: 'Inline code', syntax: '`code`', glyph: '`' },
  { kind: 'codeblock', name: 'Code block', syntax: '```', glyph: '```' },
  { kind: 'link', name: 'Link', syntax: '[text](url)', glyph: 'Link' },
];

export interface NoteProps {
  note: NoteItem;
  selected: boolean;
  editing: boolean;
  zoom: number;
  /** A pan or a drawing tool owns the pointer, so the note must not answer it. */
  locked: boolean;
  toWorld(event: { clientX: number; clientY: number }): Point;
  /**
   * The note was pressed, with or without shift. Returns whether it is
   * selected now, which is whether the press may go on to drag it.
   */
  onSelect(id: string, additive: boolean): boolean;
  /** The press was released without moving: a click, not a drag. */
  onClick(id: string, additive: boolean): void;
  onEdit(id: string): void;
  onEditEnd(): void;
  onMove(id: string, position: Point, gesture: string): void;
  onResize(id: string, rect: Rect, gesture: string): void;
  onText(id: string, text: string): void;
  /** Writes a format button's markdown into the note, as one undo step. */
  onFormat(id: string, text: string): void;
  onColor(id: string, color: NoteColor): void;
  /** Writes the note in a font of its own, or hands it back to the default with null. */
  onFont(id: string, font: FontName | null): void;
  /** Ticks or unticks the task at that position in the note's markdown. */
  onToggleTask(id: string, task: number): void;
  onDelete(id: string): void;
  /** Mints the id that folds a whole drag or resize into one undo step. */
  startGesture(kind: string): string;
}

interface Drag {
  pointerId: number;
  /** The corner being dragged, or null while the whole note is moving. */
  handle: ResizeHandle | null;
  origin: Point;
  start: Rect;
  gesture: string;
  moved: boolean;
  additive: boolean;
}

export function Note(props: NoteProps) {
  const { note, selected, editing, zoom, locked } = props;
  const element = useRef<HTMLDivElement | null>(null);
  const editor = useRef<HTMLTextAreaElement | null>(null);
  const drag = useRef<Drag | null>(null);
  /** Where a format button wants the user left once its text has rendered. */
  const restore = useRef<Selected | null>(null);
  const preview = useMemo(() => renderMarkdown(note.text), [note.text]);
  const [fontMenu, setFontMenu] = useState(false);

  // The bar goes away with the selection; the menu must not be found still open
  // the next time the note is picked.
  useEffect(() => {
    if (!selected) setFontMenu(false);
  }, [selected]);

  useEffect(() => {
    const field = editor.current;
    if (!editing || !field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, [editing]);

  // Rendering the formatted text back into the textarea sets `value`, which
  // drops the selection, so the caret is put back after that has happened.
  useLayoutEffect(() => {
    const field = editor.current;
    const wanted = restore.current;
    // Consumed whether or not it can be used: a caret is only ever wanted for
    // the render of the very edit that asked for it.
    restore.current = null;
    if (!field || !wanted) return;
    field.focus();
    field.setSelectionRange(wanted.start, wanted.end);
  }, [note.text]);

  function begin(event: PointerEvent, handle: ResizeHandle | null): void {
    // A pan, or a stroke being drawn over the note: leave it to the surface.
    if (locked || event.button !== 0) return;
    event.stopPropagation();
    if (!props.onSelect(note.id, event.shiftKey)) return;
    if (editing && !handle) return;
    // Pressing a checkbox or a link is a press, not the start of a drag.
    if (!handle && isInteractive(event.target)) return;
    drag.current = {
      pointerId: event.pointerId,
      handle,
      origin: props.toWorld(event),
      start: { x: note.x, y: note.y, width: note.width, height: note.height },
      gesture: props.startGesture(handle ? `resize:${note.id}` : `move:${note.id}`),
      moved: false,
      additive: event.shiftKey,
    };
    // jsdom has no pointer capture; a real browser needs it to survive a fast drag.
    element.current?.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const world = props.toWorld(event);
    const dx = world.x - active.origin.x;
    const dy = world.y - active.origin.y;
    // Nothing moves until the press has clearly become a drag.
    if (!active.moved && Math.hypot(dx, dy) * zoom < CLICK_SLOP_PX) return;
    active.moved = true;
    if (active.handle) {
      props.onResize(note.id, resizeRect(active.start, active.handle, dx, dy), active.gesture);
    } else {
      props.onMove(note.id, { x: active.start.x + dx, y: active.start.y + dy }, active.gesture);
    }
  }

  function endDrag(event: PointerEvent): void {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drag.current = null;
    // A cancelled pointer has already lost capture; releasing twice throws.
    if (element.current?.hasPointerCapture?.(event.pointerId)) {
      element.current.releasePointerCapture(event.pointerId);
    }
    if (!active.moved && !active.handle) props.onClick(note.id, active.additive);
  }

  /**
   * Types the pressed button's markdown into the editor. The bar swallows its
   * own pointer press, so the selection read here is still the user's; the
   * focus call covers a browser that focused the button anyway.
   */
  function format(kind: FormatKind): void {
    const field = editor.current;
    if (!field) return;
    const next = applyFormat(kind, {
      text: field.value,
      start: field.selectionStart,
      end: field.selectionEnd,
    });
    field.focus();
    if (next.text === field.value) {
      field.setSelectionRange(next.start, next.end);
      return;
    }
    restore.current = next;
    props.onFormat(note.id, next.text);
  }

  /** A checkbox in the preview is a view of the markdown, so the markdown moves. */
  function onPreviewClick(event: MouseEvent): void {
    const box = event.target;
    if (!(box instanceof HTMLInputElement) || box.type !== 'checkbox') return;
    event.preventDefault();
    event.stopPropagation();
    const task = Number(box.getAttribute(TASK_ATTRIBUTE));
    if (!Number.isInteger(task)) return;
    props.onToggleTask(note.id, task);
  }

  const handleSize = HANDLE_PX / zoom;

  return (
    <div
      ref={element}
      class={`note note--${note.color}${selected ? ' note--selected' : ''}${
        editing ? ' note--editing' : ''
      }`}
      data-testid="note"
      data-note-id={note.id}
      style={{
        left: `${note.x}px`,
        top: `${note.y}px`,
        width: `${note.width}px`,
        height: `${note.height}px`,
        outlineWidth: `${OUTLINE_PX / zoom}px`,
        // A note without a font of its own inherits the board's default.
        ...(note.font ? { fontFamily: fontStack(note.font) } : {}),
      }}
      onPointerDown={(event) => begin(event, null)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDblClick={(event) => {
        if (locked) return;
        event.stopPropagation();
        // Double-clicking a checkbox or a link is two presses, not a request to edit.
        if (isInteractive(event.target)) return;
        props.onEdit(note.id);
      }}
    >
      {editing ? (
        <textarea
          ref={editor}
          class="note__editor"
          aria-label="Note markdown"
          value={note.text}
          onInput={(event) => props.onText(note.id, event.currentTarget.value)}
          onPointerDown={(event) => event.stopPropagation()}
          onDblClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            props.onEditEnd();
          }}
          onBlur={() => props.onEditEnd()}
        />
      ) : note.text.trim().length === 0 ? (
        <div class="note__text note__empty">Double-click to write</div>
      ) : (
        <div
          class="note__text markdown"
          data-testid="note-preview"
          onClick={onPreviewClick}
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      )}

      {selected ? (
        <div
          class="note__chrome"
          // Sized and lifted in screen pixels: the scale cancels the board's zoom,
          // and sits outside the lift so the gap above the note stays constant.
          style={{ transform: `scale(${1 / zoom}) translateY(${-BAR_GAP_PX}px)` }}
          // Keeping the press off the textarea is what lets a colour be picked,
          // or a format applied, without dropping out of editing.
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseDown={(event) => event.preventDefault()}
          onDblClick={(event) => event.stopPropagation()}
        >
          {/* Formatting is only ever about the source, so it comes and goes
              with the editor, on its own bar rather than doubling the width of
              the one the note already had. */}
          {editing ? (
            <div class="note__bar" role="toolbar" aria-label="Formatting">
              {FORMATS.map((entry) => (
                <button
                  key={entry.kind}
                  type="button"
                  class={`note__tool note__format note__format--${entry.kind}`}
                  aria-label={entry.name}
                  title={`${entry.name} (${entry.syntax})`}
                  onClick={() => format(entry.kind)}
                >
                  {entry.glyph}
                </button>
              ))}
            </div>
          ) : null}

          <div class="note__bar" role="toolbar" aria-label="Note">
            <button
              type="button"
              class="note__tool note__flip"
              aria-label={editing ? 'Show the rendered note' : 'Edit the markdown'}
              title={editing ? 'Back to the rendered note (Esc)' : 'Edit the markdown'}
              onClick={() => (editing ? props.onEditEnd() : props.onEdit(note.id))}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
            <span class="note__separator" aria-hidden="true" />
            {NOTE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                class={`note__swatch note__swatch--${color}${
                  color === note.color ? ' note__swatch--current' : ''
                }`}
                data-color={color}
                aria-label={`Colour ${color}`}
                aria-pressed={color === note.color}
                title={`${color} (C cycles)`}
                onClick={() => props.onColor(note.id, color)}
              />
            ))}
            <span class="note__separator" aria-hidden="true" />
            <div class="note__fontpick">
              <button
                type="button"
                class={`note__tool note__fontbutton${fontMenu ? ' note__tool--on' : ''}`}
                aria-label="Font"
                aria-haspopup="menu"
                aria-expanded={fontMenu}
                title={note.font ? `Font: ${fontFor(note.font).label}` : 'Font (the default)'}
                onClick={() => setFontMenu((open) => !open)}
              >
                Aa
              </button>
              {fontMenu ? (
                <div class="note__menu" role="menu" aria-label="Note font" data-chrome="font">
                  <button
                    type="button"
                    role="menuitemradio"
                    class={`note__menuitem${note.font ? '' : ' note__menuitem--on'}`}
                    aria-checked={!note.font}
                    onClick={() => {
                      setFontMenu(false);
                      props.onFont(note.id, null);
                    }}
                  >
                    Default
                  </button>
                  {FONTS.map((font) => (
                    <button
                      key={font.name}
                      type="button"
                      role="menuitemradio"
                      class={`note__menuitem${note.font === font.name ? ' note__menuitem--on' : ''}`}
                      style={{ fontFamily: font.stack }}
                      aria-checked={note.font === font.name}
                      onClick={() => {
                        setFontMenu(false);
                        props.onFont(note.id, font.name);
                      }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <span class="note__separator" aria-hidden="true" />
            <button
              type="button"
              class="note__tool note__delete"
              aria-label="Delete note"
              title="Delete note (Delete)"
              onClick={() => props.onDelete(note.id)}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      {selected && !editing
        ? RESIZE_HANDLES.map((handle) => (
            <div
              key={handle}
              class={`note__handle note__handle--${handle}`}
              data-handle={handle}
              style={{
                width: `${handleSize}px`,
                height: `${handleSize}px`,
                margin: `${-handleSize / 2}px`,
              }}
              onPointerDown={(event) => begin(event, handle)}
            />
          ))
        : null}
    </div>
  );
}

/** Things inside a preview that answer a press themselves. */
function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest('input, a, button') !== null;
}
