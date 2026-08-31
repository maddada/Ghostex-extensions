/**
 * The tool bar at the top of the board: what the pointer does, and what it
 * draws with.
 *
 * The stroke row only appears for tools that put ink down, so the bar stays
 * out of the way while you are moving notes around.
 */

import {
  STROKE_COLORS,
  STROKE_PX,
  STROKE_WIDTHS,
  SHAPE_KINDS,
  type ShapeKind,
  type StrokeColor,
  type StrokeWidth,
} from './board.js';
import { STROKE_HEX } from './drawing.js';

/**
 * The tools, with the keys that pick them: Excalidraw's letters and digits,
 * so muscle memory from there carries over (3 and 9 are its diamond and
 * image, which the canvas does not have).
 */
export const TOOLS = [
  { name: 'select', label: 'Select', keys: ['V', '1'] },
  { name: 'pen', label: 'Pen', keys: ['P', '7'] },
  { name: 'rectangle', label: 'Rect', keys: ['R', '2'] },
  { name: 'ellipse', label: 'Ellipse', keys: ['O', '4'] },
  { name: 'line', label: 'Line', keys: ['L', '6'] },
  { name: 'arrow', label: 'Arrow', keys: ['A', '5'] },
  { name: 'text', label: 'Text', keys: ['T', '8'] },
  { name: 'eraser', label: 'Eraser', keys: ['E', '0'] },
] as const;

export type ToolName = (typeof TOOLS)[number]['name'];
export const DEFAULT_TOOL: ToolName = 'select';

/** The four tools that are also shapes, which is every shape there is. */
export function isShapeTool(tool: ToolName): tool is ShapeKind {
  return (SHAPE_KINDS as readonly string[]).includes(tool);
}

/** Tools that put ink down, and so care which ink. */
export function usesStroke(tool: ToolName): boolean {
  return tool === 'pen' || tool === 'text' || isShapeTool(tool);
}

/** Tools that own the pointer, so notes and labels stop answering it. */
export function isDrawingTool(tool: ToolName): boolean {
  return tool !== 'select';
}

export interface ToolbarProps {
  tool: ToolName;
  color: StrokeColor;
  size: StrokeWidth;
  onTool(tool: ToolName): void;
  onColor(color: StrokeColor): void;
  onSize(size: StrokeWidth): void;
  onAddNote(): void;
}

export function Toolbar(props: ToolbarProps) {
  const { tool, color, size } = props;

  return (
    <div class="tools" onPointerDown={(event) => event.stopPropagation()}>
      <div class="toolbar" role="toolbar" aria-label="Tools">
        {TOOLS.map((entry) => (
          <button
            key={entry.name}
            type="button"
            class={`toolbar__button${tool === entry.name ? ' toolbar__button--on' : ''}`}
            aria-label={entry.label}
            aria-pressed={tool === entry.name}
            title={`${entry.label} (${entry.keys.join(' or ')})`}
            onClick={() => props.onTool(entry.name)}
          >
            {entry.label}
          </button>
        ))}
        <span class="toolbar__separator" aria-hidden="true" />
        <button
          type="button"
          class="toolbar__button"
          aria-label="Add note"
          onClick={props.onAddNote}
        >
          Note
        </button>
      </div>

      {usesStroke(tool) ? (
        <div class="toolbar toolbar--style" role="toolbar" aria-label="Stroke">
          {STROKE_COLORS.map((entry) => (
            <button
              key={entry}
              type="button"
              class={`toolbar__swatch${entry === color ? ' toolbar__swatch--on' : ''}`}
              style={{ background: STROKE_HEX[entry] }}
              aria-label={`Ink ${entry}`}
              aria-pressed={entry === color}
              onClick={() => props.onColor(entry)}
            />
          ))}
          <span class="toolbar__separator" aria-hidden="true" />
          {STROKE_WIDTHS.map((entry) => (
            <button
              key={entry}
              type="button"
              class={`toolbar__width${entry === size ? ' toolbar__width--on' : ''}`}
              aria-label={`${entry} stroke`}
              aria-pressed={entry === size}
              onClick={() => props.onSize(entry)}
            >
              <span
                class="toolbar__dot"
                style={{ width: `${STROKE_PX[entry]}px`, height: `${STROKE_PX[entry]}px` }}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
