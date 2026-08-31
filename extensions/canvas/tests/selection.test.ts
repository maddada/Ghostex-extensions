import { describe, expect, test } from 'vitest';

import { createLabel, createNote, createShape, createStroke } from '../src/board.js';
import { drawnItemAt, itemsInside } from '../src/selection.js';

const NOTE = createNote({ x: 100, y: 100 }, 'n1');
const STROKE = createStroke(
  [
    [200, 200],
    [400, 200],
  ],
  'chalk',
  'medium',
  'k1',
);
const SHAPE = createShape('rectangle', { x: 300, y: 300 }, { x: 500, y: 400 }, 'coral', 'fine', 's1', 3);
const LABEL = { ...createLabel({ x: 600, y: 100 }, 'azure', 'medium', 'l1'), text: 'label' };
const ITEMS = [NOTE, STROKE, SHAPE, LABEL];

describe('what a click in Select lands on', () => {
  test('a stroke, within reach of its line', () => {
    expect(drawnItemAt(ITEMS, { x: 300, y: 204 }, 8)?.id).toBe('k1');
    expect(drawnItemAt(ITEMS, { x: 300, y: 230 }, 8)).toBeNull();
  });

  test('a shape by its outline, not the empty middle', () => {
    expect(drawnItemAt(ITEMS, { x: 400, y: 302 }, 8)?.id).toBe('s1');
    expect(drawnItemAt(ITEMS, { x: 400, y: 350 }, 8)).toBeNull();
  });

  test('a label anywhere on its text', () => {
    expect(drawnItemAt(ITEMS, { x: 620, y: 110 }, 8)?.id).toBe('l1');
  });

  test('never a note: notes answer the pointer themselves', () => {
    expect(drawnItemAt(ITEMS, { x: 100, y: 100 }, 8)).toBeNull();
  });

  test('the one drawn last when two overlap', () => {
    const over = createStroke(
      [
        [200, 200],
        [400, 200],
      ],
      'coral',
      'bold',
      'k2',
    );
    expect(drawnItemAt([...ITEMS, over], { x: 300, y: 200 }, 8)?.id).toBe('k2');
  });
});

describe('what a marquee takes', () => {
  test('everything wholly inside it, of every kind, in board order', () => {
    const inside = itemsInside(ITEMS, { x: -50, y: -50, width: 800, height: 500 });
    expect(inside).toEqual(['n1', 'k1', 's1', 'l1']);
  });

  test('nothing it only touches', () => {
    // Clips the note's right edge and the stroke's far end.
    expect(itemsInside(ITEMS, { x: 0, y: 0, width: 300, height: 300 })).toEqual([]);
    expect(itemsInside(ITEMS, { x: 190, y: 190, width: 220, height: 20 })).toEqual(['k1']);
  });

  test('nothing at all from a box with no area', () => {
    expect(itemsInside(ITEMS, { x: 300, y: 200, width: 0, height: 0 })).toEqual([]);
  });
});
