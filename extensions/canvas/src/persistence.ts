/**
 * Loading and saving through the Ghostex bridge: the board index, the
 * settings, and each board's contents and background.
 *
 * The host store is a key-value file rewritten on every `set`, so writes are
 * debounced and serialised: never more than one in flight, never out of order,
 * and the last value always wins. Board contents are debounced because they
 * change on every pixel of a drag, and a background because a slider moves it
 * on every pixel too; the index and the settings are written straight away,
 * because creating, renaming, switching or deleting a board, or picking a
 * font, is one deliberate act.
 */

import {
  backgroundStorageKey,
  readBackground,
  type BoardBackground,
} from './background.js';
import type { BridgeStorage } from './bridge.js';
import {
  DEFAULT_BOARD_ID,
  boardStorageKey,
  createBoard,
  readBoard,
  type BoardDocument,
} from './board.js';
import { BOARDS_STORAGE_KEY, readIndex, type BoardsIndex } from './boards.js';
import {
  SETTINGS_STORAGE_KEY,
  createSettings,
  readSettings,
  type CanvasSettings,
} from './settings.js';

export type SaveStatus = 'loading' | 'saving' | 'saved' | 'error' | 'unavailable';

export const AUTOSAVE_DELAY_MS = 400;

export interface LoadResult<T> {
  value: T;
  /** True when storage exists but could not be read: do not save over it. */
  failed: boolean;
}

export interface Autosave {
  /** Queues a board's contents behind the debounce. */
  schedule(document: BoardDocument): void;
  /** Queues a board's background behind the debounce: a slider is a drag too. */
  scheduleBackground(boardId: string, background: BoardBackground): void;
  /** Writes the board index immediately. */
  writeIndex(index: BoardsIndex): void;
  /** Writes the settings immediately. */
  writeSettings(settings: CanvasSettings): void;
  /**
   * Writes a board's background immediately — a picture just imported, or
   * null for one removed — and drops any slider change still waiting for it.
   */
  writeBackground(boardId: string, background: BoardBackground | null): void;
  /**
   * Replaces a deleted board's contents and background with null. The host
   * store has no delete, so a null value is the closest thing to one: the keys
   * stay, and reading them back gives an empty board with no picture. The
   * background is nulled whether or not one was ever loaded, so a picture that
   * could not be read is still not left behind in the store forever.
   */
  tombstone(id: string): void;
  /** Drops every debounced write, for a board that is about to be deleted. */
  discard(): void;
  /** Writes anything pending straight away and waits for storage to settle. */
  flush(): Promise<void>;
  dispose(): void;
}

export async function loadIndex(storage: BridgeStorage | null): Promise<LoadResult<BoardsIndex>> {
  if (!storage) return { value: readIndex(null), failed: false };
  try {
    return { value: readIndex(await storage.get(BOARDS_STORAGE_KEY)), failed: false };
  } catch {
    return { value: readIndex(null), failed: true };
  }
}

/**
 * Settings and backgrounds carry no `failed` flag: nothing ever saves over
 * them on its own. A font is written when one is picked and a picture when
 * one is imported, both deliberate acts, so a read that failed falls back the
 * same way an empty one does and there is nothing to guard.
 */
export async function loadSettings(storage: BridgeStorage | null): Promise<CanvasSettings> {
  if (!storage) return createSettings();
  try {
    return readSettings(await storage.get(SETTINGS_STORAGE_KEY));
  } catch {
    return createSettings();
  }
}

export async function loadBoard(
  storage: BridgeStorage | null,
  id: string = DEFAULT_BOARD_ID,
): Promise<LoadResult<BoardDocument>> {
  if (!storage) return { value: createBoard(id), failed: false };
  try {
    const raw = await storage.get(boardStorageKey(id));
    return { value: readBoard(raw, id), failed: false };
  } catch {
    return { value: createBoard(id), failed: true };
  }
}

export async function loadBackground(
  storage: BridgeStorage | null,
  id: string = DEFAULT_BOARD_ID,
): Promise<BoardBackground | null> {
  if (!storage) return null;
  try {
    return readBackground(await storage.get(backgroundStorageKey(id)));
  } catch {
    return null;
  }
}

export function createAutosave(
  storage: BridgeStorage | null,
  onStatus: (status: SaveStatus) => void,
  delayMs: number = AUTOSAVE_DELAY_MS,
): Autosave {
  let disposed = false;
  let chain: Promise<void> = Promise.resolve();
  /** Writes queued or in flight: "Saved" only once the last of them lands. */
  let queued = 0;

  function enqueue(key: string, value: unknown): void {
    if (!storage || disposed) return;
    queued += 1;
    onStatus('saving');
    chain = chain.then(async () => {
      try {
        await storage.set(key, value);
        queued -= 1;
        if (!disposed && queued === 0 && !board.pending && !background.pending) onStatus('saved');
      } catch {
        queued -= 1;
        if (!disposed) onStatus('error');
      }
    });
  }

  /** One debounced slot: the latest key and value wait out the delay, then are written. */
  function debounced() {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let due: { key: string; value: unknown } | null = null;

    function write(): void {
      timer = null;
      const entry = due;
      due = null;
      if (entry) enqueue(entry.key, entry.value);
    }

    function clear(): void {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      due = null;
    }

    return {
      get pending(): boolean {
        return due !== null;
      },
      schedule(key: string, value: unknown): void {
        due = { key, value };
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(write, delayMs);
      },
      /** Writes now what was waiting, if anything. */
      flush(): void {
        if (timer === null) return;
        clearTimeout(timer);
        write();
      },
      clear,
      /** Drops what is waiting only if it is for `key`. */
      clearKey(key: string): void {
        if (due?.key === key) clear();
      },
    };
  }

  const board = debounced();
  const background = debounced();

  function unavailable(): boolean {
    if (storage) return false;
    onStatus('unavailable');
    return true;
  }

  return {
    schedule(document: BoardDocument): void {
      if (disposed || unavailable()) return;
      board.schedule(boardStorageKey(document.id), document);
    },
    scheduleBackground(boardId: string, value: BoardBackground): void {
      if (disposed || unavailable()) return;
      background.schedule(backgroundStorageKey(boardId), value);
    },
    writeIndex(index: BoardsIndex): void {
      if (disposed || unavailable()) return;
      enqueue(BOARDS_STORAGE_KEY, index);
    },
    writeSettings(settings: CanvasSettings): void {
      if (disposed || unavailable()) return;
      enqueue(SETTINGS_STORAGE_KEY, settings);
    },
    writeBackground(boardId: string, value: BoardBackground | null): void {
      if (disposed || unavailable()) return;
      const key = backgroundStorageKey(boardId);
      background.clearKey(key);
      enqueue(key, value);
    },
    tombstone(id: string): void {
      if (disposed || !storage) return;
      background.clearKey(backgroundStorageKey(id));
      enqueue(boardStorageKey(id), null);
      enqueue(backgroundStorageKey(id), null);
    },
    discard(): void {
      board.clear();
      background.clear();
    },
    async flush(): Promise<void> {
      board.flush();
      background.flush();
      await chain;
    },
    dispose(): void {
      disposed = true;
      board.clear();
      background.clear();
    },
  };
}
