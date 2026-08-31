import { describe, expect, test } from 'vitest';

import {
  DEFAULT_VIEWPORT,
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  fitToBounds,
  gridStep,
  panBy,
  resetZoomAt,
  surfaceToWorld,
  worldToSurface,
  wrap,
  zoomAt,
  zoomByWheel,
  zoomInAt,
  zoomOutAt,
  zoomPercent,
  type Viewport,
} from '../src/viewport.js';

const shifted: Viewport = { x: 120, y: -40, zoom: 1.75 };

describe('coordinate mapping', () => {
  test('surface and world coordinates round-trip', () => {
    const world = surfaceToWorld(shifted, { x: 300, y: 210 });
    expect(worldToSurface(shifted, world)).toEqual({ x: 300, y: 210 });
  });

  test('panning moves the board by a surface delta and leaves zoom alone', () => {
    expect(panBy(shifted, 25, -10)).toEqual({ x: 145, y: -50, zoom: 1.75 });
  });
});

describe('zooming', () => {
  test('keeps the world point under the cursor pinned', () => {
    const anchor = { x: 412, y: 233 };
    const before = surfaceToWorld(shifted, anchor);
    const after = surfaceToWorld(zoomAt(shifted, anchor, 3.2), anchor);
    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
  });

  test('clamps to the supported range', () => {
    expect(clampZoom(100)).toBe(MAX_ZOOM);
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(DEFAULT_VIEWPORT.zoom);
    expect(zoomAt(DEFAULT_VIEWPORT, { x: 0, y: 0 }, 999).zoom).toBe(MAX_ZOOM);
  });

  test('returns the same viewport when the zoom does not change', () => {
    expect(zoomAt(shifted, { x: 10, y: 10 }, shifted.zoom)).toBe(shifted);
  });

  test('a wheel or pinch scrolling up zooms in, scrolling down zooms out', () => {
    const anchor = { x: 50, y: 50 };
    expect(zoomByWheel(DEFAULT_VIEWPORT, anchor, -100).zoom).toBeGreaterThan(1);
    expect(zoomByWheel(DEFAULT_VIEWPORT, anchor, 100).zoom).toBeLessThan(1);
  });

  test('one mouse-wheel notch is worth about one zoom step, not a leap', () => {
    const anchor = { x: 50, y: 50 };
    const notch = zoomByWheel(DEFAULT_VIEWPORT, anchor, -120).zoom;
    expect(zoomPercent(notch)).toBe(zoomPercent(zoomInAt(DEFAULT_VIEWPORT, anchor).zoom));
    expect(zoomPercent(zoomByWheel(DEFAULT_VIEWPORT, anchor, 120).zoom)).toBe(
      zoomPercent(zoomOutAt(DEFAULT_VIEWPORT, anchor).zoom),
    );
  });

  test('a trackpad pinch moves in much finer increments than a notch', () => {
    const anchor = { x: 50, y: 50 };
    const pinch = zoomByWheel(DEFAULT_VIEWPORT, anchor, -3).zoom;
    const notch = zoomByWheel(DEFAULT_VIEWPORT, anchor, -120).zoom;
    expect(pinch).toBeGreaterThan(1);
    expect(pinch).toBeLessThan(notch);
  });

  test('the step buttons move in opposite directions and reset lands on 100%', () => {
    const anchor = { x: 200, y: 100 };
    expect(zoomInAt(shifted, anchor).zoom).toBeGreaterThan(shifted.zoom);
    expect(zoomOutAt(shifted, anchor).zoom).toBeLessThan(shifted.zoom);
    expect(resetZoomAt(shifted, anchor).zoom).toBe(1);
    expect(zoomPercent(resetZoomAt(shifted, anchor).zoom)).toBe(100);
  });
});

describe('zoom to fit', () => {
  test('an empty board returns to the default viewport', () => {
    expect(fitToBounds(null, { width: 900, height: 600 })).toEqual(DEFAULT_VIEWPORT);
  });

  test('a surface with no size cannot frame anything', () => {
    const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    expect(fitToBounds(bounds, { width: 0, height: 0 })).toEqual(DEFAULT_VIEWPORT);
  });

  test('centres the content and zooms it to fit inside the padding', () => {
    const size = { width: 1000, height: 800 };
    const bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 };
    const viewport = fitToBounds(bounds, size, 50);

    expect(worldToSurface(viewport, { x: 0, y: 0 })).toEqual({ x: 500, y: 400 });
    const topLeft = worldToSurface(viewport, { x: bounds.minX, y: bounds.minY });
    const bottomRight = worldToSurface(viewport, { x: bounds.maxX, y: bounds.maxY });
    expect(topLeft.x).toBeGreaterThanOrEqual(50);
    expect(topLeft.y).toBeGreaterThanOrEqual(50);
    expect(bottomRight.x).toBeLessThanOrEqual(size.width - 50);
    expect(bottomRight.y).toBeLessThanOrEqual(size.height - 50);
  });
});

describe('grid', () => {
  test('stays readable across the whole zoom range', () => {
    for (const zoom of [MIN_ZOOM, 0.25, 0.5, 1, 2, 4, MAX_ZOOM]) {
      const step = gridStep(zoom);
      expect(step).toBeGreaterThanOrEqual(12);
      expect(step).toBeLessThanOrEqual(96);
    }
  });

  test('wraps a negative pan onto a positive phase offset', () => {
    expect(wrap(-5, 24)).toBe(19);
    expect(wrap(30, 24)).toBe(6);
  });
});
