import { describe, expect, test } from 'vitest';

import {
  DEFAULT_BOARD_ID,
  DEFAULT_NOTE_COLOR,
  NOTE_COLORS,
  NOTE_HEIGHT,
  NOTE_MIN_HEIGHT,
  NOTE_MIN_WIDTH,
  NOTE_WIDTH,
  SCHEMA_VERSION,
  STROKE_PX,
  boardBounds,
  boardReducer,
  boardStorageKey,
  createBoard,
  createLabel,
  createNote,
  createShape,
  createStroke,
  isUndoable,
  itemBounds,
  nextNoteColor,
  readBoard,
  resizeRect,
  toggleTask,
  type BoardItem,
  type NoteItem,
} from '../src/board.js';
import { DEFAULT_VIEWPORT, MAX_ZOOM } from '../src/viewport.js';

const NOTE = createNote({ x: 100, y: 100 }, 'n1');
const OTHER = createNote({ x: 400, y: 300 }, 'n2');

function boardWith(...notes: ReturnType<typeof createNote>[]) {
  return { ...createBoard(), items: notes };
}

/** Narrows an item the test put on the board itself, so it can be read back. */
function asNote(item: BoardItem | undefined): NoteItem {
  if (item?.type !== 'note') throw new Error('Expected a note on the board.');
  return item;
}

describe('a new board', () => {
  test('is empty, versioned and parked at the default viewport', () => {
    const board = createBoard();
    expect(board).toEqual({
      schemaVersion: SCHEMA_VERSION,
      id: DEFAULT_BOARD_ID,
      items: [],
      viewport: DEFAULT_VIEWPORT,
    });
  });

  test('stores under a key the host will accept', () => {
    expect(boardStorageKey(DEFAULT_BOARD_ID)).toBe('board:default');
    expect(boardStorageKey(DEFAULT_BOARD_ID).length).toBeLessThanOrEqual(128);
  });
});

describe('a new note', () => {
  test('is centred on the point it was created at', () => {
    expect(createNote({ x: 0, y: 0 }, 'n')).toEqual({
      id: 'n',
      type: 'note',
      x: -NOTE_WIDTH / 2,
      y: -NOTE_HEIGHT / 2,
      width: NOTE_WIDTH,
      height: NOTE_HEIGHT,
      text: '',
      color: DEFAULT_NOTE_COLOR,
    });
  });

  test('is written on the default paper unless another is asked for', () => {
    expect(createNote({ x: 0, y: 0 }, 'n', 'mint').color).toBe('mint');
  });

  test('gets a unique id when none is given', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createNote({ x: 0, y: 0 }).id));
    expect(ids.size).toBe(50);
  });
});

describe('the reducer', () => {
  test('records a new viewport', () => {
    const next = boardReducer(createBoard(), {
      type: 'viewport/changed',
      viewport: { x: 12, y: -8, zoom: 2 },
    });
    expect(next.viewport).toEqual({ x: 12, y: -8, zoom: 2 });
  });

  test('clamps an out-of-range zoom instead of storing it', () => {
    const next = boardReducer(createBoard(), {
      type: 'viewport/changed',
      viewport: { x: 0, y: 0, zoom: 500 },
    });
    expect(next.viewport.zoom).toBe(MAX_ZOOM);
  });

  test('leaves the board untouched when nothing changes', () => {
    const board = boardWith(NOTE);
    expect(boardReducer(board, { type: 'viewport/changed', viewport: DEFAULT_VIEWPORT })).toBe(board);
    expect(boardReducer(board, { type: 'items/moved', ids: ['n1'], dx: 0, dy: 0 })).toBe(board);
    expect(boardReducer(board, { type: 'item/edited', id: 'n1', text: '' })).toBe(board);
    expect(boardReducer(board, { type: 'items/deleted', ids: ['gone'] })).toBe(board);
  });

  test('replaces the whole document when one is loaded', () => {
    const loaded = { ...createBoard('other'), viewport: { x: 5, y: 5, zoom: 0.5 } };
    expect(boardReducer(createBoard(), { type: 'board/loaded', document: loaded })).toBe(loaded);
  });
});

describe('notes on the board', () => {
  test('are added in the order they were created', () => {
    const board = boardReducer(
      boardReducer(createBoard(), { type: 'item/added', item: NOTE }),
      { type: 'item/added', item: OTHER },
    );
    expect(board.items.map((item) => item.id)).toEqual(['n1', 'n2']);
  });

  test('never collide on an id already on the board', () => {
    const board = boardWith(NOTE);
    expect(boardReducer(board, { type: 'item/added', item: { ...NOTE, text: 'copy' } })).toBe(board);
  });

  test('move without changing size', () => {
    const moved = boardReducer(boardWith(NOTE), { type: 'items/moved', ids: ['n1'], dx: 44, dy: -80 });
    expect(moved.items[0]).toEqual({ ...NOTE, x: 40, y: -60 });
  });

  test('resize, and never below the minimum a note stays usable at', () => {
    const resized = boardReducer(boardWith(NOTE), {
      type: 'note/resized',
      id: 'n1',
      rect: { x: 100, y: 100, width: 5, height: 5 },
    });
    expect(resized.items[0]).toMatchObject({
      x: 100,
      y: 100,
      width: NOTE_MIN_WIDTH,
      height: NOTE_MIN_HEIGHT,
    });
  });

  test('keep their text', () => {
    const edited = boardReducer(boardWith(NOTE), {
      type: 'item/edited',
      id: 'n1',
      text: 'ship it',
    });
    expect(asNote(edited.items[0]).text).toBe('ship it');
  });

  test('are deleted in one action, ignoring ids that are already gone', () => {
    const board = boardReducer(boardWith(NOTE, OTHER), {
      type: 'items/deleted',
      ids: ['n1', 'gone'],
    });
    expect(board.items.map((item) => item.id)).toEqual(['n2']);
  });

  test('are left alone when the action names a note that is not there', () => {
    const board = boardWith(NOTE);
    expect(boardReducer(board, { type: 'items/moved', ids: ['gone'], dx: 10, dy: 0 })).toBe(board);
    expect(boardReducer(board, { type: 'item/edited', id: 'gone', text: 'x' })).toBe(board);
  });
});

describe('resizing from a handle', () => {
  const start = { x: 100, y: 100, width: 200, height: 200 };

  test('drags the grabbed corner and leaves the opposite one anchored', () => {
    expect(resizeRect(start, 'se', 50, 30)).toEqual({ x: 100, y: 100, width: 250, height: 230 });
    expect(resizeRect(start, 'nw', 50, 30)).toEqual({ x: 150, y: 130, width: 150, height: 170 });
    expect(resizeRect(start, 'ne', -40, 20)).toEqual({ x: 100, y: 120, width: 160, height: 180 });
    expect(resizeRect(start, 'sw', 40, -20)).toEqual({ x: 140, y: 100, width: 160, height: 180 });
  });

  test('stops at the minimum size instead of inverting the note', () => {
    const crushed = resizeRect(start, 'nw', 1000, 1000);
    expect(crushed).toEqual({
      x: 300 - NOTE_MIN_WIDTH,
      y: 300 - NOTE_MIN_HEIGHT,
      width: NOTE_MIN_WIDTH,
      height: NOTE_MIN_HEIGHT,
    });
    expect(resizeRect(start, 'se', -1000, -1000)).toEqual({
      x: 100,
      y: 100,
      width: NOTE_MIN_WIDTH,
      height: NOTE_MIN_HEIGHT,
    });
  });
});

describe('the bounds of a board', () => {
  test('are nothing at all when there is nothing on it', () => {
    expect(boardBounds([])).toBeNull();
  });

  test('wrap every note', () => {
    expect(boardBounds([NOTE, OTHER])).toEqual({
      minX: NOTE.x,
      minY: NOTE.y,
      maxX: OTHER.x + OTHER.width,
      maxY: OTHER.y + OTHER.height,
    });
  });
});

describe('what belongs on the undo stack', () => {
  test('edits do, looking around does not', () => {
    expect(isUndoable({ type: 'item/added', item: NOTE })).toBe(true);
    expect(isUndoable({ type: 'items/moved', ids: ['n1'], dx: 1, dy: 0 })).toBe(true);
    expect(isUndoable({ type: 'items/deleted', ids: ['n1'] })).toBe(true);
    expect(isUndoable({ type: 'viewport/changed', viewport: DEFAULT_VIEWPORT })).toBe(false);
    expect(isUndoable({ type: 'board/loaded', document: createBoard() })).toBe(false);
  });
});

describe('reading a stored board', () => {
  test('falls back to a fresh board when storage is empty', () => {
    expect(readBoard(null)).toEqual(createBoard());
  });

  test('falls back to a fresh board when the value is not a versioned board', () => {
    for (const raw of ['nope', 42, [], {}, { schemaVersion: 0 }, { schemaVersion: '1' }]) {
      expect(readBoard(raw)).toEqual(createBoard());
    }
  });

  test('restores a board written by this version', () => {
    const stored = {
      schemaVersion: SCHEMA_VERSION,
      id: 'default',
      items: [NOTE, OTHER],
      viewport: { x: -300, y: 120, zoom: 2.5 },
    };
    expect(readBoard(stored)).toEqual(stored);
  });

  test('belongs to the key it was read under, whatever the stored copy claims', () => {
    const stored = { schemaVersion: SCHEMA_VERSION, id: 'default', items: [], viewport: null };
    expect(readBoard(stored, 'ideas').id).toBe('ideas');
  });

  test('coerces a hand-edited or damaged viewport rather than throwing', () => {
    const board = readBoard({
      schemaVersion: SCHEMA_VERSION,
      viewport: { x: 'left', y: null, zoom: 9999 },
    });
    expect(board.viewport).toEqual({ x: 0, y: 0, zoom: MAX_ZOOM });
    expect(board.id).toBe(DEFAULT_BOARD_ID);
  });

  test('keeps only notes it can place, and repairs the geometry it can', () => {
    const board = readBoard({
      schemaVersion: SCHEMA_VERSION,
      items: [
        NOTE,
        { id: 'b', type: 'note', x: 'far', y: 10, width: 2, height: null, text: 42 },
        { id: 'c', type: 'stroke', x: 0, y: 0 },
        { id: 'd' },
        'junk',
        null,
      ],
    });
    expect(board.items).toEqual([
      NOTE,
      {
        id: 'b',
        type: 'note',
        x: 0,
        y: 10,
        width: NOTE_MIN_WIDTH,
        height: NOTE_HEIGHT,
        text: '',
        color: DEFAULT_NOTE_COLOR,
      },
    ]);
    expect(board.schemaVersion).toBe(SCHEMA_VERSION);
  });

  test('drops the placeholder items of a version 1 board', () => {
    // Version 1 items were `{ id, type }` with no geometry: there is nowhere
    // on the board to put them, so the board comes back without them.
    const board = readBoard({
      schemaVersion: 1,
      name: 'Roadmap',
      items: [{ id: 'a', type: 'note' }],
      viewport: { x: 10, y: 20, zoom: 2 },
    });
    expect(board).toEqual({
      schemaVersion: SCHEMA_VERSION,
      id: DEFAULT_BOARD_ID,
      items: [],
      viewport: { x: 10, y: 20, zoom: 2 },
    });
  });
});

describe('note colour', () => {
  test('cycles through the whole palette and wraps back round', () => {
    let color = DEFAULT_NOTE_COLOR;
    const walked = NOTE_COLORS.map(() => (color = nextNoteColor(color)));
    expect(new Set(walked).size).toBe(NOTE_COLORS.length);
    expect(color).toBe(DEFAULT_NOTE_COLOR);
  });

  test('is repainted by the reducer, on every note named', () => {
    const board = boardReducer(boardWith(NOTE, OTHER), {
      type: 'note/colored',
      ids: ['n1', 'n2'],
      color: 'rose',
    });
    expect(board.items.map((item) => item.color)).toEqual(['rose', 'rose']);
  });

  test('leaves the board alone when the colour is already the one asked for', () => {
    const board = boardWith(NOTE);
    expect(boardReducer(board, { type: 'note/colored', ids: ['n1'], color: NOTE.color })).toBe(
      board,
    );
    expect(boardReducer(board, { type: 'note/colored', ids: ['gone'], color: 'sky' })).toBe(board);
  });

  test('is an edit, so undo takes it back', () => {
    expect(isUndoable({ type: 'note/colored', ids: ['n1'], color: 'sky' })).toBe(true);
  });

  test('survives a round trip through storage', () => {
    const stored = { ...createBoard(), items: [createNote({ x: 0, y: 0 }, 'n1', 'lilac')] };
    expect(readBoard(JSON.parse(JSON.stringify(stored))).items[0]?.color).toBe('lilac');
  });

  test('falls back to the default when storage holds a colour we do not have', () => {
    const board = readBoard({
      schemaVersion: 3,
      items: [{ id: 'a', type: 'note', x: 0, y: 0, width: 200, height: 200, color: 'chartreuse' }],
    });
    expect(board.items[0]?.color).toBe(DEFAULT_NOTE_COLOR);
  });

  test('is the default for a version 2 note, which had no colour at all', () => {
    const board = readBoard({
      schemaVersion: 2,
      items: [{ id: 'a', type: 'note', x: 0, y: 0, width: 200, height: 200, text: 'kept' }],
    });
    expect(board.items[0]).toMatchObject({ text: 'kept', color: DEFAULT_NOTE_COLOR });
    expect(board.schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('toggling a task in a note', () => {
  test('ticks an unticked task and unticks a ticked one', () => {
    expect(toggleTask('- [ ] ship it', 0)).toBe('- [x] ship it');
    expect(toggleTask('- [x] ship it', 0)).toBe('- [ ] ship it');
    expect(toggleTask('- [X] ship it', 0)).toBe('- [ ] ship it');
  });

  test('touches only the task that was clicked', () => {
    const source = '- [ ] one\n- [ ] two\n- [ ] three';
    expect(toggleTask(source, 1)).toBe('- [ ] one\n- [x] two\n- [ ] three');
  });

  test('counts nested, numbered and quoted tasks the way they are rendered', () => {
    const source = '- [ ] outer\n  - [ ] inner\n\n1. [ ] numbered\n\n> - [ ] quoted';
    expect(toggleTask(source, 1)).toContain('  - [x] inner');
    expect(toggleTask(source, 2)).toContain('1. [x] numbered');
    expect(toggleTask(source, 3)).toContain('> - [x] quoted');
  });

  test('skips a checkbox inside a code fence, because that one is not a task', () => {
    const source = '```\n- [ ] not a task\n```\n- [ ] a real one';
    expect(toggleTask(source, 0)).toBe('```\n- [ ] not a task\n```\n- [x] a real one');
  });

  test('leaves the note alone when that task is not there', () => {
    const source = '- [ ] only one';
    expect(toggleTask(source, 4)).toBe(source);
    expect(toggleTask(source, -1)).toBe(source);
    expect(toggleTask('no tasks here', 0)).toBe('no tasks here');
  });

  test('keeps everything else about the line, including what follows it', () => {
    const source = '# Plan\n\n- [ ] **ship** `it` [link](https://x.dev)\n\nnotes below';
    expect(toggleTask(source, 0)).toBe(
      '# Plan\n\n- [x] **ship** `it` [link](https://x.dev)\n\nnotes below',
    );
  });
});

const STROKE = createStroke(
  [
    [0, 0],
    [100, 60],
  ],
  'chalk',
  'medium',
  'k1',
);
const SHAPE = createShape('rectangle', { x: 200, y: 0 }, { x: 300, y: 80 }, 'coral', 'fine', 's1', 9);
const LABEL = { ...createLabel({ x: -50, y: 500 }, 'azure', 'medium', 'l1'), text: 'here' };

describe('drawings on the board', () => {
  test('join the notes, in the order they were made', () => {
    let board = boardReducer(boardWith(NOTE), { type: 'item/added', item: STROKE });
    board = boardReducer(board, { type: 'item/added', item: SHAPE });
    board = boardReducer(board, { type: 'item/added', item: LABEL });
    expect(board.items.map((item) => item.type)).toEqual(['note', 'stroke', 'shape', 'text']);
  });

  test('go away together, whatever they are, in one action', () => {
    const board = boardReducer(
      { ...createBoard(), items: [NOTE, STROKE, SHAPE, LABEL] },
      { type: 'items/deleted', ids: ['k1', 's1', 'l1'] },
    );
    expect(board.items.map((item) => item.id)).toEqual(['n1']);
  });

  test('let a label be written in, like a note', () => {
    const board = boardReducer(
      { ...createBoard(), items: [LABEL] },
      { type: 'item/edited', id: 'l1', text: 'there' },
    );
    expect(board.items[0]).toEqual({ ...LABEL, text: 'there' });
  });

  test('ignore actions that only make sense for a note', () => {
    const board = { ...createBoard(), items: [STROKE, SHAPE] };
    expect(boardReducer(board, { type: 'note/colored', ids: ['k1'], color: 'mint' })).toBe(board);
    expect(boardReducer(board, { type: 'item/edited', id: 's1', text: 'no' })).toBe(board);
  });
});

describe('moving items', () => {
  const board = { ...createBoard(), items: [NOTE, STROKE, SHAPE, LABEL] };

  test('carries every kind of item by the same distance', () => {
    const moved = boardReducer(board, {
      type: 'items/moved',
      ids: ['n1', 'k1', 's1', 'l1'],
      dx: 10,
      dy: -5,
    });
    expect(moved.items[0]).toEqual({ ...NOTE, x: NOTE.x + 10, y: NOTE.y - 5 });
    expect(moved.items[1]).toEqual({
      ...STROKE,
      points: [
        [10, -5],
        [110, 55],
      ],
    });
    expect(moved.items[2]).toEqual({ ...SHAPE, a: { x: 210, y: -5 }, b: { x: 310, y: 75 } });
    expect(moved.items[3]).toEqual({ ...LABEL, x: -40, y: 495 });
  });

  test('moves only the items it names, and keeps their order', () => {
    const moved = boardReducer(board, { type: 'items/moved', ids: ['s1'], dx: 1, dy: 1 });
    expect(moved.items.map((item) => item.id)).toEqual(['n1', 'k1', 's1', 'l1']);
    expect(moved.items[0]).toBe(NOTE);
    expect(moved.items[1]).toBe(STROKE);
    expect(moved.items[3]).toBe(LABEL);
  });

  test('is a no-op for a zero or unusable distance', () => {
    expect(boardReducer(board, { type: 'items/moved', ids: ['n1', 'k1'], dx: 0, dy: 0 })).toBe(board);
    expect(boardReducer(board, { type: 'items/moved', ids: ['n1'], dx: Number.NaN, dy: 0 })).toBe(board);
    expect(boardReducer(board, { type: 'items/moved', ids: [], dx: 5, dy: 5 })).toBe(board);
  });
});

describe('the room a drawing takes up', () => {
  test('wraps a stroke, padded by half the weight it is drawn at', () => {
    const pad = STROKE_PX.medium / 2;
    expect(itemBounds(STROKE)).toEqual({
      x: -pad,
      y: -pad,
      width: 100 + pad * 2,
      height: 60 + pad * 2,
    });
  });

  test('wraps a shape whichever way the drag went', () => {
    const forwards = createShape('line', { x: 0, y: 0 }, { x: 40, y: 20 }, 'chalk', 'fine', 'a', 1);
    const backwards = createShape('line', { x: 40, y: 20 }, { x: 0, y: 0 }, 'chalk', 'fine', 'b', 1);
    expect(itemBounds(forwards)).toEqual(itemBounds(backwards));
  });

  test('grows a label with what it says', () => {
    const wide = itemBounds({ ...LABEL, text: 'a much longer label' });
    const tall = itemBounds({ ...LABEL, text: 'one\ntwo\nthree' });
    expect(wide.width).toBeGreaterThan(itemBounds(LABEL).width);
    expect(tall.height).toBeGreaterThan(itemBounds(LABEL).height);
  });

  test('is counted with the notes when the board is framed', () => {
    const items = [NOTE, STROKE, LABEL];
    const boxes = items.map(itemBounds);
    expect(boardBounds(items)).toEqual({
      minX: Math.min(...boxes.map((box) => box.x)),
      minY: Math.min(...boxes.map((box) => box.y)),
      maxX: Math.max(...boxes.map((box) => box.x + box.width)),
      maxY: Math.max(...boxes.map((box) => box.y + box.height)),
    });
    // The stroke is the only thing above the notes, so it sets the top edge.
    expect(boardBounds(items)?.minY).toBe(itemBounds(STROKE).y);
  });
});

describe('reading stored drawings', () => {
  test('brings a stroke, a shape and a label back as they were', () => {
    const board = readBoard({
      schemaVersion: SCHEMA_VERSION,
      items: [STROKE, SHAPE, LABEL],
    });
    expect(board.items).toEqual([STROKE, SHAPE, LABEL]);
  });

  test('drops a drawing there is nothing left to draw', () => {
    const board = readBoard({
      schemaVersion: SCHEMA_VERSION,
      items: [
        { id: 'a', type: 'stroke', points: [] },
        { id: 'b', type: 'stroke', points: 'scribble' },
        { id: 'c', type: 'shape', shape: 'blob', a: { x: 0, y: 0 }, b: { x: 1, y: 1 } },
        { id: '', type: 'text', text: 'nameless' },
      ],
    });
    expect(board.items).toEqual([]);
  });

  test('repairs a hand-edited drawing rather than throwing it away', () => {
    const board = readBoard({
      schemaVersion: SCHEMA_VERSION,
      items: [
        {
          id: 'k',
          type: 'stroke',
          points: [[0, 0], [1, 'over'], [2, 3], 'junk'],
          color: 'puce',
          size: 'enormous',
        },
        { id: 's', type: 'shape', shape: 'ellipse', a: null, b: { x: 'far', y: 4 } },
      ],
    });
    expect(board.items).toEqual([
      {
        id: 'k',
        type: 'stroke',
        points: [
          [0, 0],
          [2, 3],
        ],
        color: 'chalk',
        size: 'medium',
      },
      {
        id: 's',
        type: 'shape',
        shape: 'ellipse',
        a: { x: 0, y: 0 },
        b: { x: 0, y: 4 },
        color: 'chalk',
        size: 'medium',
        seed: 1,
      },
    ]);
  });
});

describe('what a drawing puts on the undo stack', () => {
  test('adding, editing and erasing all do', () => {
    expect(isUndoable({ type: 'item/added', item: STROKE })).toBe(true);
    expect(isUndoable({ type: 'item/edited', id: 'l1', text: 'x' })).toBe(true);
    expect(isUndoable({ type: 'items/deleted', ids: ['k1'], gesture: 'erase#1' })).toBe(true);
  });
});

describe('note font', () => {
  test('is set by the reducer, on every note named', () => {
    const board = boardReducer(boardWith(NOTE, OTHER), {
      type: 'note/font',
      ids: ['n1', 'n2'],
      font: 'caveat',
    });
    expect(board.items.map((item) => (item as { font?: string }).font)).toEqual(['caveat', 'caveat']);
  });

  test('is absent, not null, on a note that follows the default', () => {
    expect('font' in NOTE).toBe(false);
    const chosen = boardReducer(boardWith(NOTE), { type: 'note/font', ids: ['n1'], font: 'lora' });
    const back = boardReducer(chosen, { type: 'note/font', ids: ['n1'], font: null });
    expect(back.items[0]).toEqual(NOTE);
    expect('font' in (back.items[0] ?? {})).toBe(false);
  });

  test('leaves the board alone when nothing would change', () => {
    const board = boardWith(NOTE);
    expect(boardReducer(board, { type: 'note/font', ids: ['n1'], font: null })).toBe(board);
    expect(boardReducer(board, { type: 'note/font', ids: ['gone'], font: 'inter' })).toBe(board);
    const chosen = boardReducer(board, { type: 'note/font', ids: ['n1'], font: 'inter' });
    expect(boardReducer(chosen, { type: 'note/font', ids: ['n1'], font: 'inter' })).toBe(chosen);
  });

  test('is an edit, so undo takes it back', () => {
    expect(isUndoable({ type: 'note/font', ids: ['n1'], font: 'inter' })).toBe(true);
  });

  test('survives a round trip through storage', () => {
    const stored = { ...createBoard(), items: [{ ...createNote({ x: 0, y: 0 }, 'n1'), font: 'jetbrains-mono' }] };
    const read = readBoard(JSON.parse(JSON.stringify(stored)));
    expect((read.items[0] as { font?: string }).font).toBe('jetbrains-mono');
  });

  test('a version 4 note, or one in a font no longer on the list, follows the default', () => {
    const board = readBoard({
      schemaVersion: 4,
      items: [
        { id: 'a', type: 'note', x: 0, y: 0, width: 200, height: 200, color: 'sky' },
        { id: 'b', type: 'note', x: 0, y: 0, width: 200, height: 200, color: 'sky', font: 'papyrus' },
      ],
    });
    expect(board.items.map((item) => 'font' in item)).toEqual([false, false]);
    expect(board.items[0]?.type === 'note' && board.items[0].color).toBe('sky');
  });

  test('is ignored for anything that is not a note', () => {
    const board = { ...createBoard(), items: [createStroke([[0, 0], [1, 1]], 'chalk', 'medium', 'k1')] };
    expect(boardReducer(board, { type: 'note/font', ids: ['k1'], font: 'lora' })).toBe(board);
  });
});
