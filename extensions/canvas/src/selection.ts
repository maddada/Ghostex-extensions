/**
 * Which items a Select click or a marquee lands on.
 *
 * Pure geometry over the board document, like the eraser in `drawing.ts`: the
 * ink layer never takes a pointer, so a click on a stroke or shape is answered
 * by asking the document what is under it. Notes and labels are HTML and are
 * found by the DOM instead, but a marquee measures every item the same way.
 */

import { isDrawn, itemBounds, type BoardItem, type DrawnItem, type Rect } from './board.js';
import { hits } from './drawing.js';
import type { Point } from './viewport.js';

/**
 * The topmost stroke, shape or label under a point, or null. Items are drawn
 * in board order, so the last one that answers is the one on top.
 */
export function drawnItemAt(
  items: readonly BoardItem[],
  point: Point,
  tolerance: number,
): DrawnItem | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item && isDrawn(item) && hits(item, point, tolerance)) return item;
  }
  return null;
}

/**
 * The ids of every item that sits wholly inside a box, in board order. Like
 * Excalidraw, a marquee takes what it surrounds, not what it merely crosses.
 */
export function itemsInside(items: readonly BoardItem[], box: Rect): string[] {
  if (box.width <= 0 || box.height <= 0) return [];
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  return items
    .filter((item) => {
      const bounds = itemBounds(item);
      return (
        bounds.x >= box.x &&
        bounds.y >= box.y &&
        bounds.x + bounds.width <= right &&
        bounds.y + bounds.height <= bottom
      );
    })
    .map((item) => item.id);
}
