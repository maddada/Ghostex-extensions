import { describe, expect, test } from 'vitest';

import {
  createBoard,
  createNote,
  type BoardDocument,
  type BoardItem,
  type NoteItem,
} from '../src/board.js';
import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  createSession,
  sessionReducer,
  type BoardSession,
} from '../src/history.js';

const NOTE = createNote({ x: 100, y: 100 }, 'n1');
const OTHER = createNote({ x: 500, y: 100 }, 'n2');

function withNotes(): BoardSession {
  const start = createSession(createBoard());
  return sessionReducer(sessionReducer(start, { type: 'item/added', item: NOTE }), {
    type: 'item/added',
    item: OTHER,
  });
}

/** Narrows an item the test put on the board itself, so it can be read back. */
function asNote(item: BoardItem | undefined): NoteItem {
  if (item?.type !== 'note') throw new Error('Expected a note on the board.');
  return item;
}

function positionOf(document: BoardDocument, id: string): { x: number; y: number } {
  const note = asNote(document.items.find((item) => item.id === id));
  return { x: note.x, y: note.y };
}

describe('a fresh session', () => {
  test('has nothing to undo or redo', () => {
    const session = createSession(createBoard());
    expect(canUndo(session)).toBe(false);
    expect(canRedo(session)).toBe(false);
    expect(sessionReducer(session, { type: 'history/undo' })).toBe(session);
    expect(sessionReducer(session, { type: 'history/redo' })).toBe(session);
  });
});

describe('undo and redo', () => {
  test('take back an edit and put it back again', () => {
    const added = sessionReducer(createSession(createBoard()), { type: 'item/added', item: NOTE });
    expect(canUndo(added)).toBe(true);

    const undone = sessionReducer(added, { type: 'history/undo' });
    expect(undone.document.items).toEqual([]);
    expect(canRedo(undone)).toBe(true);

    const redone = sessionReducer(undone, { type: 'history/redo' });
    expect(redone.document.items).toEqual([NOTE]);
    expect(canRedo(redone)).toBe(false);
  });

  test('walk back through several edits one at a time', () => {
    let session = withNotes();
    session = sessionReducer(session, { type: 'item/edited', id: 'n1', text: 'first' });
    session = sessionReducer(session, { type: 'items/deleted', ids: ['n2'] });

    session = sessionReducer(session, { type: 'history/undo' });
    expect(session.document.items.map((item) => item.id)).toEqual(['n1', 'n2']);

    session = sessionReducer(session, { type: 'history/undo' });
    expect(asNote(session.document.items[0]).text).toBe('');

    session = sessionReducer(session, { type: 'history/undo' });
    expect(session.document.items.map((item) => item.id)).toEqual(['n1']);
  });

  test('drop the redo stack as soon as something new is done', () => {
    const undone = sessionReducer(
      sessionReducer(createSession(createBoard()), { type: 'item/added', item: NOTE }),
      { type: 'history/undo' },
    );
    const redirected = sessionReducer(undone, { type: 'item/added', item: OTHER });
    expect(canRedo(redirected)).toBe(false);
    expect(redirected.document.items).toEqual([OTHER]);
  });

  test('ignore panning and zooming: undo rewinds edits, not the view', () => {
    const panned = sessionReducer(withNotes(), {
      type: 'viewport/changed',
      viewport: { x: -200, y: 40, zoom: 2 },
    });
    const undone = sessionReducer(panned, { type: 'history/undo' });

    expect(undone.document.viewport).toEqual({ x: -200, y: 40, zoom: 2 });
    expect(undone.document.items.map((item) => item.id)).toEqual(['n1']);
  });

  test('keep the stack shallow enough to live in memory', () => {
    let session = createSession(createBoard());
    session = sessionReducer(session, { type: 'item/added', item: NOTE });
    for (let step = 1; step <= HISTORY_LIMIT + 20; step += 1) {
      session = sessionReducer(session, { type: 'items/moved', ids: ['n1'], dx: 1, dy: 0 });
    }
    expect(session.past).toHaveLength(HISTORY_LIMIT);

    for (let step = 0; step < HISTORY_LIMIT; step += 1) {
      session = sessionReducer(session, { type: 'history/undo' });
    }
    expect(canUndo(session)).toBe(false);
    // The oldest steps fell off the bottom, so the note is still on the board.
    expect(session.document.items).toHaveLength(1);
  });
});

describe('a gesture', () => {
  test('folds every step of one drag into a single undo', () => {
    let session = withNotes();
    for (const dx of [10, 30, 40, 60]) {
      session = sessionReducer(session, { type: 'items/moved', ids: ['n1'], dx, dy: 50, gesture: 'd1' });
    }
    expect(positionOf(session.document, 'n1')).toEqual({ x: NOTE.x + 140, y: NOTE.y + 200 });

    session = sessionReducer(session, { type: 'history/undo' });
    expect(positionOf(session.document, 'n1')).toEqual({ x: NOTE.x, y: NOTE.y });
  });

  test('is separate from the next one', () => {
    let session = withNotes();
    session = sessionReducer(session, { type: 'items/moved', ids: ['n1'], dx: 200, dy: 0, gesture: 'd1' });
    session = sessionReducer(session, { type: 'items/moved', ids: ['n1'], dx: 200, dy: 0, gesture: 'd2' });

    session = sessionReducer(session, { type: 'history/undo' });
    expect(positionOf(session.document, 'n1').x).toBe(NOTE.x + 200);
  });

  test('cannot be resumed across an undo', () => {
    let session = withNotes();
    session = sessionReducer(session, { type: 'items/moved', ids: ['n1'], dx: 200, dy: 0, gesture: 'd1' });
    session = sessionReducer(session, { type: 'history/undo' });
    session = sessionReducer(session, { type: 'items/moved', ids: ['n1'], dx: 300, dy: 0, gesture: 'd1' });

    session = sessionReducer(session, { type: 'history/undo' });
    expect(positionOf(session.document, 'n1').x).toBe(NOTE.x);
  });

  test('that changes nothing leaves the history alone', () => {
    const session = withNotes();
    expect(sessionReducer(session, { type: 'items/moved', ids: ['n1'], dx: 0, dy: 0 })).toBe(session);
    expect(sessionReducer(session, { type: 'items/moved', ids: ['gone'], dx: 5, dy: 0 })).toBe(session);
  });
});

describe('selection', () => {
  test('follows what the user clicked', () => {
    const session = sessionReducer(withNotes(), { type: 'selection/changed', ids: ['n2'] });
    expect(session.selection).toEqual(['n2']);
  });

  test('never names a note that is not on the board', () => {
    const session = sessionReducer(withNotes(), { type: 'selection/changed', ids: ['n2', 'gone'] });
    expect(session.selection).toEqual(['n2']);
  });

  test('lets go of a note that was deleted', () => {
    let session = sessionReducer(withNotes(), { type: 'selection/changed', ids: ['n1'] });
    session = sessionReducer(session, { type: 'items/deleted', ids: ['n1'] });
    expect(session.selection).toEqual([]);
  });

  test('grows and shrinks one item at a time with shift-click', () => {
    let session = sessionReducer(withNotes(), { type: 'selection/changed', ids: ['n1'] });
    session = sessionReducer(session, { type: 'selection/toggled', id: 'n2' });
    expect(session.selection).toEqual(['n1', 'n2']);

    session = sessionReducer(session, { type: 'selection/toggled', id: 'n1' });
    expect(session.selection).toEqual(['n2']);

    expect(sessionReducer(session, { type: 'selection/toggled', id: 'gone' })).toBe(session);
  });

  test('comes back with what undo brings back, and leaves with what redo takes', () => {
    let session = sessionReducer(withNotes(), { type: 'selection/changed', ids: ['n1', 'n2'] });
    session = sessionReducer(session, { type: 'items/deleted', ids: ['n1', 'n2'] });
    expect(session.selection).toEqual([]);

    session = sessionReducer(session, { type: 'history/undo' });
    expect(session.selection).toEqual(['n1', 'n2']);

    session = sessionReducer(session, { type: 'history/redo' });
    expect(session.selection).toEqual([]);
  });

  test('is not itself an undo step', () => {
    const session = sessionReducer(withNotes(), { type: 'selection/changed', ids: ['n1'] });
    const undone = sessionReducer(session, { type: 'history/undo' });
    expect(undone.document.items.map((item) => item.id)).toEqual(['n1']);
  });
});

describe('loading a board', () => {
  test('starts a new session, with nothing left to undo from the old one', () => {
    const session = sessionReducer(withNotes(), {
      type: 'board/loaded',
      document: createBoard('other'),
    });
    expect(session.document.id).toBe('other');
    expect(canUndo(session)).toBe(false);
    expect(session.selection).toEqual([]);
  });
});
