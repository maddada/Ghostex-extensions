/**
 * An in-memory stand-in for `window.ghostex`.
 *
 * It copies the host's storage semantics: values round-trip through JSON, a
 * missing key reads back as null, and `set` merge-patches one key at a time.
 */

import type { BridgeContext, GhostexBridge } from '../src/bridge.js';

const MAX_KEY_LENGTH = 128;

export interface FakeBridge extends GhostexBridge {
  /** Everything the extension has written, as the host would hold it. */
  readonly entries: Map<string, unknown>;
  read(key: string): unknown;
  failNextGet(message?: string): void;
  /** Fails the next read of exactly this key, whatever is read before it. */
  failGet(key: string, message?: string): void;
  failNextSet(message?: string): void;
  readonly writes: string[];
  /**
   * Opens a project in the host, or closes it with null, and tells the page.
   * The host always sends a `project`: an empty name and a null path are how
   * it says there is none.
   */
  setProject(project: { name: string; path?: string } | null): void;
}

export function createFakeBridge(
  initial: Record<string, unknown> = {},
  project: { name: string; path?: string } | null = null,
): FakeBridge {
  const entries = new Map<string, unknown>(
    Object.entries(initial).map(([key, value]) => [key, clone(value)]),
  );
  const writes: string[] = [];
  const listeners = new Set<(context: BridgeContext) => void>();
  let context: BridgeContext = contextFor(project);
  let getFailure: string | null = null;
  let getFailureKey: { key: string; message: string } | null = null;
  let setFailure: string | null = null;

  return {
    __bridgeVersion: 1,
    entries,
    writes,
    read: (key) => clone(entries.get(key) ?? null),
    setProject(next) {
      context = contextFor(next);
      for (const listener of listeners) listener(clone(context));
    },
    async context() {
      return clone(context);
    },
    onContextChange(listener: (value: BridgeContext) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    failNextGet(message = 'storage.get failed') {
      getFailure = message;
    },
    failGet(key: string, message = 'storage.get failed') {
      getFailureKey = { key, message };
    },
    failNextSet(message = 'storage.set failed') {
      setFailure = message;
    },
    storage: {
      async get(key: string) {
        assertKey(key);
        if (getFailureKey?.key === key) {
          const { message } = getFailureKey;
          getFailureKey = null;
          throw new Error(message);
        }
        if (getFailure !== null) {
          const message = getFailure;
          getFailure = null;
          throw new Error(message);
        }
        return entries.has(key) ? clone(entries.get(key)) : null;
      },
      async set(key: string, value: unknown) {
        assertKey(key);
        if (setFailure !== null) {
          const message = setFailure;
          setFailure = null;
          throw new Error(message);
        }
        entries.set(key, clone(value));
        writes.push(key);
        return Object.fromEntries(entries);
      },
    },
  } as FakeBridge;
}

function contextFor(project: { name: string; path?: string } | null): BridgeContext {
  return { project: { name: project?.name ?? '', path: project?.path ?? null } };
}

function assertKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0 || key.length > MAX_KEY_LENGTH) {
    throw new Error('Storage requires a valid key.');
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}
