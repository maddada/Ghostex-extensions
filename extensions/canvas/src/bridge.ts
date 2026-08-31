/**
 * The slice of the Ghostex extension bridge (`window.ghostex`) that Canvas uses.
 *
 * Only the members this extension actually calls are declared, so the review
 * surface matches the manifest's empty `permissions` array: `storage` and
 * `context` both need no permission, and they are the whole of Canvas's host
 * contract today.
 */

export interface BridgeStorage {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<unknown>;
}

/**
 * The host sends `project` on every context, with `name` an empty string and
 * `path` null when no project is open, so both fields are read defensively.
 */
export interface BridgeContext {
  project?: { name?: string | null; path?: string | null } | null;
}

export interface GhostexBridge {
  readonly __bridgeVersion: 1;
  readonly storage: BridgeStorage;
  /** Resolves with the active session, project and placement. */
  context?(): Promise<BridgeContext>;
  /** Fires on project and session changes. Never replays the current context. */
  onContextChange?(callback: (context: BridgeContext) => void): () => void;
}

/** The active Ghostex project, as Canvas needs it. */
export interface HostProject {
  /**
   * What a board links to. The host gives projects no id, so their path is the
   * identity: it survives a rename, and two projects never share one.
   */
  id: string;
  /** What the user calls it. */
  name: string;
}

/** Ghostex injects the bridge into extension pages; a plain browser has none. */
export function resolveBridge(host: Window | undefined = globalThis.window): GhostexBridge | null {
  const candidate = (host as { ghostex?: GhostexBridge } | undefined)?.ghostex;
  return candidate?.__bridgeVersion === 1 ? candidate : null;
}

/** How long to keep looking for the bridge once the page has finished loading. */
export const BRIDGE_GRACE_MS = 1500;
const BRIDGE_POLL_MS = 25;
/** A page whose load event never fires still has to stop waiting eventually. */
const BRIDGE_HARD_CAP_MS = 6000;

/**
 * Waits for the bridge, because it is not there when this script runs.
 *
 * Ghostex installs `window.ghostex` from the host's load-end handler — after
 * the page has loaded, so after `app.js` has already executed — and announces
 * it with no event of any kind. Looking once at startup therefore always finds
 * nothing, and the board would spend the whole session believing it had no
 * host storage. The only way to see the bridge is to look again.
 *
 * The wait is bounded: a plain browser never gets a bridge, and that page has
 * to reach "No host storage" quickly rather than hang.
 */
export function waitForBridge(
  host: Window | undefined = globalThis.window,
  graceMs: number = BRIDGE_GRACE_MS,
): Promise<GhostexBridge | null> {
  const immediate = resolveBridge(host);
  if (immediate || !host) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let deadline = Date.now() + BRIDGE_HARD_CAP_MS;

    const settle = (bridge: GhostexBridge | null): void => {
      if (timer !== null) clearTimeout(timer);
      host.removeEventListener('load', startGrace);
      resolve(bridge);
    };

    const look = (): void => {
      const bridge = resolveBridge(host);
      if (bridge) {
        settle(bridge);
        return;
      }
      if (Date.now() >= deadline) {
        settle(null);
        return;
      }
      timer = setTimeout(look, BRIDGE_POLL_MS);
    };

    // The host only injects once the page has loaded, so the clock that
    // matters starts there, not when this function was called.
    function startGrace(): void {
      deadline = Math.min(deadline, Date.now() + graceMs);
    }

    if (host.document?.readyState === 'complete') startGrace();
    else host.addEventListener('load', startGrace, { once: true });

    look();
  });
}

/** The project a context describes, or null when Ghostex has none open. */
export function readProject(context: BridgeContext | null | undefined): HostProject | null {
  const path = text(context?.project?.path);
  const name = text(context?.project?.name);
  if (path.length === 0 && name.length === 0) return null;
  const id = path.length > 0 ? path : name;
  return { id, name: name.length > 0 ? name : projectLabel(id) };
}

/** What to call a project we only know by the id stored on a board: its folder. */
export function projectLabel(id: string): string {
  return id.split('/').filter(Boolean).at(-1) ?? id;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
