/**
 * Converting a board drawn with the engine that came before Excalidraw.
 *
 * These boards are real: they are on disk in people's host stores, written by
 * Canvas 0.1, and this conversion is the only thing standing between them and
 * an empty canvas. So every item type the old engine could put on a board has
 * a test here saying what it becomes.
 */

import { describe, expect, test } from 'vitest';

import { migrateLegacyBoard, migrateViewport } from '../src/migrate.js';

/** A board as the old engine stored it, holding whatever it is given. */
function legacy(...items: Record<string, unknown>[]) {
  return { schemaVersion: 5, id: 'default', viewport: { x: 0, y: 0, zoom: 1 }, items };
}

function convert(...items: Record<string, unknown>[]) {
  return migrateLegacyBoard(legacy(...items))?.elements ?? [];
}

describe('a sticky note', () => {
  const note = {
    id: 'n1',
    type: 'note',
    x: -300,
    y: -200,
    width: 208,
    height: 160,
    text: '# Plan\n\n- [ ] ship it',
    color: 'mint',
  };

  test('becomes a filled rectangle with its writing bound inside it', () => {
    const [paper, writing] = convert(note) as Record<string, unknown>[];

    expect(paper).toMatchObject({
      id: 'n1',
      type: 'rectangle',
      x: -300,
      y: -200,
      width: 208,
      height: 160,
      fillStyle: 'solid',
      boundElements: [{ type: 'text', id: 'n1-text' }],
    });
    expect(writing).toMatchObject({ id: 'n1-text', type: 'text', containerId: 'n1' });
  });

  test('keeps its paper colour, at the nearest fill Excalidraw has', () => {
    const paper = (colour: string) => convert({ ...note, color: colour })[0]?.['backgroundColor'];

    expect(paper('mint')).toBe('#b2f2bb');
    expect(paper('rose')).toBe('#ffc9c9');
    expect(paper('sky')).toBe('#a5d8ff');
    // A colour the old palette never had falls back rather than dropping the note.
    expect(paper('chartreuse')).toBe('#ffec99');
  });

  test('keeps every character of its markdown, as the text it was written in', () => {
    const [, writing] = convert(note) as Record<string, unknown>[];

    expect(writing?.['text']).toBe('# Plan\n\n- [ ] ship it');
    expect(writing?.['originalText']).toBe('# Plan\n\n- [ ] ship it');
  });

  test('a note with nothing written on it still becomes a note', () => {
    const [paper, writing] = convert({ id: 'n2', type: 'note' }) as Record<string, unknown>[];

    expect(paper).toMatchObject({ type: 'rectangle' });
    expect(writing).toMatchObject({ type: 'text', text: '' });
  });
});

describe('freehand ink', () => {
  const stroke = {
    id: 'k1',
    type: 'stroke',
    points: [
      [10, 10],
      [50, 40],
      [100, 20],
    ],
    color: 'coral',
    size: 'bold',
  };

  test('becomes a freedraw element, its samples kept in order', () => {
    const [drawn] = convert(stroke) as Record<string, unknown>[];

    expect(drawn).toMatchObject({
      id: 'k1',
      type: 'freedraw',
      // Excalidraw holds a stroke's samples relative to where it started.
      x: 10,
      y: 10,
      width: 90,
      height: 30,
      strokeColor: '#e03131',
      strokeWidth: 4,
    });
    expect(drawn?.['points']).toEqual([
      [0, 0],
      [40, 30],
      [90, 10],
    ]);
  });

  test('a stroke with no samples is dropped: it would draw nothing', () => {
    expect(convert({ id: 'k2', type: 'stroke', points: [] })).toEqual([]);
    expect(convert({ id: 'k3', type: 'stroke', points: 'nonsense' })).toEqual([]);
  });

  test('a sample that is not a pair of numbers is skipped, not fatal', () => {
    const [drawn] = convert({
      id: 'k4',
      type: 'stroke',
      points: [[0, 0], 'nope', [10, Number.NaN], [20, 20]],
    }) as Record<string, unknown>[];

    expect(drawn?.['points']).toEqual([
      [0, 0],
      [20, 20],
    ]);
  });
});

describe('a hand-drawn shape', () => {
  test('a rectangle and an ellipse are normalised into the box they bound', () => {
    const drag = { a: { x: 380, y: 20 }, b: { x: 200, y: -100 }, color: 'azure', size: 'medium' };

    const [box] = convert({ id: 's1', type: 'shape', shape: 'rectangle', ...drag }) as Record<
      string,
      unknown
    >[];
    const [round] = convert({ id: 's2', type: 'shape', shape: 'ellipse', ...drag }) as Record<
      string,
      unknown
    >[];

    expect(box).toMatchObject({ type: 'rectangle', x: 200, y: -100, width: 180, height: 120 });
    expect(round).toMatchObject({ type: 'ellipse', x: 200, y: -100, width: 180, height: 120 });
  });

  test('an arrow keeps the direction it was drawn in, and its head', () => {
    const [arrow] = convert({
      id: 's3',
      type: 'shape',
      shape: 'arrow',
      a: { x: 100, y: 100 },
      b: { x: 0, y: 40 },
      color: 'amber',
      size: 'medium',
    }) as Record<string, unknown>[];

    expect(arrow).toMatchObject({ type: 'arrow', x: 100, y: 100, endArrowhead: 'arrow' });
    expect(arrow?.['points']).toEqual([
      [0, 0],
      [-100, -60],
    ]);
  });

  test('a line is an arrow without the head', () => {
    const [line] = convert({
      id: 's4',
      type: 'shape',
      shape: 'line',
      a: { x: 0, y: 0 },
      b: { x: 100, y: 0 },
    }) as Record<string, unknown>[];

    expect(line).toMatchObject({ type: 'line', endArrowhead: null });
  });

  test('a shape the old engine never drew is dropped', () => {
    expect(convert({ id: 's5', type: 'shape', shape: 'hexagon' })).toEqual([]);
  });

  test('keeps the sketch it had: the stored seed travels with the shape', () => {
    const shape = { id: 's6', type: 'shape', shape: 'rectangle', a: {}, b: {}, seed: 4242 };

    expect(convert(shape)[0]?.['seed']).toBe(4242);
  });

  test('a shape with no seed still converts the same way twice', () => {
    const shape = { id: 's7', type: 'shape', shape: 'rectangle', a: {}, b: {} };

    expect(convert(shape)[0]?.['seed']).toBe(convert(shape)[0]?.['seed']);
    expect(convert(shape)[0]?.['seed']).not.toBe(0);
  });
});

describe('a text label', () => {
  test('becomes text on the board, with nothing bound around it', () => {
    const [label] = convert({
      id: 't1',
      type: 'text',
      x: 12,
      y: 24,
      text: 'a label',
      color: 'chalk',
      size: 'bold',
    }) as Record<string, unknown>[];

    expect(label).toMatchObject({
      id: 't1',
      type: 'text',
      x: 12,
      y: 24,
      text: 'a label',
      containerId: null,
      // Chalk was near-white ink on a dark board; Excalidraw stores the colour
      // a light board would use and inverts it to draw a dark one.
      strokeColor: '#1e1e1e',
      fontSize: 36,
    });
  });

  test('the three old sizes land on three of Excalidraw’s', () => {
    const size = (name: string) =>
      convert({ id: 't2', type: 'text', text: 'x', size: name })[0]?.['fontSize'];

    expect(size('fine')).toBe(16);
    expect(size('medium')).toBe(20);
    expect(size('bold')).toBe(36);
  });
});

describe('the board as a whole', () => {
  test('converts every item on it, in the order they were drawn', () => {
    const elements = convert(
      { id: 'a', type: 'stroke', points: [[0, 0]] },
      { id: 'b', type: 'shape', shape: 'rectangle', a: {}, b: {} },
      { id: 'c', type: 'text', text: 'last' },
    );

    expect(elements.map((element) => element['id'])).toEqual(['a', 'b', 'c']);
  });

  test('an item the old engine never wrote is skipped, not fatal', () => {
    expect(convert({ id: 'x', type: 'sticker' }, { type: 'note' }, { id: '' })).toEqual([]);
  });

  test('what is not a board at all converts to nothing', () => {
    expect(migrateLegacyBoard(null)).toBeNull();
    expect(migrateLegacyBoard('nonsense')).toBeNull();
    expect(migrateLegacyBoard({ schemaVersion: 5, items: 'nonsense' })?.elements).toEqual([]);
  });

  test('a converted board carries no pictures: the old engine could hold none', () => {
    expect(migrateLegacyBoard(legacy())?.files).toEqual({});
  });
});

describe('the viewport', () => {
  test('becomes the same window onto the board, in Excalidraw’s terms', () => {
    // The old engine placed the board in screen pixels after zooming; Excalidraw
    // scrolls in board units before it, so the offset is divided by the zoom.
    expect(migrateViewport({ x: 120, y: 60, zoom: 2 })).toMatchObject({
      scrollX: 60,
      scrollY: 30,
      zoom: 2,
    });
  });

  test('a viewport that says nothing usable opens the board at its origin', () => {
    expect(migrateViewport(undefined)).toMatchObject({ scrollX: 0, scrollY: 0, zoom: 1 });
    expect(migrateViewport({ x: 'over', y: null, zoom: 0 })).toMatchObject({
      scrollX: 0,
      scrollY: 0,
      // Excalidraw cannot draw at no zoom at all, so a stored zero is clamped.
      zoom: 0.1,
    });
  });

  test('a converted board opens dark, the way Canvas has always looked', () => {
    expect(migrateViewport({ x: 0, y: 0, zoom: 1 }).theme).toBe('dark');
  });
});
