import { describe, expect, test } from 'vitest';

import { DEFAULT_BOARD_ID } from '../src/board.js';
import {
  DEFAULT_BOARD_NAME,
  INDEX_SCHEMA_VERSION,
  MAX_BOARD_NAME_LENGTH,
  addBoard,
  boardForProject,
  createIndex,
  currentBoard,
  deleteBoard,
  openBoard,
  readIndex,
  renameBoard,
  setBoardProject,
  type BoardsIndex,
} from '../src/boards.js';

const PROJECT = '/Users/sven/code/oss/Ghostex';
const OTHER_PROJECT = '/Users/sven/code/orbit';

/** Three boards, ids fixed so the assertions can name them. */
function threeBoards(): BoardsIndex {
  const one = addBoard(createIndex(), 'Roadmap', null, 'b2');
  const two = addBoard(one.index, 'Sketches', null, 'b3');
  return two.index;
}

describe('a fresh index', () => {
  test('holds the one board the canvas opens with', () => {
    expect(createIndex()).toEqual({
      schemaVersion: INDEX_SCHEMA_VERSION,
      boards: [{ id: DEFAULT_BOARD_ID, name: DEFAULT_BOARD_NAME, projectId: null }],
      lastOpen: DEFAULT_BOARD_ID,
    });
  });
});

describe('creating a board', () => {
  test('adds it to the end of the list and opens it', () => {
    const { index, board } = addBoard(createIndex(), 'Roadmap', null, 'b2');

    expect(board).toEqual({ id: 'b2', name: 'Roadmap', projectId: null });
    expect(index.boards.map((entry) => entry.name)).toEqual([DEFAULT_BOARD_NAME, 'Roadmap']);
    expect(index.lastOpen).toBe('b2');
    expect(currentBoard(index)).toBe(board);
  });

  test('mints an id of its own when it is not given one', () => {
    const first = addBoard(createIndex(), 'One');
    const second = addBoard(first.index, 'Two');

    expect(second.board.id).not.toBe(first.board.id);
    expect(second.board.id).not.toBe(DEFAULT_BOARD_ID);
  });

  test('trims the name, and falls back to the default when it is blank', () => {
    expect(addBoard(createIndex(), '  Roadmap  ').board.name).toBe('Roadmap');
    expect(addBoard(createIndex(), '   ').board.name).toBe(DEFAULT_BOARD_NAME);
  });

  test('caps a name long enough to break the switcher', () => {
    const name = addBoard(createIndex(), 'x'.repeat(200)).board.name;
    expect(name.length).toBe(MAX_BOARD_NAME_LENGTH);
  });
});

describe('renaming a board', () => {
  test('renames the one asked for and leaves the rest alone', () => {
    const index = renameBoard(threeBoards(), 'b2', '  Q4 plan  ');

    expect(index.boards.map((entry) => entry.name)).toEqual([
      DEFAULT_BOARD_NAME,
      'Q4 plan',
      'Sketches',
    ]);
  });

  test('leaves the index untouched when the name does not change', () => {
    const index = threeBoards();
    expect(renameBoard(index, 'b2', 'Roadmap')).toBe(index);
    expect(renameBoard(index, 'gone', 'Whatever')).toBe(index);
  });
});

describe('switching boards', () => {
  test('remembers the board to reopen', () => {
    expect(openBoard(threeBoards(), DEFAULT_BOARD_ID).lastOpen).toBe(DEFAULT_BOARD_ID);
  });

  test('ignores a board that is not there', () => {
    const index = threeBoards();
    expect(openBoard(index, 'gone')).toBe(index);
  });
});

describe('deleting a board', () => {
  test('takes it out of the list', () => {
    const index = deleteBoard(threeBoards(), 'b2');
    expect(index.boards.map((entry) => entry.id)).toEqual([DEFAULT_BOARD_ID, 'b3']);
  });

  test('opens the neighbour when the open board is the one deleted', () => {
    // b3 is open, being the last one created.
    expect(deleteBoard(threeBoards(), 'b3').lastOpen).toBe('b2');
    expect(deleteBoard(openBoard(threeBoards(), 'b2'), 'b2').lastOpen).toBe('b3');
  });

  test('leaves whichever board is open alone when another one goes', () => {
    expect(deleteBoard(threeBoards(), DEFAULT_BOARD_ID).lastOpen).toBe('b3');
  });

  test('leaves a fresh empty board behind when the last one goes', () => {
    const index = deleteBoard(createIndex(), DEFAULT_BOARD_ID, 'b9');

    expect(index.boards).toEqual([{ id: 'b9', name: DEFAULT_BOARD_NAME, projectId: null }]);
    expect(index.lastOpen).toBe('b9');
  });

  test('ignores a board that is not there', () => {
    const index = threeBoards();
    expect(deleteBoard(index, 'gone')).toBe(index);
  });
});

describe('linking a board to a project', () => {
  test('finds the board a project belongs to', () => {
    const index = setBoardProject(threeBoards(), 'b2', PROJECT);

    expect(boardForProject(index, PROJECT)?.id).toBe('b2');
    expect(boardForProject(index, OTHER_PROJECT)).toBeNull();
  });

  test('a project has one board: linking a second moves the link', () => {
    const first = setBoardProject(threeBoards(), 'b2', PROJECT);
    const second = setBoardProject(first, 'b3', PROJECT);

    expect(boardForProject(second, PROJECT)?.id).toBe('b3');
    expect(second.boards.find((entry) => entry.id === 'b2')?.projectId).toBeNull();
    // The board that lost the link keeps everything else about it.
    expect(second.boards.find((entry) => entry.id === 'b2')?.name).toBe('Roadmap');
  });

  test('creating a board for a project takes the link over too', () => {
    const linked = setBoardProject(threeBoards(), 'b2', PROJECT);
    const { index } = addBoard(linked, 'Ghostex', PROJECT, 'b4');

    expect(boardForProject(index, PROJECT)?.id).toBe('b4');
    expect(index.boards.find((entry) => entry.id === 'b2')?.projectId).toBeNull();
  });

  test('unlinks without touching any other board', () => {
    const linked = setBoardProject(setBoardProject(threeBoards(), 'b2', PROJECT), 'b3', OTHER_PROJECT);
    const index = setBoardProject(linked, 'b2', null);

    expect(boardForProject(index, PROJECT)).toBeNull();
    expect(boardForProject(index, OTHER_PROJECT)?.id).toBe('b3');
  });

  test('ignores a board that is not there', () => {
    const index = threeBoards();
    expect(setBoardProject(index, 'gone', PROJECT)).toBe(index);
  });
});

describe('reading a stored index', () => {
  test('falls back to a fresh index when there is nothing usable', () => {
    for (const raw of [null, 'nope', 42, [], {}, { schemaVersion: 0 }, { schemaVersion: 1 }]) {
      expect(readIndex(raw)).toEqual(createIndex());
    }
  });

  test('restores what was stored', () => {
    const stored = setBoardProject(threeBoards(), 'b3', PROJECT);
    expect(readIndex(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
  });

  test('drops entries with no id, and keeps the first of a repeated one', () => {
    const index = readIndex({
      schemaVersion: 1,
      boards: [
        { id: 'b2', name: 'Roadmap' },
        { name: 'No id' },
        { id: 'b2', name: 'Twice' },
        'nonsense',
      ],
      lastOpen: 'b2',
    });

    expect(index.boards).toEqual([{ id: 'b2', name: 'Roadmap', projectId: null }]);
  });

  test('repairs a hand-edited entry rather than throwing', () => {
    const index = readIndex({
      schemaVersion: 1,
      boards: [{ id: 'b2', name: 42, projectId: 7 }],
      lastOpen: 'b2',
    });

    expect(index.boards).toEqual([{ id: 'b2', name: DEFAULT_BOARD_NAME, projectId: null }]);
  });

  test('opens a real board when lastOpen points at one that is gone', () => {
    const index = readIndex({
      schemaVersion: 1,
      boards: [{ id: 'b2', name: 'Roadmap', projectId: null }],
      lastOpen: 'deleted',
    });

    expect(index.lastOpen).toBe('b2');
    expect(currentBoard(index).id).toBe('b2');
  });
});
