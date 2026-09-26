import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { backgroundStorageKey, createBackground } from '../src/background.js';
import { SCHEMA_VERSION, boardStorageKey, createBoard } from '../src/board.js';
import {
  AUTOSAVE_DELAY_MS,
  createAutosave,
  loadBackground,
  loadBoard,
  type SaveStatus,
} from '../src/persistence.js';
import { createFakeBridge } from './fake-bridge.js';

const KEY = boardStorageKey('default');

/** The default board, scrolled somewhere: one field that is easy to tell apart. */
function scrolledTo(scrollX: number) {
  const board = createBoard();
  return { ...board, appState: { ...board.appState, scrollX } };
}

describe('autosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('coalesces a burst of changes into a single write', async () => {
    const bridge = createFakeBridge();
    const autosave = createAutosave(bridge.storage, () => {});

    autosave.schedule(createBoard());
    autosave.schedule(scrolledTo(10));
    autosave.schedule(scrolledTo(20));
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);

    expect(bridge.writes).toEqual([KEY]);
    expect(bridge.read(KEY)).toMatchObject({ appState: { scrollX: 20 } });
  });

  test('writes nothing until the debounce elapses', async () => {
    const bridge = createFakeBridge();
    const autosave = createAutosave(bridge.storage, () => {});

    autosave.schedule(createBoard());
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1);
    expect(bridge.writes).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(bridge.writes).toEqual([KEY]);
  });

  test('flush writes immediately and settles', async () => {
    const bridge = createFakeBridge();
    const autosave = createAutosave(bridge.storage, () => {});

    autosave.schedule(createBoard());
    await autosave.flush();

    expect(bridge.read(KEY)).toMatchObject({ schemaVersion: SCHEMA_VERSION, elements: [] });
  });

  test('reports saving, then saved', async () => {
    const statuses: SaveStatus[] = [];
    const bridge = createFakeBridge();
    const autosave = createAutosave(bridge.storage, (status) => statuses.push(status));

    autosave.schedule(createBoard());
    await autosave.flush();

    expect(statuses).toEqual(['saving', 'saved']);
  });

  test('reports an error when the host refuses the write', async () => {
    const statuses: SaveStatus[] = [];
    const bridge = createFakeBridge();
    bridge.failNextSet();
    const autosave = createAutosave(bridge.storage, (status) => statuses.push(status));

    autosave.schedule(createBoard());
    await autosave.flush();

    expect(statuses).toEqual(['saving', 'error']);
    expect(bridge.entries.has(KEY)).toBe(false);
  });

  test('says so instead of pretending to save when there is no host storage', async () => {
    const statuses: SaveStatus[] = [];
    const autosave = createAutosave(null, (status) => statuses.push(status));

    autosave.schedule(createBoard());
    await autosave.flush();

    expect(statuses).toEqual(['unavailable']);
  });

  test('dispose drops a pending write', async () => {
    const bridge = createFakeBridge();
    const autosave = createAutosave(bridge.storage, () => {});

    autosave.schedule(createBoard());
    autosave.dispose();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2);

    expect(bridge.writes).toEqual([]);
  });
});

describe('loading', () => {
  test('starts a fresh board when nothing is stored', async () => {
    const bridge = createFakeBridge();
    await expect(loadBoard(bridge.storage)).resolves.toEqual({
      value: createBoard(),
      failed: false,
    });
  });

  test('restores what was stored', async () => {
    const stored = scrolledTo(40);
    const bridge = createFakeBridge({ [KEY]: stored });

    const { value, failed } = await loadBoard(bridge.storage);

    expect(failed).toBe(false);
    expect(value).toEqual(stored);
  });

  test('flags a read failure so the caller does not overwrite storage', async () => {
    const bridge = createFakeBridge({ [KEY]: createBoard() });
    bridge.failNextGet();

    const { value, failed } = await loadBoard(bridge.storage);

    expect(failed).toBe(true);
    expect(value).toEqual(createBoard());
  });

  test('works without a bridge at all', async () => {
    await expect(loadBoard(null)).resolves.toEqual({ value: createBoard(), failed: false });
  });
});

describe('backgrounds', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const IMAGE = 'data:image/webp;base64,c2hydW5r';

  test('a background loads from its own key, and is null when the board has none', async () => {
    const bridge = createFakeBridge({ [backgroundStorageKey('b2')]: createBackground(IMAGE) });

    await expect(loadBackground(bridge.storage, 'b2')).resolves.toEqual(createBackground(IMAGE));
    await expect(loadBackground(bridge.storage, 'default')).resolves.toBeNull();
    expect(bridge.entries.has(boardStorageKey('b2'))).toBe(false);
  });

  test('a background read failure reads as no background, not as a throw', async () => {
    const bridge = createFakeBridge({ [backgroundStorageKey('default')]: createBackground(IMAGE) });
    bridge.failNextGet();

    await expect(loadBackground(bridge.storage)).resolves.toBeNull();
  });

  test('a tombstone nulls the board and its background, and drops a slider move still waiting', async () => {
    const bridge = createFakeBridge({ [backgroundStorageKey('b2')]: createBackground(IMAGE) });
    const autosave = createAutosave(bridge.storage, () => {});

    autosave.scheduleBackground('b2', { ...createBackground(IMAGE), opacity: 40 });
    autosave.tombstone('b2');
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2);

    expect(bridge.writes).toEqual([boardStorageKey('b2'), backgroundStorageKey('b2')]);
    expect(bridge.read(boardStorageKey('b2'))).toBeNull();
    expect(bridge.read(backgroundStorageKey('b2'))).toBeNull();
  });

  test('an imported picture is written at once; slider moves are one debounced write', async () => {
    const bridge = createFakeBridge();
    const autosave = createAutosave(bridge.storage, () => {});
    const key = backgroundStorageKey('default');

    autosave.writeBackground('default', createBackground(IMAGE));
    await vi.advanceTimersByTimeAsync(0);
    expect(bridge.writes).toEqual([key]);

    autosave.scheduleBackground('default', { ...createBackground(IMAGE), opacity: 80 });
    autosave.scheduleBackground('default', { ...createBackground(IMAGE), opacity: 60 });
    autosave.scheduleBackground('default', { ...createBackground(IMAGE), opacity: 40 });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1);
    expect(bridge.writes).toEqual([key]);

    await vi.advanceTimersByTimeAsync(1);
    expect(bridge.writes).toEqual([key, key]);
    expect(bridge.read(key)).toMatchObject({ opacity: 40 });
  });

  test('removing a background writes null and drops the slider move that was waiting', async () => {
    const bridge = createFakeBridge();
    const autosave = createAutosave(bridge.storage, () => {});
    const key = backgroundStorageKey('default');

    autosave.scheduleBackground('default', { ...createBackground(IMAGE), opacity: 40 });
    autosave.writeBackground('default', null);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2);

    expect(bridge.writes).toEqual([key]);
    expect(bridge.read(key)).toBeNull();
  });

  test('flush writes a waiting board and a waiting background, and says saved once', async () => {
    const statuses: SaveStatus[] = [];
    const bridge = createFakeBridge();
    const autosave = createAutosave(bridge.storage, (status) => statuses.push(status));

    autosave.schedule(createBoard());
    autosave.scheduleBackground('default', createBackground(IMAGE));
    await autosave.flush();

    expect(bridge.writes.sort()).toEqual([backgroundStorageKey('default'), KEY].sort());
    expect(statuses).toEqual(['saving', 'saving', 'saved']);
  });

  test('discard drops a waiting background along with the board', async () => {
    const bridge = createFakeBridge();
    const autosave = createAutosave(bridge.storage, () => {});

    autosave.schedule(createBoard());
    autosave.scheduleBackground('default', createBackground(IMAGE));
    autosave.discard();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2);

    expect(bridge.writes).toEqual([]);
  });
});
