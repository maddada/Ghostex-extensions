/**
 * Named boards, driven the way a user drives them: through the switcher in the
 * corner, asserting on what is on screen and what is left in host storage.
 */

import { afterEach, describe, expect, test } from 'vitest';

import { mountCanvas, type CanvasHandle } from '../src/app.js';
import { boardStorageKey, createBoard, createNote, type BoardDocument } from '../src/board.js';
import {
  BOARDS_STORAGE_KEY,
  DEFAULT_BOARD_NAME,
  addBoard,
  createIndex,
  setBoardProject,
  type BoardsIndex,
} from '../src/boards.js';
import { createFakeBridge, type FakeBridge } from './fake-bridge.js';

const GHOSTEX = { name: 'Ghostex', path: '/Users/sven/code/oss/Ghostex' };
const SURFACE_RECT = { left: 0, top: 0, width: 1000, height: 800 };

let open: CanvasHandle[] = [];

afterEach(() => {
  for (const handle of open) handle.unmount();
  open = [];
  delete (globalThis.navigator as { clipboard?: unknown }).clipboard;
  document.body.innerHTML = '';
});

interface Harness {
  handle: CanvasHandle;
  container: HTMLElement;
  surface: HTMLElement;
  /** The name on the switcher button: the board that is open. */
  openBoard(): string;
  noteText(): string[];
  /** Opens the menu, or closes it again. */
  toggleMenu(): Promise<void>;
  /** Every board the menu lists, in order, with a ✓ on the open one. */
  listed(): string[];
  /** Clicks the menu entry whose text starts with `label`. */
  choose(label: string): Promise<void>;
  /** Types a name into the menu's name field and submits it. */
  submitName(name: string): Promise<void>;
  /** What the board is saying over itself, or null when it is saying nothing. */
  toast(): string | null;
  /** Whether the menu is open. */
  menuOpen(): boolean;
}

async function mount(bridge: FakeBridge | null): Promise<Harness> {
  const container = document.createElement('div');
  document.body.append(container);
  const handle = mountCanvas(container, bridge);
  open.push(handle);

  const surface = container.querySelector<HTMLElement>('.canvas');
  if (!surface) throw new Error('Canvas surface did not render.');
  // jsdom does no layout, so the surface is told how big and where it is.
  Object.defineProperty(surface, 'clientWidth', { value: SURFACE_RECT.width, configurable: true });
  Object.defineProperty(surface, 'clientHeight', { value: SURFACE_RECT.height, configurable: true });
  surface.getBoundingClientRect = () =>
    ({ ...SURFACE_RECT, right: 1000, bottom: 800, x: 0, y: 0, toJSON: () => SURFACE_RECT }) as DOMRect;

  await handle.ready;
  await tick();

  const items = (): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>('.boards__item, .boards__button'));

  return {
    handle,
    container,
    surface,
    openBoard: () => container.querySelector('.boards__name')?.textContent ?? '',
    // Note text is rendered markdown now, so a paragraph brings a trailing newline.
    noteText: () =>
      Array.from(container.querySelectorAll('.note__text')).map((note) =>
        (note.textContent ?? '').trim(),
      ),
    toggleMenu: () => click(query<HTMLButtonElement>(container, 'button[aria-label="Boards"]')),
    listed: () =>
      Array.from(container.querySelectorAll<HTMLElement>('[data-board-id]')).map((row) =>
        (row.textContent ?? '').trim(),
      ),
    choose: async (label) => {
      const found = items().find((item) => (item.textContent ?? '').trim().startsWith(label));
      if (!found) {
        throw new Error(
          `No menu entry starting with "${label}". Menu has: ${items()
            .map((item) => `"${(item.textContent ?? '').trim()}"`)
            .join(', ')}`,
        );
      }
      await click(found);
    },
    toast: () => container.querySelector('.canvas__toast')?.textContent ?? null,
    menuOpen: () => container.querySelector('.boards__menu') !== null,
    submitName: async (name) => {
      const field = query<HTMLInputElement>(container, '.boards__input');
      field.value = name;
      query<HTMLFormElement>(container, '.boards__form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
      await tick();
    },
  };
}

function query<T extends Element>(container: HTMLElement, selector: string): T {
  const found = container.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

async function click(element: HTMLElement): Promise<void> {
  element.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, button: 0 }));
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0 }));
  await tick();
}

/** Preact batches state updates onto a microtask; storage settles on a promise. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function storedIndex(bridge: FakeBridge): BoardsIndex {
  return bridge.read(BOARDS_STORAGE_KEY) as BoardsIndex;
}

function storedBoard(bridge: FakeBridge, id: string): BoardDocument | null {
  return bridge.read(boardStorageKey(id)) as BoardDocument | null;
}

/** A board holding one note, so switching to it is visible. */
function boardWith(id: string, text: string): BoardDocument {
  const note = { ...createNote({ x: 0, y: 0 }, `${id}-note`), text };
  return { ...createBoard(id), items: [note] };
}

/** Two boards: the default one, and "Roadmap" (open) with a note on it. */
function twoBoards(): { index: BoardsIndex; store: Record<string, unknown> } {
  const { index } = addBoard(createIndex(), 'Roadmap', null, 'b2');
  return {
    index,
    store: {
      [BOARDS_STORAGE_KEY]: index,
      [boardStorageKey('default')]: boardWith('default', 'on the first board'),
      [boardStorageKey('b2')]: boardWith('b2', 'on the roadmap'),
    },
  };
}

describe('the switcher', () => {
  test('names the board that is open and lists them all', async () => {
    const canvas = await mount(createFakeBridge(twoBoards().store));

    expect(canvas.openBoard()).toBe('Roadmap');
    await canvas.toggleMenu();
    expect(canvas.listed()).toEqual(['Canvas', '✓Roadmap']);
  });

  test('switches to another board, with what is on it', async () => {
    const bridge = createFakeBridge(twoBoards().store);
    const canvas = await mount(bridge);

    expect(canvas.noteText()).toEqual(['on the roadmap']);
    await canvas.toggleMenu();
    await canvas.choose('Canvas');

    expect(canvas.openBoard()).toBe('Canvas');
    expect(canvas.noteText()).toEqual(['on the first board']);
    await canvas.handle.flush();
    expect(storedIndex(bridge).lastOpen).toBe('default');
  });

  test('reopens the board that was left open', async () => {
    const bridge = createFakeBridge(twoBoards().store);
    const first = await mount(bridge);
    await first.toggleMenu();
    await first.choose('Canvas');
    await first.handle.flush();
    first.handle.unmount();

    const reopened = await mount(bridge);
    expect(reopened.openBoard()).toBe('Canvas');
    expect(reopened.noteText()).toEqual(['on the first board']);
  });

  test('adopts the board of an install that predates the index', async () => {
    const bridge = createFakeBridge({
      [boardStorageKey('default')]: boardWith('default', 'written before boards existed'),
    });

    const canvas = await mount(bridge);
    await canvas.handle.flush();

    expect(canvas.openBoard()).toBe(DEFAULT_BOARD_NAME);
    expect(canvas.noteText()).toEqual(['written before boards existed']);
    expect(storedIndex(bridge)).toEqual(createIndex());
  });

  test('closes when the board behind it is clicked', async () => {
    const canvas = await mount(createFakeBridge(twoBoards().store));

    await canvas.toggleMenu();
    expect(canvas.listed()).toHaveLength(2);

    canvas.surface.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
    await tick();
    expect(canvas.listed()).toHaveLength(0);
  });
});

describe('creating a board', () => {
  test('opens a new empty board and keeps it', async () => {
    const bridge = createFakeBridge(twoBoards().store);
    const canvas = await mount(bridge);

    await canvas.toggleMenu();
    await canvas.choose('New board…');
    await canvas.submitName('  Sketches  ');
    await canvas.handle.flush();

    expect(canvas.openBoard()).toBe('Sketches');
    expect(canvas.noteText()).toEqual([]);

    const index = storedIndex(bridge);
    expect(index.boards.map((board) => board.name)).toEqual(['Canvas', 'Roadmap', 'Sketches']);
    expect(index.lastOpen).toBe(index.boards[2]?.id);
    // The board it was created from is untouched, and the new one is stored.
    expect(storedBoard(bridge, 'b2')?.items).toHaveLength(1);
    expect(storedBoard(bridge, index.lastOpen)).toEqual(createBoard(index.lastOpen));
  });

  test('a note written on a new board stays on it', async () => {
    const bridge = createFakeBridge(twoBoards().store);
    const canvas = await mount(bridge);

    await canvas.toggleMenu();
    await canvas.choose('New board…');
    await canvas.submitName('Sketches');
    await click(query<HTMLButtonElement>(canvas.container, 'button[aria-label="Add note"]'));
    await canvas.handle.flush();

    const sketches = storedIndex(bridge).lastOpen;
    expect(storedBoard(bridge, sketches)?.items).toHaveLength(1);
    expect(storedBoard(bridge, 'b2')?.items).toHaveLength(1);
    expect(storedBoard(bridge, 'default')?.items).toHaveLength(1);
  });
});

describe('renaming a board', () => {
  test('renames the open one, and keeps what is on it', async () => {
    const bridge = createFakeBridge(twoBoards().store);
    const canvas = await mount(bridge);

    await canvas.toggleMenu();
    await canvas.choose('Rename this board…');
    await canvas.submitName('Q4 plan');
    await canvas.handle.flush();

    expect(canvas.openBoard()).toBe('Q4 plan');
    expect(canvas.noteText()).toEqual(['on the roadmap']);
    expect(storedIndex(bridge).boards.map((board) => board.name)).toEqual(['Canvas', 'Q4 plan']);
  });
});

describe('deleting a board', () => {
  test('asks first, and cancelling changes nothing', async () => {
    const bridge = createFakeBridge(twoBoards().store);
    const canvas = await mount(bridge);

    await canvas.toggleMenu();
    await canvas.choose('Delete this board…');
    expect(canvas.container.querySelector('.boards__question')?.textContent).toContain('Roadmap');

    await canvas.choose('Cancel');
    await canvas.handle.flush();

    expect(canvas.openBoard()).toBe('Roadmap');
    expect(storedIndex(bridge).boards).toHaveLength(2);
    expect(storedBoard(bridge, 'b2')?.items).toHaveLength(1);
  });

  test('deletes it, empties its key, and opens the neighbour', async () => {
    const bridge = createFakeBridge(twoBoards().store);
    const canvas = await mount(bridge);

    await canvas.toggleMenu();
    await canvas.choose('Delete this board…');
    await canvas.choose('Yes, delete');
    await canvas.handle.flush();

    expect(canvas.openBoard()).toBe('Canvas');
    expect(canvas.noteText()).toEqual(['on the first board']);
    expect(storedIndex(bridge).boards.map((board) => board.id)).toEqual(['default']);
    // The host store has no delete, so the key stays behind holding null.
    expect(bridge.entries.has(boardStorageKey('b2'))).toBe(true);
    expect(storedBoard(bridge, 'b2')).toBeNull();
  });

  test('leaves a fresh empty board when the last one is deleted', async () => {
    const bridge = createFakeBridge({
      [BOARDS_STORAGE_KEY]: createIndex(),
      [boardStorageKey('default')]: boardWith('default', 'the only board'),
    });
    const canvas = await mount(bridge);

    await canvas.toggleMenu();
    await canvas.choose('Delete this board…');
    await canvas.choose('Yes, delete');
    await canvas.handle.flush();

    expect(canvas.openBoard()).toBe(DEFAULT_BOARD_NAME);
    expect(canvas.noteText()).toEqual([]);
    expect(storedBoard(bridge, 'default')).toBeNull();

    const index = storedIndex(bridge);
    expect(index.boards).toHaveLength(1);
    expect(index.boards[0]?.id).not.toBe('default');
  });
});

describe('a board linked to a project', () => {
  test('offers one for the project that has none, and links it', async () => {
    const bridge = createFakeBridge(twoBoards().store, GHOSTEX);
    const canvas = await mount(bridge);

    await canvas.toggleMenu();
    await canvas.choose('New board for Ghostex');
    await canvas.handle.flush();

    expect(canvas.openBoard()).toBe('Ghostex');
    const index = storedIndex(bridge);
    expect(index.boards.at(-1)).toMatchObject({ name: 'Ghostex', projectId: GHOSTEX.path });
    expect(index.lastOpen).toBe(index.boards.at(-1)?.id);
  });

  test('surfaces the project board without switching to it on its own', async () => {
    const linked = setBoardProject(twoBoards().index, 'default', GHOSTEX.path);
    const bridge = createFakeBridge(
      { ...twoBoards().store, [BOARDS_STORAGE_KEY]: linked },
      GHOSTEX,
    );
    const canvas = await mount(bridge);

    // Ghostex is the active project, but Roadmap was left open: it stays open.
    expect(canvas.openBoard()).toBe('Roadmap');

    await canvas.toggleMenu();
    await canvas.choose('Open “Canvas”');
    await canvas.handle.flush();

    expect(canvas.openBoard()).toBe('Canvas');
    expect(storedIndex(bridge).lastOpen).toBe('default');
  });

  test('links and unlinks the open board', async () => {
    const bridge = createFakeBridge(twoBoards().store, GHOSTEX);
    const canvas = await mount(bridge);

    await canvas.toggleMenu();
    await canvas.choose('Link this board to Ghostex');
    await canvas.handle.flush();
    expect(storedIndex(bridge).boards[1]?.projectId).toBe(GHOSTEX.path);

    await canvas.toggleMenu();
    await canvas.choose('Unlink from Ghostex');
    await canvas.handle.flush();
    expect(storedIndex(bridge).boards[1]?.projectId).toBeNull();
  });

  test('follows the host from one project to the next', async () => {
    const bridge = createFakeBridge(twoBoards().store, GHOSTEX);
    const canvas = await mount(bridge);

    bridge.setProject({ name: 'Orbit', path: '/Users/sven/code/orbit' });
    await tick();
    await canvas.toggleMenu();
    await canvas.choose('New board for Orbit');
    await canvas.handle.flush();

    expect(storedIndex(bridge).boards.at(-1)).toMatchObject({
      name: 'Orbit',
      projectId: '/Users/sven/code/orbit',
    });
  });

  test('says nothing about projects when Ghostex has none open', async () => {
    const canvas = await mount(createFakeBridge(twoBoards().store));

    await canvas.toggleMenu();
    expect(canvas.container.textContent).not.toContain('Project');
    expect(canvas.listed()).toEqual(['Canvas', '✓Roadmap']);
  });
});

describe('copying a board as JSON', () => {
  /** Stands in for the page clipboard, and remembers what was written to it. */
  function clipboard(write: (text: string) => Promise<void>): void {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: write },
      configurable: true,
    });
  }

  test('puts the open board on the clipboard and says which one', async () => {
    const copied: string[] = [];
    clipboard(async (text) => void copied.push(text));
    const canvas = await mount(createFakeBridge(twoBoards().store));

    await canvas.toggleMenu();
    await canvas.choose('Copy this board as JSON');

    expect(canvas.toast()).toBe('Copied “Roadmap” as JSON.');
    expect(copied).toHaveLength(1);
  });

  test('the copied text carries the board name, its items and its version', async () => {
    const copied: string[] = [];
    clipboard(async (text) => void copied.push(text));
    const canvas = await mount(createFakeBridge(twoBoards().store));

    await canvas.toggleMenu();
    await canvas.choose('Copy this board as JSON');

    const parsed = JSON.parse(copied[0] ?? '{}') as {
      name: string;
      id: string;
      schemaVersion: number;
      items: { text: string }[];
    };
    expect(parsed.name).toBe('Roadmap');
    expect(parsed.id).toBe('b2');
    expect(parsed.schemaVersion).toBe(createBoard('b2').schemaVersion);
    expect(parsed.items.map((item) => item.text)).toEqual(['on the roadmap']);
  });

  test('says so when the clipboard will not take it', async () => {
    clipboard(() => Promise.reject(new Error('denied')));
    const canvas = await mount(createFakeBridge(twoBoards().store));

    await canvas.toggleMenu();
    await canvas.choose('Copy this board as JSON');

    expect(canvas.toast()).toBe('Could not copy the board.');
  });

  test('closes the menu, like every other thing in it', async () => {
    clipboard(async () => {});
    const canvas = await mount(createFakeBridge(twoBoards().store));

    await canvas.toggleMenu();
    await canvas.choose('Copy this board as JSON');

    expect(canvas.menuOpen()).toBe(false);
  });

  test('copies nothing but the board: no picture, no other board', async () => {
    const copied: string[] = [];
    clipboard(async (text) => void copied.push(text));
    const canvas = await mount(createFakeBridge(twoBoards().store));

    await canvas.toggleMenu();
    await canvas.choose('Copy this board as JSON');

    expect(copied[0]).not.toContain('on the first board');
    expect(copied[0]).not.toContain('data:image');
  });
});
