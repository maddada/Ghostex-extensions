/**
 * Copying a board out as JSON: what the text says, and how it reaches the
 * clipboard when the page's modern API is there, refused, or missing.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';

import { createBoard, createNote, type BoardDocument } from '../src/board.js';
import { boardExport, copyText, formatBoardExport } from '../src/export.js';

afterEach(() => {
  delete (globalThis.navigator as { clipboard?: unknown }).clipboard;
  delete (globalThis.document as { execCommand?: unknown }).execCommand;
  document.body.innerHTML = '';
});

/** A board with something on it, so an export has something to carry. */
function board(): BoardDocument {
  const empty = createBoard('board-1');
  return {
    ...empty,
    items: [createNote({ x: 10, y: 20 }, 'note-1')],
    viewport: { x: -40, y: 12, zoom: 1.5 },
  };
}

/** Installs a fake `navigator.clipboard.writeText`. */
function clipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
}

/** Installs a fake `document.execCommand`. */
function execCommand(result: () => boolean): void {
  Object.defineProperty(globalThis.document, 'execCommand', {
    value: vi.fn(result),
    configurable: true,
  });
}

describe('what a copied board says', () => {
  test('carries the schema version, the id, the items and the viewport', () => {
    const exported = boardExport(board(), 'Ideas');

    expect(exported.schemaVersion).toBe(board().schemaVersion);
    expect(exported.id).toBe('board-1');
    expect(exported.items).toHaveLength(1);
    expect(exported.viewport).toEqual({ x: -40, y: 12, zoom: 1.5 });
  });

  test('carries the name, which the board document itself does not hold', () => {
    expect('name' in board()).toBe(false);
    expect(boardExport(board(), 'Ideas').name).toBe('Ideas');
  });

  test('is indented, newline-terminated, and parses back to itself', () => {
    const text = formatBoardExport(board(), 'Ideas');

    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  "id": "board-1"');
    expect(JSON.parse(text)).toEqual(boardExport(board(), 'Ideas'));
  });

  test('says nothing about the board background, which is not in the document', () => {
    expect(formatBoardExport(board(), 'Ideas')).not.toContain('background');
  });
});

describe('reaching the clipboard', () => {
  test('writes through the page clipboard when it is there', async () => {
    const written: string[] = [];
    clipboard(async (text) => void written.push(text));

    expect(await copyText('board json')).toBe(true);
    expect(written).toEqual(['board json']);
  });

  test('falls back to a selection copy when the clipboard refuses', async () => {
    clipboard(() => Promise.reject(new Error('denied')));
    execCommand(() => true);

    expect(await copyText('board json')).toBe(true);
    expect(globalThis.document.execCommand).toHaveBeenCalledWith('copy');
  });

  test('leaves no field behind after a selection copy', async () => {
    execCommand(() => true);

    await copyText('board json');

    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });

  test('says so when neither way works', async () => {
    clipboard(() => Promise.reject(new Error('denied')));

    expect(await copyText('board json')).toBe(false);
  });

  test('says so when the selection copy reports a failure', async () => {
    execCommand(() => false);

    expect(await copyText('board json')).toBe(false);
  });
});
