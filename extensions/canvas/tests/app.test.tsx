/**
 * The whole extension, running headless against a fake `window.ghostex`.
 *
 * These tests only ever do what a user does — scroll, drag, press keys, click
 * buttons — and only ever assert on what a user or the host can see: the
 * rendered board and the data left in bridge storage.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';

import { mountCanvas, type CanvasHandle } from '../src/app.js';
import {
  DEFAULT_NOTE_COLOR,
  NOTE_HEIGHT,
  NOTE_WIDTH,
  boardStorageKey,
  createBoard,
  createLabel,
  createNote,
  createShape,
  createStroke,
  nextNoteColor,
  type BoardDocument,
  type BoardItem,
  type NoteColor,
  type NoteItem,
  type ShapeItem,
  type StrokeItem,
  type TextItem,
} from '../src/board.js';
import {
  DEFAULT_VIEWPORT,
  surfaceToWorld,
  worldToSurface,
  type Viewport,
} from '../src/viewport.js';
import { createFakeBridge, type FakeBridge } from './fake-bridge.js';

const KEY = boardStorageKey('default');
const SURFACE_RECT = { left: 40, top: 20, width: 1000, height: 800 };

let open: CanvasHandle[] = [];

afterEach(() => {
  for (const handle of open) handle.unmount();
  open = [];
  document.body.innerHTML = '';
});

interface Harness {
  handle: CanvasHandle;
  surface: HTMLElement;
  viewport(): Viewport;
  status(): string;
  zoomLabel(): string;
  button(label: string): HTMLButtonElement;
  notes(): HTMLElement[];
  note(index?: number): HTMLElement;
  editor(): HTMLTextAreaElement | null;
  handleAt(corner: string): HTMLElement;
  /** Every path the ink layer is drawing, committed or still under the pointer. */
  ink(): SVGPathElement[];
  labels(): HTMLElement[];
  labelEditor(): HTMLTextAreaElement | null;
  /** The box drawn round each selected stroke or shape. */
  selectionBoxes(): SVGRectElement[];
  /** What the board thinks is selected: notes, drawings and labels together. */
  selectedCount(): number;
  marquee(): HTMLElement | null;
}

async function mount(bridge: FakeBridge | null): Promise<Harness> {
  const container = document.createElement('div');
  document.body.append(container);
  const handle = mountCanvas(container, bridge);
  open.push(handle);

  const surface = container.querySelector<HTMLElement>('.canvas');
  if (!surface) throw new Error('Canvas surface did not render.');
  // happy-dom does no layout, so the surface is told how big and where it is.
  Object.defineProperty(surface, 'clientWidth', { value: SURFACE_RECT.width, configurable: true });
  Object.defineProperty(surface, 'clientHeight', { value: SURFACE_RECT.height, configurable: true });
  surface.getBoundingClientRect = () =>
    ({
      ...SURFACE_RECT,
      right: SURFACE_RECT.left + SURFACE_RECT.width,
      bottom: SURFACE_RECT.top + SURFACE_RECT.height,
      x: SURFACE_RECT.left,
      y: SURFACE_RECT.top,
      toJSON: () => SURFACE_RECT,
    }) as DOMRect;

  await handle.ready;
  await tick();

  const query = <T extends Element>(selector: string): T => {
    const found = container.querySelector<T>(selector);
    if (!found) throw new Error(`Missing element: ${selector}`);
    return found;
  };

  const notes = (): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>('[data-testid="note"]'));

  return {
    handle,
    surface,
    viewport: () => readViewport(query<HTMLElement>('[data-testid="canvas-world"]')),
    status: () => query('.canvas__status').textContent ?? '',
    zoomLabel: () => query('.toolbar__zoom').textContent ?? '',
    button: (label) => query<HTMLButtonElement>(`button[aria-label="${label}"]`),
    notes,
    note: (index = 0) => {
      const found = notes()[index];
      if (!found) throw new Error(`No note at index ${index}.`);
      return found;
    },
    editor: () => container.querySelector<HTMLTextAreaElement>('.note__editor'),
    handleAt: (corner) => query<HTMLElement>(`[data-handle="${corner}"]`),
    ink: () => Array.from(container.querySelectorAll<SVGPathElement>('.canvas__ink path')),
    labels: () => Array.from(container.querySelectorAll<HTMLElement>('[data-testid="label"]')),
    labelEditor: () => container.querySelector<HTMLTextAreaElement>('.label__editor'),
    selectionBoxes: () =>
      Array.from(container.querySelectorAll<SVGRectElement>('.canvas__ink .ink__selection')),
    selectedCount: () =>
      container.querySelectorAll('.note--selected, .ink__selection, .label--selected').length,
    marquee: () => container.querySelector<HTMLElement>('.canvas__marquee'),
  };
}

/** Where a note sits on the board, read back off the rendered element. */
function rectOf(note: HTMLElement): { x: number; y: number; width: number; height: number } {
  return {
    x: Number.parseFloat(note.style.left),
    y: Number.parseFloat(note.style.top),
    width: Number.parseFloat(note.style.width),
    height: Number.parseFloat(note.style.height),
  };
}

function storedNotes(bridge: FakeBridge): NoteItem[] {
  return storedItems(bridge).filter((item): item is NoteItem => item.type === 'note');
}

function storedItems(bridge: FakeBridge): BoardItem[] {
  return (bridge.read(KEY) as BoardDocument | null)?.items ?? [];
}

/** Preact batches state updates onto a microtask. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function readViewport(world: HTMLElement): Viewport {
  const match = /translate\((-?[\d.e+-]+)px, (-?[\d.e+-]+)px\) scale\((-?[\d.e+-]+)\)/.exec(
    world.style.transform,
  );
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error(`Unreadable world transform: ${world.style.transform}`);
  }
  return { x: Number(match[1]), y: Number(match[2]), zoom: Number(match[3]) };
}

/** Client coordinates for a point measured from the surface's top-left corner. */
function onSurface(x: number, y: number): { clientX: number; clientY: number } {
  return { clientX: SURFACE_RECT.left + x, clientY: SURFACE_RECT.top + y };
}

async function scroll(
  surface: HTMLElement,
  init: { deltaX?: number; deltaY?: number; ctrlKey?: boolean } & { clientX: number; clientY: number },
): Promise<void> {
  surface.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init }));
  await tick();
}

async function drag(
  surface: HTMLElement,
  button: number,
  from: { clientX: number; clientY: number },
  to: { clientX: number; clientY: number },
): Promise<void> {
  const pointerId = 1;
  surface.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId, button, ...from }),
  );
  surface.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId, ...to }));
  surface.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId, ...to }));
  await tick();
}

/** The real sequence a browser fires: two clicks, then the double-click. */
async function doubleClick(
  target: HTMLElement,
  point: { clientX: number; clientY: number },
): Promise<void> {
  for (let count = 0; count < 2; count += 1) {
    target.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, button: 0, ...point }),
    );
    target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, ...point }));
  }
  target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, ...point }));
  await tick();
}

async function clickAt(
  target: HTMLElement,
  point: { clientX: number; clientY: number },
  keys: { shiftKey?: boolean } = {},
): Promise<void> {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      button: 0,
      ...point,
      ...keys,
    }),
  );
  target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, ...point, ...keys }));
  await tick();
}

/** Drags an element the way a pointer does, in surface coordinates. */
async function dragFrom(
  target: HTMLElement,
  from: { clientX: number; clientY: number },
  to: { clientX: number; clientY: number },
  steps = 3,
  keys: { shiftKey?: boolean } = {},
): Promise<void> {
  const pointerId = 2;
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId,
      button: 0,
      ...from,
      ...keys,
    }),
  );
  for (let step = 1; step <= steps; step += 1) {
    target.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId,
        clientX: from.clientX + ((to.clientX - from.clientX) * step) / steps,
        clientY: from.clientY + ((to.clientY - from.clientY) * step) / steps,
        ...keys,
      }),
    );
  }
  target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId, ...to, ...keys }));
  await tick();
}

async function typeInto(field: HTMLTextAreaElement, text: string): Promise<void> {
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
}

function pressEscape(target: HTMLElement): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }),
  );
}

function pressKey(type: 'keydown' | 'keyup', init: KeyboardEventInit): void {
  document.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init }));
}

async function click(button: HTMLButtonElement): Promise<void> {
  button.click();
  await tick();
}

describe('opening the board', () => {
  test('shows an empty board at 100% and saves it', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);

    expect(canvas.zoomLabel()).toBe('100%');
    expect(canvas.viewport()).toEqual(DEFAULT_VIEWPORT);

    await canvas.handle.flush();
    expect(canvas.status()).toBe('Saved');
    expect(bridge.read(KEY)).toEqual(createBoard());
  });

  test('restores the board that was left behind', async () => {
    const stored = { ...createBoard(), viewport: { x: -250, y: 90, zoom: 2 } };
    const bridge = createFakeBridge({ [KEY]: stored });

    const canvas = await mount(bridge);

    expect(canvas.viewport()).toEqual(stored.viewport);
    expect(canvas.zoomLabel()).toBe('200%');
  });

  test('says there is no host storage instead of pretending to save', async () => {
    const canvas = await mount(null);
    await canvas.handle.flush();
    expect(canvas.status()).toBe('No host storage');
  });

  test('refuses to overwrite a board it could not read', async () => {
    const stored = { ...createBoard(), viewport: { x: 11, y: 22, zoom: 1.5 } };
    const bridge = createFakeBridge({ [KEY]: stored });
    bridge.failGet(KEY);

    const canvas = await mount(bridge);
    await scroll(canvas.surface, { deltaY: 120, ...onSurface(100, 100) });
    await canvas.handle.flush();

    expect(canvas.status()).toBe('Not saved');
    expect(bridge.writes).not.toContain(KEY);
    expect(bridge.read(KEY)).toEqual(stored);
  });
});

describe('panning', () => {
  test('a trackpad scroll moves the board the other way', async () => {
    const canvas = await mount(createFakeBridge());

    await scroll(canvas.surface, { deltaX: 60, deltaY: 40, ...onSurface(500, 400) });

    expect(canvas.viewport()).toEqual({ x: -60, y: -40, zoom: 1 });
  });

  test('holding space and dragging moves the board with the cursor', async () => {
    const canvas = await mount(createFakeBridge());

    pressKey('keydown', { code: 'Space' });
    await drag(canvas.surface, 0, onSurface(100, 100), onSurface(180, 60));
    pressKey('keyup', { code: 'Space' });

    expect(canvas.viewport()).toEqual({ x: 80, y: -40, zoom: 1 });
  });

  test('a primary drag without space does not move the board', async () => {
    const canvas = await mount(createFakeBridge());

    await drag(canvas.surface, 0, onSurface(100, 100), onSurface(180, 60));

    expect(canvas.viewport()).toEqual(DEFAULT_VIEWPORT);
  });

  test('a middle-button drag moves the board', async () => {
    const canvas = await mount(createFakeBridge());

    await drag(canvas.surface, 1, onSurface(300, 300), onSurface(250, 340));

    expect(canvas.viewport()).toEqual({ x: -50, y: 40, zoom: 1 });
  });
});

describe('zooming', () => {
  test('cmd-scroll zooms and keeps the point under the cursor still', async () => {
    const canvas = await mount(createFakeBridge());
    const anchor = { x: 200, y: 100 };

    await scroll(canvas.surface, { deltaY: -100, ctrlKey: true, ...onSurface(anchor.x, anchor.y) });

    const viewport = canvas.viewport();
    expect(viewport.zoom).toBeGreaterThan(1);
    // The board point that was under the cursor is still under the cursor.
    const stillThere = worldToSurface(viewport, anchor);
    expect(stillThere.x).toBeCloseTo(anchor.x, 6);
    expect(stillThere.y).toBeCloseTo(anchor.y, 6);
  });

  test('scrolling down with cmd zooms out', async () => {
    const canvas = await mount(createFakeBridge());

    await scroll(canvas.surface, { deltaY: 100, ctrlKey: true, ...onSurface(500, 400) });

    expect(canvas.viewport().zoom).toBeLessThan(1);
  });

  test('the toolbar zooms in, out and back to 100%', async () => {
    const canvas = await mount(createFakeBridge());

    await click(canvas.button('Zoom in'));
    expect(canvas.zoomLabel()).toBe('110%');

    await click(canvas.button('Zoom out'));
    expect(canvas.zoomLabel()).toBe('100%');

    await click(canvas.button('Zoom in'));
    await click(canvas.button('Zoom in'));
    await click(canvas.button('Reset zoom to 100%'));
    expect(canvas.zoomLabel()).toBe('100%');
  });

  test('the keyboard zooms like the toolbar does', async () => {
    const canvas = await mount(createFakeBridge());

    pressKey('keydown', { key: '=', metaKey: true });
    await tick();
    expect(canvas.zoomLabel()).toBe('110%');

    pressKey('keydown', { key: '0', metaKey: true });
    await tick();
    expect(canvas.zoomLabel()).toBe('100%');
  });

  test('zoom to fit brings an empty board back to where it started', async () => {
    const canvas = await mount(createFakeBridge());

    await scroll(canvas.surface, { deltaY: -200, ctrlKey: true, ...onSurface(120, 90) });
    await scroll(canvas.surface, { deltaX: 300, deltaY: 200, ...onSurface(500, 400) });
    expect(canvas.viewport()).not.toEqual(DEFAULT_VIEWPORT);

    await click(canvas.button('Zoom to fit'));

    expect(canvas.viewport()).toEqual(DEFAULT_VIEWPORT);
    expect(canvas.zoomLabel()).toBe('100%');
  });

  test('shift-1 also zooms to fit', async () => {
    const canvas = await mount(createFakeBridge());

    await scroll(canvas.surface, { deltaX: 120, deltaY: 90, ...onSurface(500, 400) });
    pressKey('keydown', { key: '!', shiftKey: true });
    await tick();

    expect(canvas.viewport()).toEqual(DEFAULT_VIEWPORT);
  });
});

describe('autosaving', () => {
  test('a pan reaches host storage on its own, without a flush', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);
    await canvas.handle.flush();

    await scroll(canvas.surface, { deltaX: 25, deltaY: 15, ...onSurface(500, 400) });

    await vi.waitFor(() =>
      expect(bridge.read(KEY)).toMatchObject({ viewport: { x: -25, y: -15, zoom: 1 } }),
    );
    await vi.waitFor(() => expect(canvas.status()).toBe('Saved'));
  });

  test('what was saved is what reopens', async () => {
    const bridge = createFakeBridge();
    const first = await mount(bridge);
    await scroll(first.surface, { deltaY: -100, ctrlKey: true, ...onSurface(200, 100) });
    await first.handle.flush();
    const saved = first.viewport();
    first.handle.unmount();

    const second = await mount(bridge);

    expect(second.viewport()).toEqual(saved);
  });
});

describe('writing a note', () => {
  test('a double-click leaves a note where the pointer was, ready to type in', async () => {
    const canvas = await mount(createFakeBridge());

    await doubleClick(canvas.surface, onSurface(300, 200));

    expect(canvas.notes()).toHaveLength(1);
    expect(rectOf(canvas.note())).toEqual({
      x: 300 - NOTE_WIDTH / 2,
      y: 200 - NOTE_HEIGHT / 2,
      width: NOTE_WIDTH,
      height: NOTE_HEIGHT,
    });
    expect(canvas.editor()).not.toBeNull();
    // Preact runs effects after the paint, so the caret lands a beat later.
    await vi.waitFor(() => expect(document.activeElement).toBe(canvas.editor()));
  });

  test('the toolbar puts one in the middle of what you are looking at', async () => {
    const canvas = await mount(createFakeBridge());

    await click(canvas.button('Add note'));

    expect(rectOf(canvas.note())).toMatchObject({
      x: 500 - NOTE_WIDTH / 2,
      y: 400 - NOTE_HEIGHT / 2,
    });
  });

  test('lands on the board under the pointer however far you have panned and zoomed', async () => {
    const stored = { ...createBoard(), viewport: { x: -100, y: -50, zoom: 2 } };
    const canvas = await mount(createFakeBridge({ [KEY]: stored }));

    await doubleClick(canvas.surface, onSurface(300, 200));

    // Surface (300, 200) is board (200, 125) at this pan and zoom.
    expect(rectOf(canvas.note())).toMatchObject({
      x: 200 - NOTE_WIDTH / 2,
      y: 125 - NOTE_HEIGHT / 2,
    });
  });

  test('keeps what you typed, and saves it', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);
    await doubleClick(canvas.surface, onSurface(300, 200));

    const editor = canvas.editor();
    if (!editor) throw new Error('The new note is not ready to type in.');
    await typeInto(editor, 'ship the canvas');
    pressEscape(editor);
    await tick();

    expect(canvas.note().textContent).toContain('ship the canvas');
    await canvas.handle.flush();
    expect(storedNotes(bridge)[0]).toMatchObject({ text: 'ship the canvas', type: 'note' });
  });

  test('is still there, where it was, after the view is reopened', async () => {
    const bridge = createFakeBridge();
    const first = await mount(bridge);
    await doubleClick(first.surface, onSurface(300, 200));
    const editor = first.editor();
    if (!editor) throw new Error('The new note is not ready to type in.');
    await typeInto(editor, 'remember me');
    await first.handle.flush();
    const before = rectOf(first.note());
    first.handle.unmount();

    const second = await mount(bridge);

    expect(second.notes()).toHaveLength(1);
    expect(rectOf(second.note())).toEqual(before);
    expect(second.note().textContent).toContain('remember me');
  });
});

describe('moving and resizing a note', () => {
  /** A board holding one note, in the middle of the view, not being typed in. */
  async function boardWithNote(bridge: FakeBridge): Promise<Harness> {
    const canvas = await mount(bridge);
    await click(canvas.button('Add note'));
    const editor = canvas.editor();
    if (editor) pressEscape(editor);
    await tick();
    return canvas;
  }

  test('a drag moves it, and the drag is one undo step, not one per pixel', async () => {
    const bridge = createFakeBridge();
    const canvas = await boardWithNote(bridge);
    const start = rectOf(canvas.note());

    await dragFrom(canvas.note(), onSurface(500, 400), onSurface(580, 460));

    expect(rectOf(canvas.note())).toMatchObject({ x: start.x + 80, y: start.y + 60 });

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    expect(rectOf(canvas.note())).toMatchObject({ x: start.x, y: start.y });

    pressKey('keydown', { key: 'z', metaKey: true, shiftKey: true });
    await tick();
    expect(rectOf(canvas.note())).toMatchObject({ x: start.x + 80, y: start.y + 60 });
  });

  test('a drag moves it by what the pointer covered on the board, not on the screen', async () => {
    const canvas = await boardWithNote(createFakeBridge());
    await click(canvas.button('Zoom in')); // 110%
    const start = rectOf(canvas.note());
    const viewport = canvas.viewport();
    const from = { clientX: SURFACE_RECT.left + 500, clientY: SURFACE_RECT.top + 400 };
    const to = { clientX: from.clientX + 110, clientY: from.clientY };

    await dragFrom(canvas.note(), from, to);

    expect(rectOf(canvas.note()).x).toBeCloseTo(start.x + 110 / viewport.zoom, 6);
  });

  test('the corner handles resize it, and only show while it is selected', async () => {
    const canvas = await boardWithNote(createFakeBridge());
    const start = rectOf(canvas.note());
    const corner = onSurface(start.x + start.width, start.y + start.height);

    await dragFrom(canvas.handleAt('se'), corner, {
      clientX: corner.clientX + 50,
      clientY: corner.clientY + 40,
    });

    expect(rectOf(canvas.note())).toEqual({
      x: start.x,
      y: start.y,
      width: start.width + 50,
      height: start.height + 40,
    });

    await clickAt(canvas.surface, onSurface(20, 20));
    expect(canvas.surface.querySelector('[data-handle]')).toBeNull();
  });

  test('a space-drag over a note pans the board and leaves the note alone', async () => {
    const canvas = await boardWithNote(createFakeBridge());
    const start = rectOf(canvas.note());

    pressKey('keydown', { code: 'Space' });
    await tick();
    await dragFrom(canvas.note(), onSurface(500, 400), onSurface(560, 430));
    pressKey('keyup', { code: 'Space' });
    await tick();

    expect(canvas.viewport()).toMatchObject({ x: 60, y: 30 });
    expect(rectOf(canvas.note())).toMatchObject({ x: start.x, y: start.y });
  });
});

describe('removing a note', () => {
  test('delete takes the selected note off the board, and undo brings it back', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);
    await doubleClick(canvas.surface, onSurface(300, 200));
    const editor = canvas.editor();
    if (editor) pressEscape(editor);
    await tick();

    pressKey('keydown', { key: 'Delete' });
    await tick();
    expect(canvas.notes()).toHaveLength(0);
    await canvas.handle.flush();
    expect(storedNotes(bridge)).toEqual([]);

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    expect(canvas.notes()).toHaveLength(1);
    await canvas.handle.flush();
    expect(storedNotes(bridge)).toHaveLength(1);
  });

  test('the button above a selected note removes it, and undo brings it back', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);
    await click(canvas.button('Add note'));
    const editor = canvas.editor();
    if (editor) pressEscape(editor);
    await tick();

    await click(canvas.button('Delete note'));
    expect(canvas.notes()).toHaveLength(0);
    await canvas.handle.flush();
    expect(storedNotes(bridge)).toEqual([]);

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    expect(canvas.notes()).toHaveLength(1);
  });

  test('the delete button is only there while a note is selected', async () => {
    const canvas = await mount(createFakeBridge());
    await click(canvas.button('Add note'));
    const editor = canvas.editor();
    if (editor) pressEscape(editor);
    await tick();
    expect(canvas.surface.querySelector('.note__delete')).not.toBeNull();

    await clickAt(canvas.surface, onSurface(20, 20));
    expect(canvas.surface.querySelector('.note__delete')).toBeNull();
  });

  test('delete does nothing while nothing is selected', async () => {
    const canvas = await mount(createFakeBridge());
    await doubleClick(canvas.surface, onSurface(300, 200));
    const editor = canvas.editor();
    if (editor) pressEscape(editor);
    await clickAt(canvas.surface, onSurface(20, 20));

    pressKey('keydown', { key: 'Delete' });
    await tick();

    expect(canvas.notes()).toHaveLength(1);
  });
});

describe('zoom to fit, with something on the board', () => {
  test('frames the notes instead of resetting the view', async () => {
    const stored = { ...createBoard(), items: [createNote({ x: 900, y: 700 }, 'n1')] };
    const canvas = await mount(createFakeBridge({ [KEY]: stored }));

    await click(canvas.button('Zoom to fit'));

    const viewport = canvas.viewport();
    const middle = worldToSurface(viewport, { x: 900, y: 700 });
    expect(middle.x).toBeCloseTo(SURFACE_RECT.width / 2, 6);
    expect(middle.y).toBeCloseTo(SURFACE_RECT.height / 2, 6);
    expect(viewport.zoom).toBeGreaterThan(1);
  });
});

/** A board holding one note in the middle of the view, written and deselected. */
async function boardShowing(
  text: string,
  color: NoteColor = DEFAULT_NOTE_COLOR,
): Promise<{ canvas: Harness; bridge: FakeBridge }> {
  const note = { ...createNote({ x: 500, y: 400 }, 'n1', color), text };
  const bridge = createFakeBridge({ [KEY]: { ...createBoard(), items: [note] } });
  return { canvas: await mount(bridge), bridge };
}

/** The live checkboxes a rendered note is showing. */
function tasks(canvas: Harness): HTMLInputElement[] {
  return Array.from(
    canvas.note().querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  );
}

function storedNote(bridge: FakeBridge): NoteItem | undefined {
  return storedNotes(bridge)[0];
}

async function selectNote(canvas: Harness): Promise<void> {
  await clickAt(canvas.note(), onSurface(500, 400));
}

describe('a note is markdown', () => {
  test('shows it rendered rather than as source', async () => {
    const { canvas } = await boardShowing('# Plan\n\n- [ ] ship it\n\n`npm run check`');

    const note = canvas.note();
    expect(note.querySelector('h1')?.textContent).toBe('Plan');
    expect(note.querySelector('code')?.textContent).toBe('npm run check');
    expect(tasks(canvas)).toHaveLength(1);
    // The source itself is nowhere on the board while the note is not being edited.
    expect(note.textContent).not.toContain('# Plan');
  });

  test('flips to the source and back', async () => {
    const { canvas } = await boardShowing('# Plan');
    await selectNote(canvas);

    await click(canvas.button('Edit the markdown'));
    expect(canvas.editor()?.value).toBe('# Plan');
    expect(canvas.note().querySelector('h1')).toBeNull();

    await click(canvas.button('Show the rendered note'));
    expect(canvas.editor()).toBeNull();
    expect(canvas.note().querySelector('h1')?.textContent).toBe('Plan');
  });

  test('a double-click still opens the source, and Escape closes it', async () => {
    const { canvas } = await boardShowing('## Notes');

    await doubleClick(canvas.note(), onSurface(500, 400));
    const editor = canvas.editor();
    if (!editor) throw new Error('Double-clicking a note did not open its markdown.');
    expect(editor.value).toBe('## Notes');

    pressEscape(editor);
    await tick();
    expect(canvas.note().querySelector('h2')?.textContent).toBe('Notes');
  });

  test('says what an empty note is for instead of showing a blank card', async () => {
    const { canvas } = await boardShowing('');
    expect(canvas.note().textContent).toContain('Double-click to write');
  });

  test('never puts a script from a note onto the board', async () => {
    const { canvas } = await boardShowing(
      '<script>globalThis.pwned = true;</script>\n\n<img src=x onerror="globalThis.pwned = true">',
    );

    expect(canvas.note().querySelector('script')).toBeNull();
    expect(canvas.note().querySelector('img')?.getAttribute('onerror')).toBeNull();
    expect((globalThis as Record<string, unknown>)['pwned']).toBeUndefined();
  });
});

describe('ticking a task in the preview', () => {
  test('ticks the task in the markdown behind it, and saves it', async () => {
    const { canvas, bridge } = await boardShowing('- [ ] one\n- [ ] two');

    tasks(canvas)[1]?.click();
    await tick();

    expect(tasks(canvas).map((box) => box.checked)).toEqual([false, true]);
    await canvas.handle.flush();
    expect(storedNote(bridge)?.text).toBe('- [ ] one\n- [x] two');
  });

  test('unticks one that is already ticked', async () => {
    const { canvas, bridge } = await boardShowing('- [x] done');

    tasks(canvas)[0]?.click();
    await tick();

    await canvas.handle.flush();
    expect(storedNote(bridge)?.text).toBe('- [ ] done');
  });

  test('is one undo step, and undo puts the tick back where it was', async () => {
    const { canvas } = await boardShowing('- [ ] one\n- [ ] two');

    tasks(canvas)[0]?.click();
    await tick();
    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();

    expect(tasks(canvas).map((box) => box.checked)).toEqual([false, false]);
  });

  test('does not open the source or move the note', async () => {
    const { canvas } = await boardShowing('- [ ] one');
    const before = rectOf(canvas.note());

    tasks(canvas)[0]?.click();
    await tick();

    expect(canvas.editor()).toBeNull();
    expect(rectOf(canvas.note())).toEqual(before);
  });
});

describe('the note palette', () => {
  test('is only on the board while the note is selected', async () => {
    const { canvas } = await boardShowing('pick me');
    expect(canvas.note().querySelector('.note__bar')).toBeNull();

    await selectNote(canvas);
    expect(canvas.note().querySelectorAll('.note__swatch')).toHaveLength(6);

    await clickAt(canvas.surface, onSurface(50, 50));
    expect(canvas.note().querySelector('.note__bar')).toBeNull();
  });

  test('a swatch paints the note, and the colour is saved', async () => {
    const { canvas, bridge } = await boardShowing('paint me');
    await selectNote(canvas);

    await click(canvas.button('Colour mint'));

    expect(canvas.note().classList.contains('note--mint')).toBe(true);
    await canvas.handle.flush();
    expect(storedNote(bridge)?.color).toBe('mint');
  });

  test('C cycles the selected note to the next paper', async () => {
    const { canvas, bridge } = await boardShowing('cycle me');
    await selectNote(canvas);

    pressKey('keydown', { key: 'c' });
    await tick();

    const next = nextNoteColor(DEFAULT_NOTE_COLOR);
    expect(canvas.note().classList.contains(`note--${next}`)).toBe(true);

    pressKey('keydown', { key: 'c' });
    await tick();
    await canvas.handle.flush();
    expect(storedNote(bridge)?.color).toBe(nextNoteColor(next));
  });

  test('C does nothing at all while no note is selected', async () => {
    const { canvas } = await boardShowing('leave me');

    pressKey('keydown', { key: 'c' });
    await tick();

    expect(canvas.note().classList.contains(`note--${DEFAULT_NOTE_COLOR}`)).toBe(true);
  });

  test('a C typed into a note is a letter, not a colour change', async () => {
    const { canvas } = await boardShowing('type in me');
    await doubleClick(canvas.note(), onSurface(500, 400));
    const editor = canvas.editor();
    if (!editor) throw new Error('The note did not open for editing.');

    editor.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'c' }));
    await tick();

    expect(canvas.note().classList.contains(`note--${DEFAULT_NOTE_COLOR}`)).toBe(true);
  });

  test('undo takes a colour back', async () => {
    const { canvas } = await boardShowing('undo me');
    await selectNote(canvas);
    await click(canvas.button('Colour rose'));

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();

    expect(canvas.note().classList.contains(`note--${DEFAULT_NOTE_COLOR}`)).toBe(true);
  });

  test('the delete button still lives in the bar', async () => {
    const { canvas } = await boardShowing('delete me');
    await selectNote(canvas);

    await click(canvas.button('Delete note'));

    expect(canvas.notes()).toHaveLength(0);
  });
});

/** Opens the source of the note on the board and hands back its editor. */
async function openSource(canvas: Harness): Promise<HTMLTextAreaElement> {
  await selectNote(canvas);
  await click(canvas.button('Edit the markdown'));
  const editor = canvas.editor();
  if (!editor) throw new Error('The note did not open its source.');
  return editor;
}

/** Selects a run of the editor's text, the way dragging across it would. */
function selectIn(editor: HTMLTextAreaElement, text: string): void {
  const start = editor.value.indexOf(text);
  if (start === -1) throw new Error(`Not in the editor: ${text}`);
  editor.focus();
  editor.setSelectionRange(start, start + text.length);
}

/** The editor as the user left it: what it holds, and what is selected in it. */
function sourceNow(canvas: Harness): { text: string; selected: string } {
  const editor = canvas.editor();
  if (!editor) throw new Error('The editor is not open.');
  return {
    text: editor.value,
    selected: editor.value.slice(editor.selectionStart, editor.selectionEnd),
  };
}

function formatBar(canvas: Harness): HTMLElement | null {
  return canvas.note().querySelector<HTMLElement>('[aria-label="Formatting"]');
}

describe('the format bar', () => {
  test('is above the note only while its source is open', async () => {
    const { canvas } = await boardShowing('plain');
    await selectNote(canvas);
    expect(formatBar(canvas)).toBeNull();

    await click(canvas.button('Edit the markdown'));
    expect(formatBar(canvas)).not.toBeNull();

    await click(canvas.button('Show the rendered note'));
    expect(formatBar(canvas)).toBeNull();
  });

  test('is scaled against the zoom, so more buttons stay the same size on screen', async () => {
    const { canvas } = await boardShowing('zoom me');
    await openSource(canvas);

    const chrome = canvas.note().querySelector<HTMLElement>('.note__chrome');
    expect(chrome?.contains(formatBar(canvas))).toBe(true);
    expect(chrome?.style.transform).toContain(`scale(${1 / DEFAULT_VIEWPORT.zoom})`);
  });

  test('bold wraps the selection and leaves the user on it, still typing', async () => {
    const { canvas } = await boardShowing('make this loud');
    const editor = await openSource(canvas);
    selectIn(editor, 'this');

    await click(canvas.button('Bold'));

    expect(sourceNow(canvas)).toEqual({ text: 'make **this** loud', selected: 'this' });
    expect(document.activeElement).toBe(canvas.editor());
  });

  test('the same button again takes the markers back off', async () => {
    const { canvas } = await boardShowing('make this loud');
    const editor = await openSource(canvas);
    selectIn(editor, 'this');

    await click(canvas.button('Bold'));
    await click(canvas.button('Bold'));

    expect(sourceNow(canvas)).toEqual({ text: 'make this loud', selected: 'this' });
  });

  test('a task list button writes markdown the rendered note ticks, and saves it', async () => {
    const { canvas, bridge } = await boardShowing('ship it');
    const editor = await openSource(canvas);
    selectIn(editor, 'ship it');

    await click(canvas.button('Task list'));
    expect(sourceNow(canvas).text).toBe('- [ ] ship it');

    await click(canvas.button('Show the rendered note'));
    expect(tasks(canvas)).toHaveLength(1);
    await canvas.handle.flush();
    expect(storedNote(bridge)?.text).toBe('- [ ] ship it');
  });

  test('link writes the whole shape out and selects what is left to fill in', async () => {
    const { canvas } = await boardShowing('read the docs');
    const editor = await openSource(canvas);
    selectIn(editor, 'the docs');

    await click(canvas.button('Link'));

    expect(sourceNow(canvas)).toEqual({ text: 'read [the docs](url)', selected: 'url' });
  });

  test('heading works off the caret alone, with nothing selected', async () => {
    const { canvas } = await boardShowing('Plan');
    const editor = await openSource(canvas);
    editor.setSelectionRange(2, 2);

    await click(canvas.button('Heading'));

    expect(sourceNow(canvas).text).toBe('# Plan');
  });

  test('each press is one undo step, taken back on its own', async () => {
    const { canvas } = await boardShowing('one');
    const editor = await openSource(canvas);
    selectIn(editor, 'one');

    await click(canvas.button('Bold'));
    await click(canvas.button('Heading'));
    expect(sourceNow(canvas).text).toBe('# **one**');
    await click(canvas.button('Show the rendered note'));

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    expect(canvas.note().querySelector('h1')).toBeNull();
    expect(canvas.note().querySelector('strong')?.textContent).toBe('one');

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    expect(canvas.note().querySelector('strong')).toBeNull();
    expect(canvas.note().textContent).toContain('one');
  });

  test('a press never folds into the typing burst around it', async () => {
    const { canvas } = await boardShowing('');
    const editor = await openSource(canvas);
    await typeInto(editor, 'plan');
    selectIn(editor, 'plan');

    await click(canvas.button('Heading'));
    await click(canvas.button('Show the rendered note'));

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();

    // The heading came off; the word it was made from is still typed.
    expect(canvas.note().querySelector('h1')).toBeNull();
    expect(canvas.note().textContent).toContain('plan');
  });
});

/** Drags on the board itself, the way a drawing tool is used. */
async function drawOn(
  canvas: Harness,
  from: { clientX: number; clientY: number },
  to: { clientX: number; clientY: number },
  steps = 4,
): Promise<void> {
  await dragFrom(canvas.surface, from, to, steps);
}

function storedStrokes(bridge: FakeBridge): StrokeItem[] {
  return storedItems(bridge).filter((item): item is StrokeItem => item.type === 'stroke');
}

function storedShapes(bridge: FakeBridge): ShapeItem[] {
  return storedItems(bridge).filter((item): item is ShapeItem => item.type === 'shape');
}

function storedLabels(bridge: FakeBridge): TextItem[] {
  return storedItems(bridge).filter((item): item is TextItem => item.type === 'text');
}

describe('drawing with the pen', () => {
  test('leaves ink on the board and keeps it', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);

    await click(canvas.button('Pen'));
    await drawOn(canvas, onSurface(100, 100), onSurface(300, 220));

    expect(canvas.ink()).toHaveLength(1);
    await canvas.handle.flush();
    const [stroke] = storedStrokes(bridge);
    expect(stroke?.points.length).toBeGreaterThan(1);
    expect(stroke?.points[0]).toEqual([100, 100]);
    expect(stroke?.points.at(-1)).toEqual([300, 220]);
  });

  test('draws in the ink chosen for it', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);

    await click(canvas.button('Pen'));
    await click(canvas.button('Ink coral'));
    await click(canvas.button('bold stroke'));
    await drawOn(canvas, onSurface(100, 100), onSurface(200, 100));

    await canvas.handle.flush();
    expect(storedStrokes(bridge)[0]).toMatchObject({ color: 'coral', size: 'bold' });
  });

  test('is one undo, however many samples the drag made', async () => {
    const canvas = await mount(createFakeBridge());
    await click(canvas.button('Pen'));
    await drawOn(canvas, onSurface(100, 100), onSurface(300, 220), 8);
    expect(canvas.ink()).toHaveLength(1);

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    expect(canvas.ink()).toHaveLength(0);

    pressKey('keydown', { key: 'z', metaKey: true, shiftKey: true });
    await tick();
    expect(canvas.ink()).toHaveLength(1);
  });

  test('is still there after the board is reopened', async () => {
    const bridge = createFakeBridge();
    const first = await mount(bridge);
    await click(first.button('Pen'));
    await drawOn(first, onSurface(100, 100), onSurface(260, 180));
    await first.handle.flush();
    first.handle.unmount();

    const reopened = await mount(bridge);
    expect(reopened.ink()).toHaveLength(1);
  });

  test('puts ink where the board is, not where the screen is', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);
    // Scroll the board 120 right and 80 down, then zoom in on the corner.
    await scroll(canvas.surface, { deltaX: 120, deltaY: 80, ...onSurface(500, 400) });
    await click(canvas.button('Zoom in'));
    const viewport = canvas.viewport();

    await click(canvas.button('Pen'));
    await drawOn(canvas, onSurface(200, 300), onSurface(400, 300));

    await canvas.handle.flush();
    const points = storedStrokes(bridge)[0]?.points ?? [];
    // The first sample is the board point that was under the pointer.
    const expected = surfaceToWorld(viewport, { x: 200, y: 300 });
    expect(points[0]?.[0]).toBeCloseTo(expected.x, 1);
    expect(points[0]?.[1]).toBeCloseTo(expected.y, 1);
  });

  test('draws over a note instead of dragging it', async () => {
    const { canvas, bridge } = await boardShowing('do not move me');
    const before = storedNote(bridge);

    await click(canvas.button('Pen'));
    await drawOn(canvas, onSurface(520, 420), onSurface(600, 470));

    expect(canvas.ink()).toHaveLength(1);
    await canvas.handle.flush();
    expect(storedNote(bridge)).toMatchObject({ x: before?.x, y: before?.y });
  });
});

describe('drawing a shape', () => {
  test('puts a hand-drawn rectangle where it was dragged', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);

    await click(canvas.button('Rect'));
    await drawOn(canvas, onSurface(120, 140), onSurface(320, 260));

    expect(canvas.ink().length).toBeGreaterThan(0);
    await canvas.handle.flush();
    expect(storedShapes(bridge)[0]).toMatchObject({
      shape: 'rectangle',
      a: { x: 120, y: 140 },
      b: { x: 320, y: 260 },
    });
  });

  test('draws an ellipse, a line and an arrow the same way', async () => {
    for (const [label, kind] of [
      ['Ellipse', 'ellipse'],
      ['Line', 'line'],
      ['Arrow', 'arrow'],
    ] as const) {
      const bridge = createFakeBridge();
      const canvas = await mount(bridge);
      await click(canvas.button(label));
      await drawOn(canvas, onSurface(100, 100), onSurface(240, 200));
      await canvas.handle.flush();
      expect(storedShapes(bridge)[0]?.shape).toBe(kind);
    }
  });

  test('keeps its sketch still while the board is panned', async () => {
    const canvas = await mount(createFakeBridge());
    await click(canvas.button('Rect'));
    await drawOn(canvas, onSurface(120, 140), onSurface(320, 260));
    const before = canvas.ink().map((path) => path.getAttribute('d'));

    await scroll(canvas.surface, { deltaX: 40, deltaY: 30, ...onSurface(500, 400) });

    expect(canvas.ink().map((path) => path.getAttribute('d'))).toEqual(before);
  });

  test('needs a drag: a click leaves nothing behind', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);

    await click(canvas.button('Rect'));
    await clickAt(canvas.surface, onSurface(200, 200));

    expect(canvas.ink()).toHaveLength(0);
    await canvas.handle.flush();
    expect(storedShapes(bridge)).toHaveLength(0);
  });
});

describe('writing a label on the board', () => {
  test('places one where it was clicked and keeps what was typed', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);

    await click(canvas.button('Text'));
    await clickAt(canvas.surface, onSurface(300, 200));
    const editor = canvas.labelEditor();
    if (!editor) throw new Error('The label did not open for typing.');
    await typeInto(editor, 'north star');
    pressEscape(editor);
    await tick();

    expect(canvas.labels()).toHaveLength(1);
    expect(canvas.labels()[0]?.textContent).toBe('north star');
    await canvas.handle.flush();
    expect(storedLabels(bridge)[0]).toMatchObject({ text: 'north star', x: 300 });
  });

  test('hands the pointer back to Select, so the next click is not another label', async () => {
    const canvas = await mount(createFakeBridge());

    await click(canvas.button('Text'));
    await clickAt(canvas.surface, onSurface(300, 200));
    const editor = canvas.labelEditor();
    if (!editor) throw new Error('The label did not open for typing.');
    await typeInto(editor, 'one');
    pressEscape(editor);
    await tick();

    await clickAt(canvas.surface, onSurface(600, 500));
    expect(canvas.labels()).toHaveLength(1);
  });

  test('leaves nothing behind when nothing was written', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);

    await click(canvas.button('Text'));
    await clickAt(canvas.surface, onSurface(300, 200));
    const editor = canvas.labelEditor();
    if (!editor) throw new Error('The label did not open for typing.');
    pressEscape(editor);
    await tick();

    expect(canvas.labels()).toHaveLength(0);
    await canvas.handle.flush();
    expect(storedItems(bridge)).toHaveLength(0);
  });

  test('opens again for editing on a double-click', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);
    await click(canvas.button('Text'));
    await clickAt(canvas.surface, onSurface(300, 200));
    const first = canvas.labelEditor();
    if (!first) throw new Error('The label did not open for typing.');
    await typeInto(first, 'draft');
    pressEscape(first);
    await tick();

    const label = canvas.labels()[0];
    if (!label) throw new Error('The label is not on the board.');
    await doubleClick(label, onSurface(310, 210));
    const again = canvas.labelEditor();
    if (!again) throw new Error('The label did not reopen.');
    await typeInto(again, 'final');
    pressEscape(again);
    await tick();

    await canvas.handle.flush();
    expect(storedLabels(bridge)[0]?.text).toBe('final');
  });
});

describe('the eraser', () => {
  /** A board with one stroke straight across the middle of the view. */
  function boardWithInk(): FakeBridge {
    const stroke = createStroke(
      [
        [200, 400],
        [700, 400],
      ],
      'chalk',
      'medium',
      'k1',
    );
    return createFakeBridge({ [KEY]: { ...createBoard(), items: [stroke] } });
  }

  test('takes the ink it is swept across', async () => {
    const bridge = boardWithInk();
    const canvas = await mount(bridge);
    expect(canvas.ink()).toHaveLength(1);

    await click(canvas.button('Eraser'));
    await drawOn(canvas, onSurface(450, 340), onSurface(450, 460));

    expect(canvas.ink()).toHaveLength(0);
    await canvas.handle.flush();
    expect(storedStrokes(bridge)).toHaveLength(0);
  });

  test('leaves ink it never went near', async () => {
    const canvas = await mount(boardWithInk());

    await click(canvas.button('Eraser'));
    await drawOn(canvas, onSurface(100, 100), onSurface(160, 160));

    expect(canvas.ink()).toHaveLength(1);
  });

  test('gives a whole sweep back in one undo', async () => {
    const canvas = await mount(boardWithInk());
    await click(canvas.button('Eraser'));
    await drawOn(canvas, onSurface(250, 380), onSurface(650, 420), 12);
    expect(canvas.ink()).toHaveLength(0);

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();

    expect(canvas.ink()).toHaveLength(1);
  });

  test('takes shapes and labels too', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);
    await click(canvas.button('Line'));
    await drawOn(canvas, onSurface(200, 300), onSurface(600, 300));
    await click(canvas.button('Text'));
    await clickAt(canvas.surface, onSurface(300, 500));
    const editor = canvas.labelEditor();
    if (!editor) throw new Error('The label did not open for typing.');
    await typeInto(editor, 'gone');
    pressEscape(editor);
    await tick();

    await click(canvas.button('Eraser'));
    await drawOn(canvas, onSurface(400, 290), onSurface(400, 310));
    await drawOn(canvas, onSurface(305, 505), onSurface(315, 510));

    await canvas.handle.flush();
    expect(storedItems(bridge)).toHaveLength(0);
  });

  test('never takes a note: those have their own ✕ and Delete', async () => {
    const { canvas, bridge } = await boardShowing('safe from the eraser');

    await click(canvas.button('Eraser'));
    await drawOn(canvas, onSurface(520, 420), onSurface(640, 500));

    expect(canvas.notes()).toHaveLength(1);
    await canvas.handle.flush();
    expect(storedNotes(bridge)).toHaveLength(1);
  });
});

describe('the tool bar', () => {
  test('shows the ink row only for the tools that draw', async () => {
    const canvas = await mount(createFakeBridge());
    const swatches = () => canvas.surface.querySelectorAll('.toolbar__swatch');
    expect(swatches()).toHaveLength(0);

    await click(canvas.button('Pen'));
    expect(swatches()).toHaveLength(6);

    await click(canvas.button('Eraser'));
    expect(swatches()).toHaveLength(0);
  });

  test('says which tool is in hand', async () => {
    const canvas = await mount(createFakeBridge());
    expect(canvas.button('Select').getAttribute('aria-pressed')).toBe('true');

    await click(canvas.button('Arrow'));
    expect(canvas.button('Arrow').getAttribute('aria-pressed')).toBe('true');
    expect(canvas.button('Select').getAttribute('aria-pressed')).toBe('false');
  });

  test('still writes a note in the middle of the view', async () => {
    const canvas = await mount(createFakeBridge());
    await click(canvas.button('Add note'));
    expect(canvas.notes()).toHaveLength(1);
  });

  test('leaves a drawing tool out until it is put away', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);
    await click(canvas.button('Pen'));
    await drawOn(canvas, onSurface(100, 100), onSurface(200, 150));
    await drawOn(canvas, onSurface(300, 100), onSurface(400, 150));

    await canvas.handle.flush();
    expect(storedStrokes(bridge)).toHaveLength(2);
  });
});

/**
 * A board with one of everything, spread out so nothing overlaps: a note on
 * the left, a stroke top right, a rectangle under it and a label below that.
 */
function boardWithOneOfEach(): FakeBridge {
  const note = createNote({ x: 300, y: 200 }, 'n1');
  const stroke = createStroke(
    [
      [500, 150],
      [700, 150],
    ],
    'chalk',
    'medium',
    'k1',
  );
  const shape = createShape('rectangle', { x: 500, y: 300 }, { x: 700, y: 400 }, 'coral', 'medium', 's1', 7);
  const label = { ...createLabel({ x: 500, y: 500 }, 'azure', 'medium', 'l1'), text: 'tag' };
  return createFakeBridge({ [KEY]: { ...createBoard(), items: [note, stroke, shape, label] } });
}

function storedIds(bridge: FakeBridge): string[] {
  return storedItems(bridge).map((item) => item.id);
}

describe('selecting a drawing', () => {
  test('a click picks up a stroke, and a click on empty board puts it down', async () => {
    const canvas = await mount(boardWithOneOfEach());
    expect(canvas.selectionBoxes()).toHaveLength(0);

    await clickAt(canvas.surface, onSurface(600, 152));
    expect(canvas.selectionBoxes()).toHaveLength(1);
    expect(canvas.selectedCount()).toBe(1);

    await clickAt(canvas.surface, onSurface(100, 700));
    expect(canvas.selectionBoxes()).toHaveLength(0);
  });

  test('a drag moves the stroke, and one undo takes the whole drag back', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);

    await dragFrom(canvas.surface, onSurface(600, 150), onSurface(650, 200), 5);
    await canvas.handle.flush();
    expect(storedStrokes(bridge)[0]?.points).toEqual([
      [550, 200],
      [750, 200],
    ]);
    expect(canvas.selectionBoxes()).toHaveLength(1);

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    await canvas.handle.flush();
    expect(storedStrokes(bridge)[0]?.points).toEqual([
      [500, 150],
      [700, 150],
    ]);
  });

  test('a shape is picked up by its outline and moved by both corners', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);

    // The middle of the rectangle is empty board; its top edge is the shape.
    await clickAt(canvas.surface, onSurface(600, 350));
    expect(canvas.selectionBoxes()).toHaveLength(0);

    await dragFrom(canvas.surface, onSurface(600, 300), onSurface(630, 330));
    await canvas.handle.flush();
    expect(storedShapes(bridge)[0]).toMatchObject({ a: { x: 530, y: 330 }, b: { x: 730, y: 430 } });
  });

  test('a label is picked up and moved by the pointer too', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);
    const label = canvas.labels()[0];
    if (!label) throw new Error('The label is not on the board.');

    await clickAt(label, onSurface(510, 510));
    expect(label.classList.contains('label--selected')).toBe(true);

    await dragFrom(label, onSurface(510, 510), onSurface(540, 540));
    await canvas.handle.flush();
    expect(storedLabels(bridge)[0]).toMatchObject({ x: 530, y: 530 });
  });

  test('delete takes the selected drawing off the board, and undo brings it back', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);

    await clickAt(canvas.surface, onSurface(600, 150));
    pressKey('keydown', { key: 'Backspace' });
    await tick();
    await canvas.handle.flush();
    expect(storedIds(bridge)).toEqual(['n1', 's1', 'l1']);
    expect(canvas.ink().some((path) => path.classList.contains('ink__stroke'))).toBe(false);

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    await canvas.handle.flush();
    expect(storedIds(bridge)).toEqual(['n1', 'k1', 's1', 'l1']);
  });

  test('is still a click on a stroke once the board is zoomed and panned', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);
    await scroll(canvas.surface, { deltaX: 100, deltaY: 50, ...onSurface(500, 400) });
    await click(canvas.button('Zoom in'));
    const viewport = canvas.viewport();
    const onScreen = worldToSurface(viewport, { x: 600, y: 150 });

    await clickAt(canvas.surface, onSurface(onScreen.x, onScreen.y));

    expect(canvas.selectionBoxes()).toHaveLength(1);
  });
});

describe('a selection of several', () => {
  test('shift-click adds an item, and shift-click again takes it away', async () => {
    const canvas = await mount(boardWithOneOfEach());

    await clickAt(canvas.note(), onSurface(300, 200));
    await clickAt(canvas.surface, onSurface(600, 150), { shiftKey: true });
    expect(canvas.selectedCount()).toBe(2);

    await clickAt(canvas.note(), onSurface(300, 200), { shiftKey: true });
    expect(canvas.selectedCount()).toBe(1);
    expect(canvas.note().classList.contains('note--selected')).toBe(false);
  });

  test('dragging a note carries the stroke selected with it', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);
    await clickAt(canvas.surface, onSurface(600, 150));
    await clickAt(canvas.note(), onSurface(300, 200), { shiftKey: true });

    await dragFrom(canvas.note(), onSurface(300, 200), onSurface(330, 230));

    await canvas.handle.flush();
    expect(storedNotes(bridge)[0]).toMatchObject({ x: 196 + 30, y: 120 + 30 });
    expect(storedStrokes(bridge)[0]?.points).toEqual([
      [530, 180],
      [730, 180],
    ]);
  });

  test('a marquee takes what it surrounds, not what it merely crosses', async () => {
    const canvas = await mount(boardWithOneOfEach());

    await dragFrom(canvas.surface, onSurface(150, 80), onSurface(750, 300));
    expect(canvas.selectedCount()).toBe(2);
    expect(canvas.note().classList.contains('note--selected')).toBe(true);
    expect(canvas.selectionBoxes()).toHaveLength(1);
    expect(canvas.marquee()).toBeNull();

    await dragFrom(canvas.surface, onSurface(150, 80), onSurface(300, 300));
    expect(canvas.selectedCount()).toBe(0);
  });

  test('shows the marquee while it is being dragged', async () => {
    const canvas = await mount(boardWithOneOfEach());
    canvas.surface.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 3, button: 0, ...onSurface(150, 80) }),
    );
    canvas.surface.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 3, ...onSurface(450, 380) }),
    );
    await tick();

    const box = canvas.marquee();
    expect(box).not.toBeNull();
    expect(box?.style.left).toBe('150px');
    expect(box?.style.width).toBe('300px');
    expect(box?.style.height).toBe('300px');

    canvas.surface.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 3, ...onSurface(450, 380) }),
    );
    await tick();
    expect(canvas.marquee()).toBeNull();
  });

  test('shift and a marquee add to what was already selected', async () => {
    const canvas = await mount(boardWithOneOfEach());
    const label = canvas.labels()[0];
    if (!label) throw new Error('The label is not on the board.');
    await clickAt(label, onSurface(510, 510));

    await dragFrom(canvas.surface, onSurface(150, 80), onSurface(750, 300), 3, { shiftKey: true });

    expect(canvas.selectedCount()).toBe(3);
    expect(label.classList.contains('label--selected')).toBe(true);
  });

  test('a group drag from a stroke moves the note with it', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);
    await dragFrom(canvas.surface, onSurface(150, 80), onSurface(750, 300));

    await dragFrom(canvas.surface, onSurface(600, 150), onSurface(630, 180));

    await canvas.handle.flush();
    expect(storedNotes(bridge)[0]).toMatchObject({ x: 196 + 30, y: 120 + 30 });
    expect(storedStrokes(bridge)[0]?.points[0]).toEqual([530, 180]);
  });

  test('delete clears the whole selection, and one undo brings it all back', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);
    await dragFrom(canvas.surface, onSurface(150, 80), onSurface(750, 300));

    pressKey('keydown', { key: 'Delete' });
    await tick();
    await canvas.handle.flush();
    expect(storedIds(bridge)).toEqual(['s1', 'l1']);
    expect(canvas.notes()).toHaveLength(0);

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    await canvas.handle.flush();
    expect(storedIds(bridge)).toEqual(['n1', 'k1', 's1', 'l1']);
    // Back, and selected again, so a wrong Delete is one keystroke from undone.
    expect(canvas.selectedCount()).toBe(2);
  });

  test('a click on one of the selected narrows the selection to it', async () => {
    const canvas = await mount(boardWithOneOfEach());
    await dragFrom(canvas.surface, onSurface(150, 80), onSurface(750, 300));
    expect(canvas.selectedCount()).toBe(2);

    await clickAt(canvas.surface, onSurface(600, 150));
    expect(canvas.selectedCount()).toBe(1);
    expect(canvas.selectionBoxes()).toHaveLength(1);

    await clickAt(canvas.note(), onSurface(300, 200), { shiftKey: true });
    await clickAt(canvas.note(), onSurface(300, 200));
    expect(canvas.selectedCount()).toBe(1);
    expect(canvas.note().classList.contains('note--selected')).toBe(true);
  });

  test('a press that only twitches is still a click, and moves nothing', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);
    await dragFrom(canvas.surface, onSurface(150, 80), onSurface(750, 300));
    expect(canvas.selectedCount()).toBe(2);

    await dragFrom(canvas.surface, onSurface(600, 150), onSurface(601, 151), 1);
    expect(canvas.selectedCount()).toBe(1);
    expect(canvas.selectionBoxes()).toHaveLength(1);

    await clickAt(canvas.note(), onSurface(300, 200), { shiftKey: true });
    await dragFrom(canvas.note(), onSurface(300, 200), onSurface(301, 201), 1);
    expect(canvas.selectedCount()).toBe(1);
    await canvas.handle.flush();
    expect(storedNotes(bridge)[0]).toMatchObject({ x: 196, y: 120 });
    expect(storedStrokes(bridge)[0]?.points[0]).toEqual([500, 150]);
  });

  test('a cancelled press is neither a click nor a drag', async () => {
    const canvas = await mount(boardWithOneOfEach());
    await dragFrom(canvas.surface, onSurface(150, 80), onSurface(750, 300));
    expect(canvas.selectedCount()).toBe(2);

    for (const point of [onSurface(600, 150), onSurface(100, 700)]) {
      canvas.surface.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 4, button: 0, ...point }),
      );
      canvas.surface.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 4, ...point }));
      await tick();
      expect(canvas.selectedCount()).toBe(2);
    }
  });

  test('cmd-A selects everything, and the group deletes and comes back as one', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);

    pressKey('keydown', { key: 'a', metaKey: true });
    await tick();
    expect(canvas.selectedCount()).toBe(4);
    expect(canvas.selectionBoxes()).toHaveLength(2);

    pressKey('keydown', { key: 'Delete' });
    await tick();
    await canvas.handle.flush();
    expect(storedIds(bridge)).toEqual([]);

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    await canvas.handle.flush();
    expect(storedIds(bridge)).toEqual(['n1', 'k1', 's1', 'l1']);
    expect(canvas.selectedCount()).toBe(4);
  });

  test('ink drawn across a note is picked up where it crosses the note', async () => {
    const note = createNote({ x: 300, y: 200 }, 'n1');
    const over = createStroke(
      [
        [200, 200],
        [400, 200],
      ],
      'coral',
      'medium',
      'k2',
    );
    const bridge = createFakeBridge({ [KEY]: { ...createBoard(), items: [note, over] } });
    const canvas = await mount(bridge);

    // The press lands on the note's paper, but the stroke is painted on top.
    await dragFrom(canvas.note(), onSurface(300, 200), onSurface(330, 230));
    expect(canvas.selectionBoxes()).toHaveLength(1);
    expect(canvas.note().classList.contains('note--selected')).toBe(false);
    await canvas.handle.flush();
    expect(storedStrokes(bridge)[0]?.points[0]).toEqual([230, 230]);
    expect(storedNotes(bridge)[0]).toMatchObject({ x: 196, y: 120 });

    // Away from the ink, the note is the note.
    await clickAt(canvas.note(), onSurface(300, 260));
    expect(canvas.note().classList.contains('note--selected')).toBe(true);
    expect(canvas.selectionBoxes()).toHaveLength(0);
  });
});

describe('the keyboard, the Excalidraw way', () => {
  function pressed(canvas: Harness, label: string): boolean {
    return canvas.button(label).getAttribute('aria-pressed') === 'true';
  }

  test('a letter or a digit picks a tool', async () => {
    const canvas = await mount(createFakeBridge());
    for (const [key, label] of [
      ['p', 'Pen'],
      ['2', 'Rect'],
      ['o', 'Ellipse'],
      ['6', 'Line'],
      ['a', 'Arrow'],
      ['t', 'Text'],
      ['e', 'Eraser'],
      ['v', 'Select'],
      ['7', 'Pen'],
      ['1', 'Select'],
    ] as const) {
      pressKey('keydown', { key });
      await tick();
      expect(pressed(canvas, label), `${key} should pick ${label}`).toBe(true);
    }
  });

  test('tells you the key on each tool button', async () => {
    const canvas = await mount(createFakeBridge());
    expect(canvas.button('Pen').title).toContain('P');
    expect(canvas.button('Select').title).toContain('V');
  });

  test('a letter typed into a note is typing, not a tool', async () => {
    const canvas = await mount(createFakeBridge());
    await doubleClick(canvas.surface, onSurface(300, 200));
    const editor = canvas.editor();
    if (!editor) throw new Error('The note did not open for typing.');

    editor.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'p' }));
    await tick();

    expect(pressed(canvas, 'Select')).toBe(true);
    expect(canvas.editor()).not.toBeNull();
  });

  test('picking a drawing tool lets go of the selection, and Escape comes back to Select', async () => {
    const canvas = await mount(boardWithOneOfEach());
    await clickAt(canvas.surface, onSurface(600, 150));
    expect(canvas.selectedCount()).toBe(1);

    pressKey('keydown', { key: 'p' });
    await tick();
    expect(pressed(canvas, 'Pen')).toBe(true);
    expect(canvas.selectedCount()).toBe(0);

    await click(canvas.button('Select'));
    await clickAt(canvas.surface, onSurface(600, 150));
    pressKey('keydown', { key: 'Escape' });
    await tick();

    expect(pressed(canvas, 'Select')).toBe(true);
    expect(canvas.selectedCount()).toBe(0);
  });

  test('shift-C still cycles the colour, the way C does', async () => {
    const canvas = await mount(boardWithOneOfEach());
    await clickAt(canvas.note(), onSurface(300, 200));

    pressKey('keydown', { key: 'C', shiftKey: true });
    await tick();

    expect(canvas.note().classList.contains('note--apricot')).toBe(true);
  });

  test('the arrow keys nudge the selection, faster with shift, and a held key is one undo', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);
    await clickAt(canvas.surface, onSurface(600, 150));

    pressKey('keydown', { key: 'ArrowRight' });
    pressKey('keydown', { key: 'ArrowRight', repeat: true });
    pressKey('keydown', { key: 'ArrowDown', shiftKey: true });
    await tick();
    await canvas.handle.flush();
    expect(storedStrokes(bridge)[0]?.points[0]).toEqual([502, 155]);

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    await canvas.handle.flush();
    expect(storedStrokes(bridge)[0]?.points[0]).toEqual([502, 150]);

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    await canvas.handle.flush();
    expect(storedStrokes(bridge)[0]?.points[0]).toEqual([500, 150]);
  });

  test('undo, redo, delete and zoom to fit still answer their keys', async () => {
    const bridge = boardWithOneOfEach();
    const canvas = await mount(bridge);
    await clickAt(canvas.surface, onSurface(600, 150));

    pressKey('keydown', { key: 'Delete' });
    await tick();
    expect(canvas.selectionBoxes()).toHaveLength(0);
    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    expect(canvas.ink().some((path) => path.classList.contains('ink__stroke'))).toBe(true);
    pressKey('keydown', { key: 'z', metaKey: true, shiftKey: true });
    await tick();
    expect(canvas.ink().some((path) => path.classList.contains('ink__stroke'))).toBe(false);

    pressKey('keydown', { key: '!', shiftKey: true });
    await tick();
    expect(canvas.viewport()).not.toEqual(DEFAULT_VIEWPORT);
  });
});

describe('settings, fonts and backgrounds', () => {
  const IMAGE = 'data:image/webp;base64,c2hydW5r';
  const BACKGROUND_KEY = 'background:default';

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap;
  });

  /** A browser that can decode and redraw a picture, which jsdom cannot. */
  function fakePictureDecoding(width = 4000, height = 2000): { drawImage: ReturnType<typeof vi.fn> } {
    (globalThis as { createImageBitmap?: unknown }).createImageBitmap = vi.fn(async () => ({
      width,
      height,
      close: vi.fn(),
    }));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(IMAGE);
    return { drawImage };
  }

  const png = (): File => new File(['png'], 'mood.png', { type: 'image/png' });

  const panel = (canvas: Harness): HTMLElement | null => canvas.surface.querySelector('.settings');
  const backdrop = (canvas: Harness): HTMLImageElement | null =>
    canvas.surface.querySelector<HTMLImageElement>('[data-testid="canvas-backdrop"]');
  const defaultFont = (canvas: Harness): string => canvas.surface.style.getPropertyValue('--text-font');

  function fontChoice(canvas: Harness, label: string): HTMLButtonElement {
    const found = Array.from(
      canvas.surface.querySelectorAll<HTMLButtonElement>('.settings__font'),
    ).find((button) => button.querySelector('.settings__font-name')?.textContent === label);
    if (!found) throw new Error(`No font called ${label} in the panel.`);
    return found;
  }

  function noteFontChoice(canvas: Harness, label: string): HTMLButtonElement {
    const found = Array.from(
      canvas.surface.querySelectorAll<HTMLButtonElement>('.note__menuitem'),
    ).find((button) => button.textContent?.trim() === label);
    if (!found) throw new Error(`No font called ${label} in the note's menu.`);
    return found;
  }

  function slider(canvas: Harness, label: string): HTMLInputElement {
    const found = canvas.surface.querySelector<HTMLInputElement>(`input[type="range"][aria-label="${label}"]`);
    if (!found) throw new Error(`No ${label} slider.`);
    return found;
  }

  async function slide(input: HTMLInputElement, value: number): Promise<void> {
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
  }

  async function openSettings(canvas: Harness): Promise<void> {
    await click(canvas.button('Settings'));
  }

  async function pickFile(canvas: Harness, file: File): Promise<void> {
    const input = canvas.surface.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('No file picker in the panel.');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    await tick();
  }

  async function dropFile(canvas: Harness, file: File): Promise<void> {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [file], types: ['Files'] } });
    canvas.surface.dispatchEvent(event);
    await tick();
    await tick();
  }

  async function selectNote(canvas: Harness): Promise<void> {
    await clickAt(canvas.note(), onSurface(500, 400));
  }

  function boardWithNote(text = 'hello'): BoardDocument {
    return { ...createBoard(), items: [{ ...createNote({ x: 500, y: 400 }, 'n1'), text }] };
  }

  test('the panel opens from the toolbar and closes on Escape or a click on the board', async () => {
    const canvas = await mount(createFakeBridge());
    expect(panel(canvas)).toBeNull();

    await openSettings(canvas);
    expect(panel(canvas)).not.toBeNull();
    expect(canvas.button('Settings').getAttribute('aria-pressed')).toBe('true');

    pressKey('keydown', { key: 'Escape' });
    await tick();
    expect(panel(canvas)).toBeNull();

    await openSettings(canvas);
    await clickAt(canvas.surface, onSurface(500, 400));
    expect(panel(canvas)).toBeNull();
  });

  test('picking a default font applies it to the board and is saved', async () => {
    const bridge = createFakeBridge({ [KEY]: boardWithNote() });
    const canvas = await mount(bridge);
    expect(defaultFont(canvas)).not.toContain('Caveat');

    await openSettings(canvas);
    await click(fontChoice(canvas, 'Caveat'));

    expect(defaultFont(canvas)).toContain('"Caveat"');
    expect(fontChoice(canvas, 'Caveat').getAttribute('aria-checked')).toBe('true');
    // The note follows the board: no font of its own.
    expect(canvas.note().style.fontFamily).toBe('');
    expect(bridge.read('settings')).toMatchObject({ font: 'caveat' });
    expect(JSON.stringify(bridge.read(KEY))).not.toContain('caveat');
  });

  test('the default font is what reopens', async () => {
    const bridge = createFakeBridge({ settings: { schemaVersion: 1, font: 'lora' } });
    const canvas = await mount(bridge);

    expect(defaultFont(canvas)).toContain('"Lora"');
    await openSettings(canvas);
    expect(fontChoice(canvas, 'Lora').getAttribute('aria-checked')).toBe('true');
  });

  test('the list offers only the fonts that ship: nothing is fetched', async () => {
    const canvas = await mount(createFakeBridge());
    await openSettings(canvas);

    const names = Array.from(canvas.surface.querySelectorAll('.settings__font-name')).map(
      (name) => name.textContent,
    );
    expect(names).toEqual([
      'Caveat',
      'Inter',
      'Lora',
      'JetBrains Mono',
      'System',
      'System serif',
      'System mono',
    ]);
  });

  test('a note picks its own font from its bar, keeps it through a default change, and undo takes it back', async () => {
    const bridge = createFakeBridge({ [KEY]: boardWithNote() });
    const canvas = await mount(bridge);
    await selectNote(canvas);
    expect(canvas.surface.querySelector('.note__menu')).toBeNull();

    await click(canvas.button('Font'));
    expect(canvas.surface.querySelector('.note__menu')).not.toBeNull();
    await click(noteFontChoice(canvas, 'JetBrains Mono'));

    expect(canvas.surface.querySelector('.note__menu')).toBeNull();
    expect(canvas.note().style.fontFamily).toContain('"JetBrains Mono"');
    await canvas.handle.flush();
    expect(storedNotes(bridge)[0]).toMatchObject({ font: 'jetbrains-mono' });

    await openSettings(canvas);
    await click(fontChoice(canvas, 'Lora'));
    expect(defaultFont(canvas)).toContain('"Lora"');
    expect(canvas.note().style.fontFamily).toContain('"JetBrains Mono"');

    pressKey('keydown', { key: 'z', metaKey: true });
    await tick();
    expect(canvas.note().style.fontFamily).toBe('');
    await canvas.handle.flush();
    expect('font' in (storedNotes(bridge)[0] ?? {})).toBe(false);
  });

  test('Default in the note menu hands the note back to the board font', async () => {
    const stored = boardWithNote();
    stored.items = [{ ...(stored.items[0] as NoteItem), font: 'inter' }];
    const bridge = createFakeBridge({ [KEY]: stored });
    const canvas = await mount(bridge);
    expect(canvas.note().style.fontFamily).toContain('"Inter"');

    await selectNote(canvas);
    await click(canvas.button('Font'));
    expect(noteFontChoice(canvas, 'Inter').getAttribute('aria-checked')).toBe('true');
    await click(noteFontChoice(canvas, 'Default'));

    expect(canvas.note().style.fontFamily).toBe('');
    await canvas.handle.flush();
    expect('font' in (storedNotes(bridge)[0] ?? {})).toBe(false);
  });

  test('a picture picked in the panel becomes the board background, shrunk, in its own key', async () => {
    const { drawImage } = fakePictureDecoding(4000, 2000);
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);
    expect(backdrop(canvas)).toBeNull();

    await openSettings(canvas);
    await pickFile(canvas, png());

    expect(backdrop(canvas)?.src).toBe(IMAGE);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1024);
    await canvas.handle.flush();
    expect(bridge.read(BACKGROUND_KEY)).toEqual({
      schemaVersion: 1,
      image: IMAGE,
      contrast: 100,
      brightness: 100,
      saturation: 100,
      opacity: 100,
    });
    // The board document never carries the picture.
    expect(JSON.stringify(bridge.read(KEY))).not.toContain('data:image');
  });

  test('a picture dropped on the board does the same, and the board says where it will land', async () => {
    fakePictureDecoding();
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);

    const enter = new Event('dragenter', { bubbles: true, cancelable: true });
    Object.defineProperty(enter, 'dataTransfer', { value: { files: [], types: ['Files'] } });
    canvas.surface.dispatchEvent(enter);
    await tick();
    expect(canvas.surface.classList.contains('canvas--dropping')).toBe(true);
    expect(canvas.surface.querySelector('.canvas__drop')).not.toBeNull();

    await dropFile(canvas, png());

    expect(canvas.surface.classList.contains('canvas--dropping')).toBe(false);
    expect(backdrop(canvas)?.src).toBe(IMAGE);
    await canvas.handle.flush();
    expect(bridge.read(BACKGROUND_KEY)).toMatchObject({ image: IMAGE });
  });

  test('the picture is restored with the board', async () => {
    const bridge = createFakeBridge({
      [BACKGROUND_KEY]: { schemaVersion: 1, image: IMAGE, contrast: 120, brightness: 100, saturation: 80, opacity: 50 },
    });
    const canvas = await mount(bridge);

    const image = backdrop(canvas);
    expect(image?.src).toBe(IMAGE);
    expect(image?.style.filter).toBe('contrast(120%) brightness(100%) saturate(80%)');
    expect(image?.style.opacity).toBe('0.5');
  });

  test('the sliders are there but off until the board has a picture', async () => {
    const canvas = await mount(createFakeBridge());
    await openSettings(canvas);

    expect(slider(canvas, 'Contrast').disabled).toBe(true);
    expect(slider(canvas, 'Opacity').disabled).toBe(true);
    expect(canvas.surface.querySelector('.settings__reset')).toBeNull();
  });

  test('the sliders adjust the picture as filters, and one drag is one save', async () => {
    const bridge = createFakeBridge({ [BACKGROUND_KEY]: { schemaVersion: 1, image: IMAGE } });
    const canvas = await mount(bridge);
    await canvas.handle.flush();
    const writesBefore = bridge.writes.length;
    await openSettings(canvas);

    await slide(slider(canvas, 'Opacity'), 60);
    await slide(slider(canvas, 'Opacity'), 45);
    await slide(slider(canvas, 'Opacity'), 40);
    await slide(slider(canvas, 'Contrast'), 150);

    expect(backdrop(canvas)?.style.opacity).toBe('0.4');
    expect(backdrop(canvas)?.style.filter).toBe('contrast(150%) brightness(100%) saturate(100%)');
    expect(canvas.surface.querySelector('.settings__slider-value')?.textContent).toBe('150%');
    expect(bridge.writes.length).toBe(writesBefore);

    await vi.waitFor(() =>
      expect(bridge.read(BACKGROUND_KEY)).toMatchObject({ image: IMAGE, opacity: 40, contrast: 150 }),
    );
    expect(bridge.writes.length).toBe(writesBefore + 1);
    await vi.waitFor(() => expect(canvas.status()).toBe('Saved'));
  });

  test('reset puts the sliders back; remove takes the picture away and leaves null behind', async () => {
    const bridge = createFakeBridge({
      [BACKGROUND_KEY]: { schemaVersion: 1, image: IMAGE, contrast: 150, opacity: 40 },
    });
    const canvas = await mount(bridge);
    await openSettings(canvas);
    // The sliders show where they were left, not their neutral points.
    expect(slider(canvas, 'Contrast').value).toBe('150');
    expect(slider(canvas, 'Opacity').value).toBe('40');
    expect(slider(canvas, 'Brightness').value).toBe('100');

    await click(canvas.surface.querySelector<HTMLButtonElement>('.settings__reset')!);
    expect(slider(canvas, 'Contrast').value).toBe('100');
    expect(slider(canvas, 'Opacity').value).toBe('100');
    expect(backdrop(canvas)?.style.opacity).toBe('1');
    await canvas.handle.flush();
    expect(bridge.read(BACKGROUND_KEY)).toMatchObject({ image: IMAGE, contrast: 100, opacity: 100 });

    const remove = Array.from(canvas.surface.querySelectorAll<HTMLButtonElement>('.settings__button')).find(
      (button) => button.textContent?.trim() === 'Remove',
    );
    expect(remove).toBeDefined();
    await click(remove!);

    expect(backdrop(canvas)).toBeNull();
    expect(slider(canvas, 'Contrast').disabled).toBe(true);
    await canvas.handle.flush();
    expect(bridge.entries.has(BACKGROUND_KEY)).toBe(true);
    expect(bridge.read(BACKGROUND_KEY)).toBeNull();
  });

  test('a file that is not a picture is refused with a reason and changes nothing', async () => {
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);

    await dropFile(canvas, new File(['hi'], 'notes.txt', { type: 'text/plain' }));

    expect(backdrop(canvas)).toBeNull();
    expect(panel(canvas)).not.toBeNull();
    expect(canvas.surface.querySelector('[role="alert"]')?.textContent).toContain('notes.txt');
    await canvas.handle.flush();
    expect(bridge.entries.has(BACKGROUND_KEY)).toBe(false);
  });

  test('a picture that cannot be decoded is refused with a reason', async () => {
    (globalThis as { createImageBitmap?: unknown }).createImageBitmap = vi.fn(async () => {
      throw new Error('bad png');
    });
    const bridge = createFakeBridge();
    const canvas = await mount(bridge);

    await dropFile(canvas, png());

    expect(backdrop(canvas)).toBeNull();
    expect(canvas.surface.querySelector('[role="alert"]')?.textContent).toContain('Could not read');
    expect(bridge.entries.has(BACKGROUND_KEY)).toBe(false);
  });

  test('each board has its own background: switching swaps it, and a new board starts bare', async () => {
    const bridge = createFakeBridge({
      boards: {
        schemaVersion: 1,
        boards: [
          { id: 'default', name: 'Canvas', projectId: null },
          { id: 'b2', name: 'Moodboard', projectId: null },
        ],
        lastOpen: 'default',
      },
      'background:b2': { schemaVersion: 1, image: IMAGE },
    });
    const canvas = await mount(bridge);
    expect(backdrop(canvas)).toBeNull();

    await click(canvas.button('Boards'));
    await click(canvas.surface.querySelector<HTMLButtonElement>('[data-board-id="b2"]')!);
    expect(backdrop(canvas)?.src).toBe(IMAGE);

    await openSettings(canvas);
    expect(canvas.surface.querySelector('.settings__board')?.textContent).toBe('Moodboard');

    await click(canvas.button('Boards'));
    await click(canvas.surface.querySelector<HTMLButtonElement>('[data-board-id="default"]')!);
    expect(backdrop(canvas)).toBeNull();
  });

  test('deleting a board takes its picture with it', async () => {
    const bridge = createFakeBridge({
      boards: {
        schemaVersion: 1,
        boards: [
          { id: 'default', name: 'Canvas', projectId: null },
          { id: 'b2', name: 'Moodboard', projectId: null },
        ],
        lastOpen: 'b2',
      },
      'background:b2': { schemaVersion: 1, image: IMAGE },
    });
    const canvas = await mount(bridge);
    expect(backdrop(canvas)?.src).toBe(IMAGE);

    await click(canvas.button('Boards'));
    const doom = Array.from(canvas.surface.querySelectorAll<HTMLButtonElement>('.boards__item')).find(
      (item) => item.textContent?.startsWith('Delete this board'),
    );
    await click(doom!);
    await click(canvas.surface.querySelector<HTMLButtonElement>('.boards__button--danger')!);

    expect(backdrop(canvas)).toBeNull();
    await canvas.handle.flush();
    expect(bridge.read('background:b2')).toBeNull();
    expect(bridge.entries.has('background:default')).toBe(false);
  });

  test('a picture still shrinking when its board is left is written nowhere', async () => {
    let finish: (bitmap: { width: number; height: number; close(): void }) => void = () => {};
    (globalThis as { createImageBitmap?: unknown }).createImageBitmap = vi.fn(
      () => new Promise((resolve) => { finish = resolve; }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(IMAGE);
    const bridge = createFakeBridge({
      boards: {
        schemaVersion: 1,
        boards: [
          { id: 'default', name: 'Canvas', projectId: null },
          { id: 'b2', name: 'Moodboard', projectId: null },
        ],
        lastOpen: 'default',
      },
    });
    const canvas = await mount(bridge);

    await dropFile(canvas, png());
    await click(canvas.button('Boards'));
    await click(canvas.surface.querySelector<HTMLButtonElement>('[data-board-id="b2"]')!);
    finish({ width: 100, height: 100, close: vi.fn() });
    await tick();
    await tick();

    expect(backdrop(canvas)).toBeNull();
    await canvas.handle.flush();
    expect(bridge.entries.has(BACKGROUND_KEY)).toBe(false);
    expect(bridge.entries.has('background:b2')).toBe(false);
  });

  test('deleting a board nulls its picture even when that picture could not be read', async () => {
    const bridge = createFakeBridge({
      boards: {
        schemaVersion: 1,
        boards: [
          { id: 'default', name: 'Canvas', projectId: null },
          { id: 'b2', name: 'Moodboard', projectId: null },
        ],
        lastOpen: 'b2',
      },
      'background:b2': { schemaVersion: 1, image: IMAGE },
    });
    bridge.failGet('background:b2');
    const canvas = await mount(bridge);
    expect(backdrop(canvas)).toBeNull();

    await click(canvas.button('Boards'));
    const doom = Array.from(canvas.surface.querySelectorAll<HTMLButtonElement>('.boards__item')).find(
      (item) => item.textContent?.startsWith('Delete this board'),
    );
    await click(doom!);
    await click(canvas.surface.querySelector<HTMLButtonElement>('.boards__button--danger')!);
    await canvas.handle.flush();

    expect(bridge.read('background:b2')).toBeNull();
  });
});
