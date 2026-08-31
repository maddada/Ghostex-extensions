/**
 * Named boards, driven the way a user drives them: through the switcher in the
 * corner, asserting on what is on screen and what is left in host storage.
 *
 * Excalidraw itself is stood in for — see `fake-excalidraw.tsx` — because none
 * of this is about how a rectangle is drawn, and all of it is about what
 * happens around the drawing.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@excalidraw/excalidraw', () => import('./fake-excalidraw.js'));

import { mountCanvas, type CanvasHandle } from '../src/app.js';
import { boardStorageKey, createBoard, type BoardDocument, type StoredElement } from '../src/board.js';
import {
  BOARDS_STORAGE_KEY,
  DEFAULT_BOARD_NAME,
  addBoard,
  createIndex,
  setBoardProject,
  type BoardsIndex,
} from '../src/boards.js';
import { excalidraw } from './fake-excalidraw.js';
import { createFakeBridge, type FakeBridge } from './fake-bridge.js';

const GHOSTEX = { name: 'Ghostex', path: '/Users/sven/code/oss/Ghostex' };

let open: CanvasHandle[] = [];

afterEach(() => {
  for (const handle of open) handle.unmount();
  open = [];
  excalidraw.reset();
  delete (globalThis.navigator as { clipboard?: unknown }).clipboard;
  document.body.innerHTML = '';
});

interface Harness {
  handle: CanvasHandle;
  container: HTMLElement;
  surface: HTMLElement;
  /** The name on the switcher button: the board that is open. */
  openBoard(): string;
  /** The writing on every element Excalidraw was handed to draw. */
  sceneText(): string[];
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

  await handle.ready;
  await tick();

  const surface = container.querySelector<HTMLElement>('.canvas');
  if (!surface) throw new Error('Canvas surface did not render.');

  const items = (): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>('.boards__item, .boards__button'));

  return {
    handle,
    container,
    surface,
    openBoard: () => container.querySelector('.boards__name')?.textContent ?? '',
    sceneText: () =>
      Array.from(container.querySelectorAll('.scene__element')).map((element) =>
        (element.textContent ?? '').trim(),
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

/** React flushes a click synchronously; storage settles on a promise. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function storedIndex(bridge: FakeBridge): BoardsIndex {
  return bridge.read(BOARDS_STORAGE_KEY) as BoardsIndex;
}

function storedBoard(bridge: FakeBridge, id: string): BoardDocument | null {
  return bridge.read(boardStorageKey(id)) as BoardDocument | null;
}

/** A scene holding one line of writing, so switching to it is visible. */
function textElement(id: string, text: string): StoredElement {
  return { id, type: 'text', text, x: 0, y: 0, width: 100, height: 24, version: 1 };
}

/** A board holding one line of writing. */
function boardWith(id: string, text: string): BoardDocument {
  return { ...createBoard(id), elements: [textElement(`${id}-text`, text)] };
}

/** Two boards: the default one, and "Roadmap" (open) with writing on it. */
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

    expect(canvas.sceneText()).toEqual(['on the roadmap']);
    await canvas.toggleMenu();
    await canvas.choose('Canvas');

    expect(canvas.openBoard()).toBe('Canvas');
    expect(canvas.sceneText()).toEqual(['on the first board']);
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
    expect(reopened.sceneText()).toEqual(['on the first board']);
  });

  test('adopts the board of an install that predates the index', async () => {
    const bridge = createFakeBridge({
      [boardStorageKey('default')]: boardWith('default', 'written before boards existed'),
    });

    const canvas = await mount(bridge);
    await canvas.handle.flush();

    expect(canvas.openBoard()).toBe(DEFAULT_BOARD_NAME);
    expect(canvas.sceneText()).toEqual(['written before boards existed']);
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
    expect(canvas.sceneText()).toEqual([]);

    const index = storedIndex(bridge);
    expect(index.boards.map((board) => board.name)).toEqual(['Canvas', 'Roadmap', 'Sketches']);
    expect(index.lastOpen).toBe(index.boards[2]?.id);
    // The board it was created from is untouched, and the new one is stored.
    expect(storedBoard(bridge, 'b2')?.elements).toHaveLength(1);
    expect(storedBoard(bridge, index.lastOpen)).toEqual(createBoard(index.lastOpen));
  });

  test('what is drawn on a new board stays on it', async () => {
    const bridge = createFakeBridge(twoBoards().store);
    const canvas = await mount(bridge);

    await canvas.toggleMenu();
    await canvas.choose('New board…');
    await canvas.submitName('Sketches');
    excalidraw.change([textElement('drawn', 'a fresh idea')]);
    await canvas.handle.flush();

    const sketches = storedIndex(bridge).lastOpen;
    expect(storedBoard(bridge, sketches)?.elements).toHaveLength(1);
    expect(storedBoard(bridge, 'b2')?.elements).toHaveLength(1);
    expect(storedBoard(bridge, 'default')?.elements).toHaveLength(1);
  });

  test('a scene that changed nothing is never written', async () => {
    const bridge = createFakeBridge(twoBoards().store);
    const canvas = await mount(bridge);
    await canvas.handle.flush();
    const before = bridge.writes.length;

    // Excalidraw reports a change for a selection or a pointer move too, so
    // the same scene arriving again must not queue a save.
    excalidraw.change(storedBoard(bridge, 'b2')?.elements ?? []);
    await canvas.handle.flush();

    expect(bridge.writes.length).toBe(before);
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
    expect(canvas.sceneText()).toEqual(['on the roadmap']);
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
    expect(storedBoard(bridge, 'b2')?.elements).toHaveLength(1);
  });

  test('deletes it, empties its key, and opens the neighbour', async () => {
    const bridge = createFakeBridge(twoBoards().store);
    const canvas = await mount(bridge);

    await canvas.toggleMenu();
    await canvas.choose('Delete this board…');
    await canvas.choose('Yes, delete');
    await canvas.handle.flush();

    expect(canvas.openBoard()).toBe('Canvas');
    expect(canvas.sceneText()).toEqual(['on the first board']);
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
    expect(canvas.sceneText()).toEqual([]);
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

  test('the copied text is an Excalidraw file carrying the board name', async () => {
    const copied: string[] = [];
    clipboard(async (text) => void copied.push(text));
    const canvas = await mount(createFakeBridge(twoBoards().store));

    await canvas.toggleMenu();
    await canvas.choose('Copy this board as JSON');

    const parsed = JSON.parse(copied[0] ?? '{}') as {
      type: string;
      version: number;
      name: string;
      elements: { text: string }[];
    };
    expect(parsed.type).toBe('excalidraw');
    expect(parsed.version).toBe(2);
    expect(parsed.name).toBe('Roadmap');
    expect(parsed.elements.map((element) => element.text)).toEqual(['on the roadmap']);
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
