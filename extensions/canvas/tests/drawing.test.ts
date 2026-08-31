/**
 * The drawing maths: what a stroke or shape becomes on screen, and what the
 * eraser is judged to have touched. All of it is pure — points in, paths and
 * answers out — so it is tested straight rather than through the DOM.
 */

import { describe, expect, test } from 'vitest';

import {
  createLabel,
  createShape,
  createStroke,
  type InkPoint,
  type ShapeItem,
} from '../src/board.js';
import {
  STROKE_HEX,
  constrain,
  erasedAlong,
  hits,
  inkPath,
  normalize,
  shapePaths,
  simplifyStroke,
} from '../src/drawing.js';

const A = { x: 0, y: 0 };
const B = { x: 100, y: 60 };

function rect(seed = 7): ShapeItem {
  return createShape('rectangle', A, B, 'chalk', 'medium', 's1', seed);
}

describe('a freehand stroke', () => {
  test('becomes a closed filled outline, not a stroked line', () => {
    const path = inkPath(
      [
        [0, 0],
        [10, 12],
        [30, 8],
      ],
      'medium',
    );
    expect(path.startsWith('M ')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  test('is drawn even when it is a single dot', () => {
    expect(inkPath([[5, 5]], 'fine').length).toBeGreaterThan(0);
  });

  test('is nothing at all when it has no points', () => {
    expect(inkPath([], 'medium')).toBe('');
  });

  test('gets thicker with the chosen weight', () => {
    const points: InkPoint[] = [
      [0, 0],
      [40, 0],
    ];
    expect(inkPath(points, 'bold')).not.toBe(inkPath(points, 'fine'));
  });
});

describe('trimming a stroke before it is stored', () => {
  test('drops samples too close together to see', () => {
    const points: InkPoint[] = [
      [0, 0],
      [0.4, 0],
      [0.8, 0],
      [10, 0],
    ];
    expect(simplifyStroke(points, 2)).toEqual([
      [0, 0],
      [10, 0],
    ]);
  });

  test('always keeps the last sample, however close it fell', () => {
    const points: InkPoint[] = [
      [0, 0],
      [50, 0],
      [50.1, 0],
    ];
    expect(simplifyStroke(points, 2).at(-1)).toEqual([50.1, 0]);
  });

  test('rounds off decimals a board file should not be paying for', () => {
    expect(simplifyStroke([[1.234567, 2.987654]], 2)).toEqual([[1.23, 2.99]]);
  });

  test('leaves an empty stroke empty', () => {
    expect(simplifyStroke([], 2)).toEqual([]);
  });
});

describe('a hand-drawn shape', () => {
  test('sketches the same way every time it is drawn from its seed', () => {
    expect(shapePaths(rect())).toEqual(shapePaths(rect()));
  });

  test('sketches differently under a different seed', () => {
    expect(shapePaths(rect(7))).not.toEqual(shapePaths(rect(8)));
  });

  test('carries the chosen weight into the path', () => {
    const paths = shapePaths(createShape('rectangle', A, B, 'chalk', 'bold', 's1', 3));
    expect(paths[0]?.strokeWidth).toBe(10);
  });

  test('draws an ellipse, a line and an arrow as well as a rectangle', () => {
    for (const kind of ['rectangle', 'ellipse', 'line', 'arrow'] as const) {
      const paths = shapePaths(createShape(kind, A, B, 'chalk', 'medium', 's1', 5));
      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0]?.d.length).toBeGreaterThan(0);
    }
  });

  test('gives an arrow a head a plain line does not have', () => {
    const line = shapePaths(createShape('line', A, B, 'chalk', 'medium', 's1', 5));
    const arrow = shapePaths(createShape('arrow', A, B, 'chalk', 'medium', 's1', 5));
    expect(arrow.length).toBeGreaterThan(line.length);
  });

  test('leaves the head off an arrow with no length to put one on', () => {
    const stub = shapePaths(createShape('arrow', A, A, 'chalk', 'medium', 's1', 5));
    expect(stub.length).toBe(1);
  });
});

describe('holding shift while drawing', () => {
  test('squares a rectangle off the longer side', () => {
    expect(constrain('rectangle', { x: 0, y: 0 }, { x: 100, y: 30 })).toEqual({ x: 100, y: 100 });
  });

  test('squares backwards drags too', () => {
    expect(constrain('ellipse', { x: 0, y: 0 }, { x: -20, y: -80 })).toEqual({ x: -80, y: -80 });
  });

  test('snaps a line to the nearest fifteen degrees', () => {
    const snapped = constrain('line', { x: 0, y: 0 }, { x: 100, y: 4 });
    expect(snapped.y).toBeCloseTo(0, 6);
    expect(snapped.x).toBeCloseTo(Math.hypot(100, 4), 6);
  });

  test('leaves a drag that has not moved where it is', () => {
    expect(constrain('arrow', { x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 5, y: 5 });
  });
});

describe('the rectangle two dragged corners make', () => {
  test('reads the same whichever way the drag went', () => {
    expect(normalize({ x: 10, y: 40 }, { x: 60, y: 10 })).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 30,
    });
  });
});

describe('what the eraser touches', () => {
  const stroke = createStroke(
    [
      [0, 0],
      [100, 0],
    ],
    'chalk',
    'medium',
    'k1',
  );

  test('takes a stroke it passes over', () => {
    expect(hits(stroke, { x: 50, y: 2 }, 4)).toBe(true);
  });

  test('leaves a stroke it passes wide of', () => {
    expect(hits(stroke, { x: 50, y: 80 }, 4)).toBe(false);
  });

  test('takes a rectangle by its edge, not by the space inside it', () => {
    const shape = createShape('rectangle', A, B, 'chalk', 'fine', 's1', 1);
    expect(hits(shape, { x: 50, y: 0 }, 3)).toBe(true);
    expect(hits(shape, { x: 50, y: 30 }, 3)).toBe(false);
  });

  test('takes an ellipse by its outline', () => {
    const shape = createShape('ellipse', A, B, 'chalk', 'fine', 's1', 1);
    expect(hits(shape, { x: 0, y: 30 }, 3)).toBe(true);
    expect(hits(shape, { x: 50, y: 30 }, 3)).toBe(false);
  });

  test('takes a label anywhere on its text', () => {
    const label = { ...createLabel({ x: 0, y: 0 }, 'chalk', 'medium', 'l1'), text: 'hello' };
    expect(hits(label, { x: 10, y: label.y + 10 }, 2)).toBe(true);
    expect(hits(label, { x: 10, y: label.y + 400 }, 2)).toBe(false);
  });

  test('catches what a fast sweep jumped straight over', () => {
    const swept = erasedAlong([stroke], { x: 50, y: -200 }, { x: 50, y: 200 }, 4);
    expect(swept).toEqual(['k1']);
  });

  test('names nothing when the sweep missed', () => {
    expect(erasedAlong([stroke], { x: 400, y: 400 }, { x: 500, y: 500 }, 4)).toEqual([]);
  });

  test('names each item it swept over only once', () => {
    const swept = erasedAlong([stroke], { x: 0, y: 0 }, { x: 100, y: 0 }, 4);
    expect(swept).toEqual(['k1']);
  });
});

describe('the ink palette', () => {
  test('gives every colour name a value SVG can paint', () => {
    for (const value of Object.values(STROKE_HEX)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
