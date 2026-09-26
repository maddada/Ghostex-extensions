/**
 * One board's contents: an Excalidraw scene, and nothing else.
 *
 * Excalidraw owns every element on the board and every rule about them, so
 * this module holds no geometry and no reducer. What is left is the storage
 * contract — what a board looks like in the host store, what is safe to read
 * back out of it, and which slice of Excalidraw's app state is worth keeping.
 *
 * A board's name and project link are not here: they live in the board index
 * (`boards.ts`), which owns everything about a board that the switcher shows.
 */

import { isRecord } from './stored.js';

/**
 * Bumped whenever a stored board's shape changes; `readBoard` migrates.
 *
 * Versions 1 to 5 were Canvas's own drawing engine — notes, ink, shapes and
 * labels of its own invention. Version 6 is the first Excalidraw scene, and
 * `migrate.ts` converts anything older on the way in.
 */
export const SCHEMA_VERSION = 6;

/** The last version written by the hand-rolled engine that came before. */
export const LEGACY_SCHEMA_VERSION = 5;

/** The board a first run opens, and the one the walking skeleton wrote. */
export const DEFAULT_BOARD_ID = 'default';

/**
 * An Excalidraw element. Excalidraw's own types describe some eighteen shapes
 * of these, all of them its business rather than ours: a board reads them out
 * of storage, hands them to Excalidraw, and stores whatever comes back. The
 * one thing this module insists on is that each is an object with an id, so a
 * hand-edited store cannot put a string where an element belongs.
 */
export interface StoredElement extends Record<string, unknown> {
  id: string;
}

/**
 * Pictures pasted or dropped onto the board, keyed by the file id its element
 * carries. Excalidraw holds each as a data URL, so they travel with the board.
 */
export type StoredFiles = Record<string, unknown>;

/**
 * The slice of Excalidraw's app state a board remembers. Everything else it
 * tracks — what is selected, which dialog is open, who is collaborating — is
 * about this moment rather than about the board, and is deliberately dropped.
 */
export interface StoredAppState {
  /** Where the board is scrolled to, so it reopens where it was left. */
  scrollX: number;
  scrollY: number;
  zoom: number;
  /** Light or dark, per board, as Excalidraw's own menu sets it. */
  theme: string;
  /** The tool settings the next element is drawn with. */
  currentItemStrokeColor?: string;
  currentItemBackgroundColor?: string;
  currentItemFillStyle?: string;
  currentItemStrokeWidth?: number;
  currentItemStrokeStyle?: string;
  currentItemRoughness?: number;
  currentItemOpacity?: number;
  currentItemFontFamily?: number;
  currentItemFontSize?: number;
  currentItemTextAlign?: string;
  currentItemStartArrowhead?: string | null;
  currentItemEndArrowhead?: string | null;
  currentItemRoundness?: string;
  /** Whether the dotted grid is showing. Off unless the user turned it on. */
  gridModeEnabled?: boolean;
  objectsSnapModeEnabled?: boolean;
}

export interface BoardDocument {
  schemaVersion: number;
  id: string;
  elements: StoredElement[];
  appState: StoredAppState;
  files: StoredFiles;
}

/** Storage keys are capped at 128 characters by the host bridge. */
export function boardStorageKey(id: string): string {
  return `board:${id}`;
}

/**
 * The board a first run opens. `viewBackgroundColor` is not among the stored
 * fields on purpose: `app.tsx` always passes it as transparent so a board's
 * own background picture can show through from behind the canvas.
 */
export function createBoard(id: string = DEFAULT_BOARD_ID): BoardDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    elements: [],
    appState: { scrollX: 0, scrollY: 0, zoom: 1, theme: 'dark' },
    files: {},
  };
}

/** The app state fields worth storing, coerced out of whatever Excalidraw gave. */
export function readAppState(raw: unknown): StoredAppState {
  const defaults = createBoard().appState;
  if (!isRecord(raw)) return defaults;

  const state: StoredAppState = {
    scrollX: finiteOr(raw['scrollX'], defaults.scrollX),
    scrollY: finiteOr(raw['scrollY'], defaults.scrollY),
    zoom: readZoom(raw['zoom'], defaults.zoom),
    theme: raw['theme'] === 'light' ? 'light' : 'dark',
  };

  for (const key of NUMBER_PREFERENCES) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) state[key] = value;
  }
  for (const key of STRING_PREFERENCES) {
    const value = raw[key];
    if (typeof value === 'string') state[key] = value;
  }
  for (const key of ARROWHEAD_PREFERENCES) {
    const value = raw[key];
    if (typeof value === 'string' || value === null) state[key] = value;
  }
  for (const key of FLAG_PREFERENCES) {
    const value = raw[key];
    if (typeof value === 'boolean') state[key] = value;
  }
  return state;
}

/**
 * Excalidraw carries zoom as `{ value }` in its live app state and Canvas
 * stores the number, so both shapes have to read back.
 */
export function readZoom(raw: unknown, fallback: number): number {
  if (isRecord(raw)) return finiteOr(raw['value'], fallback);
  return finiteOr(raw, fallback);
}

/**
 * Turns whatever the host storage returned into a usable board.
 *
 * Storage is shared, hand-editable JSON, so every field is coerced rather than
 * trusted. Anything unreadable falls back to a fresh board instead of throwing,
 * and anything written by the engine that came before goes through `migrate`
 * on the way — which is why that conversion is passed in rather than imported:
 * it keeps this module's storage contract free of the old document's shapes.
 */
export function readBoard(
  raw: unknown,
  id: string = DEFAULT_BOARD_ID,
  migrate: (legacy: unknown) => Pick<BoardDocument, 'elements' | 'appState' | 'files'> | null = () => null,
): BoardDocument {
  if (!isRecord(raw)) return createBoard(id);
  const storedVersion = typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 0;
  if (storedVersion < 1) return createBoard(id);

  if (storedVersion <= LEGACY_SCHEMA_VERSION) {
    const converted = migrate(raw);
    // A board read under one id keeps that id, whatever the stored copy claims:
    // storage keys, not documents, decide which board this is.
    return converted ? { schemaVersion: SCHEMA_VERSION, id, ...converted } : createBoard(id);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    elements: readElements(raw['elements']),
    appState: readAppState(raw['appState']),
    files: isRecord(raw['files']) ? (raw['files'] as StoredFiles) : {},
  };
}

/**
 * Whether two scenes differ in a way worth writing. Excalidraw calls `onChange`
 * for things that leave the board exactly as it was — a selection, a hover, a
 * pointer moving — so without this every mouse move would queue a save.
 */
export function sceneSignature(document: BoardDocument): string {
  return JSON.stringify({
    elements: document.elements.map((element) => [
      element['id'],
      element['version'] ?? null,
      element['versionNonce'] ?? null,
      element['isDeleted'] ?? false,
    ]),
    appState: document.appState,
    files: Object.keys(document.files).sort(),
  });
}

function readElements(raw: unknown): StoredElement[] {
  if (!Array.isArray(raw)) return [];
  const elements: StoredElement[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = entry['id'];
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    elements.push(entry as StoredElement);
  }
  return elements;
}

const NUMBER_PREFERENCES = [
  'currentItemStrokeWidth',
  'currentItemRoughness',
  'currentItemOpacity',
  'currentItemFontFamily',
  'currentItemFontSize',
] as const satisfies readonly (keyof StoredAppState)[];

const STRING_PREFERENCES = [
  'currentItemStrokeColor',
  'currentItemBackgroundColor',
  'currentItemFillStyle',
  'currentItemStrokeStyle',
  'currentItemTextAlign',
  'currentItemRoundness',
] as const satisfies readonly (keyof StoredAppState)[];

const ARROWHEAD_PREFERENCES = ['currentItemStartArrowhead', 'currentItemEndArrowhead'] as const;

const FLAG_PREFERENCES = ['gridModeEnabled', 'objectsSnapModeEnabled'] as const;

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
