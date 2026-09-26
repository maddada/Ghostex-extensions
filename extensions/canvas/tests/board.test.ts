/**
 * Reading a board back out of the host store.
 *
 * The store is shared, hand-editable JSON that anything could have written, so
 * every one of these is about what happens when it does not say what a board
 * is supposed to say.
 */

import { describe, expect, test } from 'vitest';

import {
  LEGACY_SCHEMA_VERSION,
  SCHEMA_VERSION,
  boardStorageKey,
  createBoard,
  readAppState,
  readBoard,
  readZoom,
  sceneSignature,
  type StoredElement,
} from '../src/board.js';

const element = (id: string, extra: Record<string, unknown> = {}): StoredElement => ({
  id,
  type: 'rectangle',
  version: 1,
  versionNonce: 2,
  ...extra,
});

describe('a board key', () => {
  test('stays inside the 128 characters the host bridge allows', () => {
    expect(boardStorageKey('default')).toBe('board:default');
    expect(boardStorageKey('b'.repeat(60)).length).toBeLessThanOrEqual(128);
  });
});

describe('reading a stored board', () => {
  test('an empty store gives a fresh board at the current version', () => {
    expect(readBoard(null)).toEqual(createBoard());
    expect(readBoard('not a board')).toEqual(createBoard());
    expect(readBoard({})).toEqual(createBoard());
    expect(createBoard().schemaVersion).toBe(SCHEMA_VERSION);
  });

  test('a board read under one id keeps that id, whatever the copy claims', () => {
    const stored = { ...createBoard('somewhere-else'), elements: [element('a')] };

    expect(readBoard(stored, 'b2').id).toBe('b2');
  });

  test('elements survive whole: what Excalidraw wrote is what it gets back', () => {
    const drawn = element('a', { x: 4, y: 5, width: 10, height: 20, strokeColor: '#e03131' });
    const stored = { ...createBoard(), elements: [drawn] };

    expect(readBoard(stored).elements).toEqual([drawn]);
  });

  test('anything in the element list that is not an element is dropped', () => {
    const stored = {
      ...createBoard(),
      elements: ['nope', null, 42, {}, { id: '' }, element('a'), element('a'), element('b')],
    };

    // No id, a duplicate id, or not an object at all: none of them can be drawn.
    expect(readBoard(stored).elements.map((entry) => entry['id'])).toEqual(['a', 'b']);
  });

  test('a broken element list is an empty board, not a throw', () => {
    expect(readBoard({ ...createBoard(), elements: 'nonsense' }).elements).toEqual([]);
  });

  test('files come back as they were, and anything else as none', () => {
    const files = { 'file-1': { mimeType: 'image/png', dataURL: 'data:image/png;base64,aa' } };

    expect(readBoard({ ...createBoard(), files }).files).toEqual(files);
    expect(readBoard({ ...createBoard(), files: 'nonsense' }).files).toEqual({});
  });
});

describe('the app state a board remembers', () => {
  test('is where it was left, and what it was drawing with', () => {
    const state = readAppState({
      scrollX: 40,
      scrollY: -12,
      zoom: { value: 1.5 },
      theme: 'light',
      currentItemStrokeColor: '#e03131',
      currentItemFontSize: 28,
      gridModeEnabled: true,
    });

    expect(state).toMatchObject({
      scrollX: 40,
      scrollY: -12,
      zoom: 1.5,
      theme: 'light',
      currentItemStrokeColor: '#e03131',
      currentItemFontSize: 28,
      gridModeEnabled: true,
    });
  });

  test('drops everything about this moment rather than about the board', () => {
    const state = readAppState({
      scrollX: 0,
      selectedElementIds: { a: true },
      collaborators: new Map(),
      openDialog: { name: 'ttd' },
      cursorButton: 'down',
    }) as unknown as Record<string, unknown>;

    expect(Object.keys(state).sort()).toEqual(['scrollX', 'scrollY', 'theme', 'zoom']);
  });

  test('a value of the wrong kind falls back rather than reaching Excalidraw', () => {
    const state = readAppState({
      scrollX: 'over there',
      scrollY: Number.NaN,
      zoom: 'far',
      theme: 'chartreuse',
      currentItemStrokeWidth: 'thick',
      gridModeEnabled: 'yes',
    });

    expect(state).toEqual({ scrollX: 0, scrollY: 0, zoom: 1, theme: 'dark' });
  });

  test('zoom reads back from both shapes Excalidraw and the store use', () => {
    expect(readZoom({ value: 2 }, 1)).toBe(2);
    expect(readZoom(2, 1)).toBe(2);
    expect(readZoom(undefined, 1)).toBe(1);
    expect(readZoom({ value: 'lots' }, 1)).toBe(1);
  });
});

describe('the scene signature', () => {
  test('moves when an element changes, and not when nothing did', () => {
    const board = { ...createBoard(), elements: [element('a')] };
    const same = { ...createBoard(), elements: [element('a')] };
    const edited = { ...createBoard(), elements: [element('a', { version: 2 })] };

    expect(sceneSignature(same)).toBe(sceneSignature(board));
    expect(sceneSignature(edited)).not.toBe(sceneSignature(board));
  });

  test('moves when the board is scrolled, so where you were is kept', () => {
    const board = createBoard();
    const scrolled = { ...board, appState: { ...board.appState, scrollX: 40 } };

    expect(sceneSignature(scrolled)).not.toBe(sceneSignature(board));
  });

  test('moves when an element is deleted, which Excalidraw does by flagging it', () => {
    const board = { ...createBoard(), elements: [element('a')] };
    const gone = { ...createBoard(), elements: [element('a', { isDeleted: true })] };

    expect(sceneSignature(gone)).not.toBe(sceneSignature(board));
  });
});

describe('a board from before Excalidraw', () => {
  test('is handed to the conversion, once, and comes back at the new version', () => {
    const legacy = { schemaVersion: LEGACY_SCHEMA_VERSION, id: 'default', items: [] };
    const seen: unknown[] = [];

    const board = readBoard(legacy, 'default', (raw) => {
      seen.push(raw);
      return { elements: [element('converted')], appState: createBoard().appState, files: {} };
    });

    expect(seen).toEqual([legacy]);
    expect(board.schemaVersion).toBe(SCHEMA_VERSION);
    expect(board.elements.map((entry) => entry['id'])).toEqual(['converted']);
  });

  test('a conversion that finds nothing to convert leaves a fresh board', () => {
    const legacy = { schemaVersion: 3, id: 'default', items: 'nonsense' };

    expect(readBoard(legacy, 'b2', () => null)).toEqual(createBoard('b2'));
  });

  test('a board already at the new version is never converted', () => {
    const stored = { ...createBoard(), elements: [element('a')] };

    const board = readBoard(stored, 'default', () => {
      throw new Error('A current board must not be converted.');
    });

    expect(board.elements.map((entry) => entry['id'])).toEqual(['a']);
  });
});
