/**
 * The ink layer: every freehand stroke and hand-drawn shape on the board, plus
 * the one being drawn right now.
 *
 * It is an SVG sitting inside the transformed world layer, so its coordinates
 * are plain world units and it pans and zooms with everything else. It never
 * takes a pointer: the surface owns drawing and erasing, and hit testing is
 * done against the document in `drawing.ts`, not against these elements. That
 * is what lets ink be drawn over a note without swallowing clicks on it.
 *
 * Each item is its own component so that the path maths is memoised per item:
 * a pan re-renders the whole board, and regenerating every rough.js sketch on
 * every wheel event would make panning crawl.
 */

import { useMemo } from 'preact/hooks';

import { itemBounds, type BoardItem, type ShapeItem, type StrokeItem } from './board.js';
import { STROKE_HEX, inkPath, shapePaths } from './drawing.js';

/** The stroke or shape under the pointer: on screen, not yet on the board. */
export type Draft = StrokeItem | ShapeItem;

/** How far the box round a selected drawing sits outside it, on screen. */
const SELECTION_PAD_PX = 4;
const SELECTION_STROKE_PX = 1.5;

export interface InkProps {
  items: readonly BoardItem[];
  draft: Draft | null;
  /** Which of the items to draw a selection box round. */
  selection: readonly string[];
  /** Selection boxes are sized on screen, so they need to know the zoom. */
  zoom: number;
}

export function Ink({ items, draft, selection, zoom }: InkProps) {
  return (
    <svg class="canvas__ink" aria-hidden="true" width="1" height="1">
      {items.map((item) =>
        item.type === 'stroke' ? (
          <Stroke key={item.id} item={item} />
        ) : item.type === 'shape' ? (
          <Shape key={item.id} item={item} />
        ) : null,
      )}
      {draft?.type === 'stroke' ? <Stroke item={draft} /> : null}
      {draft?.type === 'shape' ? <Shape item={draft} /> : null}
      {items.map((item) =>
        (item.type === 'stroke' || item.type === 'shape') && selection.includes(item.id) ? (
          <SelectionBox key={`selected:${item.id}`} item={item} zoom={zoom} />
        ) : null,
      )}
    </svg>
  );
}

/** The box round one selected stroke or shape, padded and stroked in screen pixels. */
function SelectionBox({ item, zoom }: { item: StrokeItem | ShapeItem; zoom: number }) {
  const bounds = itemBounds(item);
  const pad = SELECTION_PAD_PX / zoom;
  return (
    <rect
      class="ink__selection"
      x={bounds.x - pad}
      y={bounds.y - pad}
      width={bounds.width + pad * 2}
      height={bounds.height + pad * 2}
      rx={pad / 2}
      stroke-width={SELECTION_STROKE_PX / zoom}
    />
  );
}

function Stroke({ item }: { item: StrokeItem }) {
  const d = useMemo(() => inkPath(item.points, item.size), [item.points, item.size]);
  return <path class="ink__stroke" d={d} fill={STROKE_HEX[item.color]} />;
}

function Shape({ item }: { item: ShapeItem }) {
  const paths = useMemo(() => shapePaths(item), [item]);
  const stroke = STROKE_HEX[item.color];
  return (
    <g class="ink__shape">
      {paths.map((path, index) => (
        // Paths of one sketch have no identity of their own; their order is it.
        <path key={index} d={path.d} stroke={stroke} stroke-width={path.strokeWidth} fill="none" />
      ))}
    </g>
  );
}
