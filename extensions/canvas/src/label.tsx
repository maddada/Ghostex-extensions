/**
 * A text label written straight onto the board: no paper, no border, just ink.
 *
 * Labels live in the HTML world layer next to notes, so their text scales with
 * the board and can be edited in place. Editing swaps the text for a textarea
 * that sits in the same grid cell as an invisible copy of the text, which is
 * what makes the box grow to fit as you type without measuring anything.
 */

import { useEffect, useRef } from 'preact/hooks';

import { LABEL_PX, type TextItem } from './board.js';
import { STROKE_HEX } from './drawing.js';

/** On-screen width of the outline round a selected label, at any zoom. */
const OUTLINE_PX = 2;

export interface LabelProps {
  item: TextItem;
  selected: boolean;
  editing: boolean;
  zoom: number;
  /** A pan or a drawing tool owns the pointer, so the label must not answer it. */
  locked: boolean;
  onEdit(id: string): void;
  onText(id: string, text: string): void;
  onEditEnd(): void;
}

export function Label({
  item,
  selected,
  editing,
  zoom,
  locked,
  onEdit,
  onText,
  onEditEnd,
}: LabelProps) {
  const editor = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const field = editor.current;
    if (!editing || !field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, [editing]);

  const style = {
    left: `${item.x}px`,
    top: `${item.y}px`,
    fontSize: `${LABEL_PX[item.size]}px`,
    color: STROKE_HEX[item.color],
  };

  if (editing) {
    return (
      <div class="label label--editing" data-testid="label" data-label-id={item.id} style={style}>
        <div class="label__grow" data-value={item.text}>
          <textarea
            ref={editor}
            class="label__editor"
            aria-label="Label text"
            value={item.text}
            onInput={(event) => onText(item.id, event.currentTarget.value)}
            onPointerDown={(event) => event.stopPropagation()}
            onDblClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return;
              event.stopPropagation();
              onEditEnd();
            }}
            onBlur={() => onEditEnd()}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      class={`label${selected ? ' label--selected' : ''}`}
      data-testid="label"
      data-label-id={item.id}
      style={{
        ...style,
        outlineWidth: `${OUTLINE_PX / zoom}px`,
        outlineOffset: `${OUTLINE_PX / zoom}px`,
      }}
      onDblClick={(event) => {
        if (locked) return;
        event.stopPropagation();
        onEdit(item.id);
      }}
    >
      {item.text}
    </div>
  );
}
