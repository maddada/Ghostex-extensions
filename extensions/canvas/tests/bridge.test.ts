/**
 * Finding the host bridge, which is the one thing no other test can see.
 *
 * Ghostex installs `window.ghostex` from its load-end handler, after this
 * bundle has already run, and fires no event when it does. Canvas looked once
 * at startup and therefore never found it: every board in the real app said
 * "No host storage" and nothing was ever saved. These tests pin the behaviour
 * that fixes it — a bridge that arrives late is still picked up, and a page
 * that never gets one stops waiting.
 */

import { describe, expect, test, vi } from 'vitest';

import { readProject, resolveBridge, waitForBridge, type GhostexBridge } from '../src/bridge.js';

const BRIDGE = {
  __bridgeVersion: 1,
  storage: { async get() { return null; }, async set() { return {}; } },
} as unknown as GhostexBridge;

/** A window as much like the extension page's as this test needs. */
function fakeHost(readyState: DocumentReadyState = 'complete'): Window & {
  install(bridge: unknown): void;
  fireLoad(): void;
} {
  const listeners = new Map<string, Set<() => void>>();
  const host = {
    document: { readyState },
    addEventListener(type: string, listener: () => void) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
    install(bridge: unknown) {
      (host as { ghostex?: unknown }).ghostex = bridge;
    },
    fireLoad() {
      (host.document as { readyState: string }).readyState = 'complete';
      for (const listener of [...(listeners.get('load') ?? [])]) listener();
    },
  };
  return host as unknown as Window & { install(bridge: unknown): void; fireLoad(): void };
}

describe('recognising the bridge', () => {
  test('only accepts the version it knows how to talk to', () => {
    const host = fakeHost();
    expect(resolveBridge(host)).toBeNull();
    host.install({ __bridgeVersion: 2, storage: {} });
    expect(resolveBridge(host)).toBeNull();
    host.install(BRIDGE);
    expect(resolveBridge(host)).toBe(BRIDGE);
  });
});

describe('waiting for the bridge', () => {
  test('takes one that is already there without waiting', async () => {
    const host = fakeHost();
    host.install(BRIDGE);
    await expect(waitForBridge(host, 1000)).resolves.toBe(BRIDGE);
  });

  test('picks up one that arrives after the page has loaded', async () => {
    // The real case: the host injects from its load-end handler, well after
    // this bundle ran, and says nothing about it.
    const host = fakeHost();
    const waiting = waitForBridge(host, 1000);
    await tick();
    host.install(BRIDGE);
    await expect(waiting).resolves.toBe(BRIDGE);
  });

  test('keeps looking while the page is still loading', async () => {
    vi.useFakeTimers();
    try {
      const host = fakeHost('loading');
      const waiting = waitForBridge(host, 50);
      // Long past the grace period, but the page has not loaded yet, so the
      // host has not had its chance to inject anything.
      await vi.advanceTimersByTimeAsync(500);
      host.install(BRIDGE);
      host.fireLoad();
      await vi.advanceTimersByTimeAsync(50);
      await expect(waiting).resolves.toBe(BRIDGE);
    } finally {
      vi.useRealTimers();
    }
  });

  test('gives up on a page that never gets one, so the board can say so', async () => {
    vi.useFakeTimers();
    try {
      const waiting = waitForBridge(fakeHost(), 50);
      await vi.advanceTimersByTimeAsync(200);
      await expect(waiting).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('the project on a context', () => {
  test('is nothing when Ghostex has none open', () => {
    expect(readProject({ project: { name: '', path: null } })).toBeNull();
    expect(readProject(null)).toBeNull();
  });

  test('is identified by its path, and falls back to the folder for a name', () => {
    expect(readProject({ project: { name: 'Canvas', path: '/code/oss/canvas' } })).toEqual({
      id: '/code/oss/canvas',
      name: 'Canvas',
    });
    expect(readProject({ project: { name: '', path: '/code/oss/canvas' } })).toEqual({
      id: '/code/oss/canvas',
      name: 'canvas',
    });
  });
});

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
