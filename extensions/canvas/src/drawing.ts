/**
 * How ink, shapes and labels are drawn and hit.
 *
 * Everything here is pure geometry over the board document: points in, path
 * strings and hit answers out. perfect-freehand turns a run of pointer samples
 * into a filled outline; rough.js turns two corners into a hand-drawn sketch.
 * Neither library is asked twice for the same item — `ink.tsx` memoises these
 * calls, because a pan re-renders every shape on the board.
 */

import rough from 'roughjs';
import { getStroke } from 'perfect-freehand';

import {
  STROKE_PX,
  labelBounds,
  type DrawnItem,
  type InkPoint,
  type ShapeItem,
  type ShapeKind,
  type StrokeColor,
  type StrokeWidth,
} from './board.js';
import type { Point } from './viewport.js';

/**
 * What each ink name looks like. Bright enough to read on the canvas's near
 * black, and deliberately not the note papers: paper is written on, ink is
 * drawn with.
 */
export const STROKE_HEX: Record<StrokeColor, string> = {
  chalk: '#e8e8ec',
  coral: '#f87171',
  amber: '#fbbf24',
  sage: '#4ade80',
  azure: '#60a5fa',
  violet: '#c084fc',
};

/**
 * perfect-freehand's shape of a live line. `simulatePressure` reads velocity,
 * so a trackpad and a mouse get the same taper a stylus would give.
 */
const INK_OPTIONS = {
  thinning: 0.6,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
  last: true,
} as const;

/**
 * How sketchy rough.js draws. Corners are deliberately left free to overshoot
 * — that overshoot is the whole Excalidraw look; pinning the vertices draws a
 * tidy box instead of a sketched one.
 */
const ROUGHNESS = 1.1;

/** An arrowhead is a fraction of the shaft, up to this many world units. */
const ARROWHEAD_MAX = 36;
const ARROWHEAD_SHARE = 0.32;
/** How far an arrowhead's wings open from the shaft, in radians. */
const ARROWHEAD_SPREAD = Math.PI / 7;

/** Shift snaps a line or arrow to this many degrees. */
const ANGLE_SNAP_DEGREES = 15;

/** How finely an ellipse is sampled when the eraser asks what it touched. */
const ELLIPSE_SAMPLES = 48;

/** Coordinates in a path string; more decimals than this is noise. */
const PATH_DECIMALS = 2;

const generator = rough.generator();

/** One stroked path of a rough.js sketch, ready to become an SVG `<path>`. */
export interface SketchPath {
  d: string;
  strokeWidth: number;
}

/**
 * The filled outline of a freehand stroke, as an SVG path. Ink is a shape, not
 * a stroked line: that is what lets it taper.
 */
export function inkPath(points: InkPoint[], size: StrokeWidth): string {
  if (points.length === 0) return '';
  const outline = getStroke(points, { size: STROKE_PX[size], ...INK_OPTIONS });
  return outlinePath(outline);
}

/** The hand-drawn sketch of a shape: one or more paths to stroke. */
export function shapePaths(item: ShapeItem): SketchPath[] {
  const options = {
    seed: item.seed,
    roughness: ROUGHNESS,
    strokeWidth: STROKE_PX[item.size],
  };
  const { a, b } = item;

  switch (item.shape) {
    case 'rectangle': {
      const rect = normalize(a, b);
      return toPaths([generator.rectangle(rect.x, rect.y, rect.width, rect.height, options)]);
    }
    case 'ellipse': {
      const rect = normalize(a, b);
      return toPaths([
        generator.ellipse(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
          rect.width,
          rect.height,
          options,
        ),
      ]);
    }
    case 'line':
      return toPaths([generator.line(a.x, a.y, b.x, b.y, options)]);
    case 'arrow': {
      const shaft = generator.line(a.x, a.y, b.x, b.y, options);
      const wings = arrowhead(a, b);
      if (!wings) return toPaths([shaft]);
      return toPaths([shaft, generator.linearPath(wings, options)]);
    }
  }
}

/**
 * Where an arrow's head goes, as the three points its wings run through, or
 * null when the arrow is too short to carry one.
 */
function arrowhead(a: Point, b: Point): [number, number][] | null {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length < 1) return null;
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const reach = Math.min(ARROWHEAD_MAX, length * ARROWHEAD_SHARE);
  const wing = (spread: number): [number, number] => [
    b.x - reach * Math.cos(angle + spread),
    b.y - reach * Math.sin(angle + spread),
  ];
  return [wing(ARROWHEAD_SPREAD), [b.x, b.y], wing(-ARROWHEAD_SPREAD)];
}

/**
 * Holding shift while drawing: a rectangle becomes a square and an ellipse a
 * circle, and a line or arrow snaps to the nearest 15°. Returns where the far
 * end of the drag should really be.
 */
export function constrain(kind: ShapeKind, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (kind === 'rectangle' || kind === 'ellipse') {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: a.x + Math.sign(dx || 1) * side, y: a.y + Math.sign(dy || 1) * side };
  }
  const length = Math.hypot(dx, dy);
  if (length === 0) return { ...b };
  const step = (ANGLE_SNAP_DEGREES * Math.PI) / 180;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: a.x + length * Math.cos(angle), y: a.y + length * Math.sin(angle) };
}

/**
 * Drops samples the user cannot see before a stroke is stored, and rounds what
 * is left: a board file is rewritten on every save, so ink pays for its length.
 * The last sample always survives, or the stroke would end short of the pointer.
 */
export function simplifyStroke(points: readonly InkPoint[], minDistance: number): InkPoint[] {
  const kept: InkPoint[] = [];
  for (const [index, point] of points.entries()) {
    const last = kept.at(-1);
    const isLast = index === points.length - 1;
    if (last && !isLast && Math.hypot(point[0] - last[0], point[1] - last[1]) < minDistance) {
      continue;
    }
    kept.push([round(point[0]), round(point[1])]);
  }
  return kept;
}

/**
 * Which drawn items an eraser swept over between two pointer positions.
 *
 * A fast sweep jumps a long way between pointer events, so the segment is
 * sampled rather than tested at its ends: brushing past a line still erases it.
 */
export function erasedAlong(
  items: readonly DrawnItem[],
  from: Point,
  to: Point,
  tolerance: number,
): string[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.min(MAX_ERASER_SAMPLES, Math.max(1, Math.ceil(distance / tolerance)));
  const hit: string[] = [];
  for (const item of items) {
    for (let step = 0; step <= steps; step += 1) {
      const at = {
        x: from.x + ((to.x - from.x) * step) / steps,
        y: from.y + ((to.y - from.y) * step) / steps,
      };
      if (hits(item, at, tolerance)) {
        hit.push(item.id);
        break;
      }
    }
  }
  return hit;
}

/** Enough to cover any real sweep without walking a huge jump pixel by pixel. */
const MAX_ERASER_SAMPLES = 64;

/** Whether a point lands on an item, allowing for how thick it is drawn. */
export function hits(item: DrawnItem, point: Point, tolerance: number): boolean {
  if (item.type === 'text') {
    const box = labelBounds(item);
    return (
      point.x >= box.x - tolerance &&
      point.x <= box.x + box.width + tolerance &&
      point.y >= box.y - tolerance &&
      point.y <= box.y + box.height + tolerance
    );
  }
  const reach = tolerance + STROKE_PX[item.size] / 2;
  if (item.type === 'stroke') {
    return nearPolyline(
      item.points.map(([x, y]) => ({ x, y })),
      point,
      reach,
    );
  }
  return outlineOf(item).some((line) => nearPolyline(line, point, reach));
}

/** A shape as the polylines it is drawn along, for hit testing only. */
function outlineOf(item: ShapeItem): Point[][] {
  const { a, b } = item;
  if (item.shape === 'line' || item.shape === 'arrow') return [[a, b]];
  const rect = normalize(a, b);
  if (item.shape === 'rectangle') {
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;
    return [
      [
        { x: rect.x, y: rect.y },
        { x: right, y: rect.y },
        { x: right, y: bottom },
        { x: rect.x, y: bottom },
        { x: rect.x, y: rect.y },
      ],
    ];
  }
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const points: Point[] = [];
  for (let step = 0; step <= ELLIPSE_SAMPLES; step += 1) {
    const angle = (step / ELLIPSE_SAMPLES) * Math.PI * 2;
    points.push({
      x: cx + (rect.width / 2) * Math.cos(angle),
      y: cy + (rect.height / 2) * Math.sin(angle),
    });
  }
  return [points];
}

function nearPolyline(points: readonly Point[], point: Point, reach: number): boolean {
  const first = points[0];
  if (!first) return false;
  if (points.length === 1) return Math.hypot(point.x - first.x, point.y - first.y) <= reach;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (start && end && distanceToSegment(point, start, end) <= reach) return true;
  }
  return false;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const along = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );
  return Math.hypot(point.x - (start.x + along * dx), point.y - (start.y + along * dy));
}

/** The two dragged points as a rectangle with the corners the right way round. */
export function normalize(a: Point, b: Point): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

function toPaths(drawables: ReturnType<typeof generator.line>[]): SketchPath[] {
  const paths: SketchPath[] = [];
  for (const drawable of drawables) {
    for (const path of generator.toPaths(drawable)) {
      paths.push({ d: path.d, strokeWidth: path.strokeWidth });
    }
  }
  return paths;
}

/**
 * perfect-freehand hands back the polygon around a stroke; this closes it with
 * quadratic curves through the midpoints, which is what makes ink look inked
 * rather than faceted.
 */
function outlinePath(outline: readonly number[][]): string {
  const first = outline[0];
  if (!first || first[0] === undefined || first[1] === undefined) return '';
  const parts: string[] = [`M ${round(first[0])} ${round(first[1])} Q`];
  for (const [index, point] of outline.entries()) {
    const next = outline[(index + 1) % outline.length];
    const x = point[0];
    const y = point[1];
    if (x === undefined || y === undefined || !next) continue;
    const nx = next[0];
    const ny = next[1];
    if (nx === undefined || ny === undefined) continue;
    parts.push(`${round(x)} ${round(y)} ${round((x + nx) / 2)} ${round((y + ny) / 2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function round(value: number): number {
  const factor = 10 ** PATH_DECIMALS;
  return Math.round(value * factor) / factor;
}
