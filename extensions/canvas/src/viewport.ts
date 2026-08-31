/**
 * Pan and zoom maths for the infinite canvas.
 *
 * A viewport maps world coordinates to surface coordinates as
 * `surface = world * zoom + offset`, which is exactly the CSS transform
 * `translate(x, y) scale(zoom)` applied to the world layer.
 */

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const DEFAULT_VIEWPORT: Viewport = Object.freeze({ x: 0, y: 0, zoom: 1 });

/** Steps the +/- buttons and the keyboard zoom shortcuts move by. */
const ZOOM_STEP = 1.1;
/** How hard a ctrl/cmd-wheel or pinch gesture bites. */
const WHEEL_ZOOM_SENSITIVITY = 0.01;
/**
 * A trackpad pinch arrives as a stream of small deltas, but one mouse-wheel
 * notch arrives as a single delta of 100 or more. Capping the delta at exactly
 * one zoom step keeps a notch matching the toolbar button instead of tripling
 * the zoom in one go.
 */
const MAX_WHEEL_ZOOM_DELTA = Math.log(ZOOM_STEP) / WHEEL_ZOOM_SENSITIVITY;

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_VIEWPORT.zoom;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function surfaceToWorld(viewport: Viewport, point: Point): Point {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
}

export function worldToSurface(viewport: Viewport, point: Point): Point {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  };
}

/** Moves the board by a surface-space delta, as a drag or a scroll does. */
export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy };
}

/** Zooms so the world point under `anchor` stays under `anchor`. */
export function zoomAt(viewport: Viewport, anchor: Point, zoom: number): Viewport {
  const nextZoom = clampZoom(zoom);
  if (nextZoom === viewport.zoom) return viewport;
  const world = surfaceToWorld(viewport, anchor);
  return {
    x: anchor.x - world.x * nextZoom,
    y: anchor.y - world.y * nextZoom,
    zoom: nextZoom,
  };
}

export function zoomByFactor(viewport: Viewport, anchor: Point, factor: number): Viewport {
  return zoomAt(viewport, anchor, viewport.zoom * factor);
}

export function zoomInAt(viewport: Viewport, anchor: Point): Viewport {
  return zoomByFactor(viewport, anchor, ZOOM_STEP);
}

export function zoomOutAt(viewport: Viewport, anchor: Point): Viewport {
  return zoomByFactor(viewport, anchor, 1 / ZOOM_STEP);
}

/** Trackpad pinch and ctrl/cmd-wheel both arrive as a wheel delta. */
export function zoomByWheel(viewport: Viewport, anchor: Point, deltaY: number): Viewport {
  const delta = Math.max(-MAX_WHEEL_ZOOM_DELTA, Math.min(MAX_WHEEL_ZOOM_DELTA, deltaY));
  return zoomByFactor(viewport, anchor, Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY));
}

export function resetZoomAt(viewport: Viewport, anchor: Point): Viewport {
  return zoomAt(viewport, anchor, 1);
}

/**
 * Frames `bounds` inside a surface of `size`. An empty board has nothing to
 * frame, so it returns to the default viewport instead of guessing.
 */
export function fitToBounds(bounds: Bounds | null, size: Size, padding = 64): Viewport {
  if (!bounds || size.width <= 0 || size.height <= 0) return { ...DEFAULT_VIEWPORT };
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const usableWidth = Math.max(size.width - padding * 2, 1);
  const usableHeight = Math.max(size.height - padding * 2, 1);
  const zoom = clampZoom(Math.min(usableWidth / contentWidth, usableHeight / contentHeight));
  return {
    x: size.width / 2 - ((bounds.minX + bounds.maxX) / 2) * zoom,
    y: size.height / 2 - ((bounds.minY + bounds.maxY) / 2) * zoom,
    zoom,
  };
}

export function zoomPercent(zoom: number): number {
  return Math.round(zoom * 100);
}

export function sameViewport(a: Viewport, b: Viewport): boolean {
  return a.x === b.x && a.y === b.y && a.zoom === b.zoom;
}

/** Base spacing of the background grid in world units. */
const GRID_WORLD_STEP = 24;
const GRID_MIN_PX = 12;
const GRID_MAX_PX = 96;

/**
 * Screen spacing of the background grid, doubled or halved so the dots stay
 * readable instead of turning into mush at low zoom or a desert at high zoom.
 */
export function gridStep(zoom: number): number {
  let step = GRID_WORLD_STEP * clampZoom(zoom);
  while (step < GRID_MIN_PX) step *= 2;
  while (step > GRID_MAX_PX) step /= 2;
  return step;
}

/** Positive modulo, so a negative pan still lands the grid on a phase offset. */
export function wrap(value: number, step: number): number {
  return ((value % step) + step) % step;
}
