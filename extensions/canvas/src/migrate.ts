/**
 * Converting a board drawn with Canvas's own engine into an Excalidraw scene.
 *
 * Canvas used to have a drawing engine of its own: sticky notes, freehand ink,
 * four hand-drawn shapes and plain text labels, in a palette of its own naming.
 * Excalidraw replaced all of it, so every board saved before that has to be
 * translated once, on the load that first sees it, and written back in the new
 * shape. Nothing calls this twice: `readBoard` only reaches it for a stored
 * schema version at or below the last one the old engine wrote.
 *
 * Two things do not survive, and cannot. A note's markdown is kept verbatim as
 * the text of the note, so every character the user typed is still there, but
 * it is text now and not a rendered document — headings, links, code and task
 * lists read as the source they were written in. And a note's paper colour
 * becomes a rectangle's fill, which is as close as Excalidraw gets to paper.
 */

import { isRecord } from './stored.js';
import { readZoom, type StoredAppState, type StoredElement } from './board.js';

export interface MigratedScene {
  elements: StoredElement[];
  appState: StoredAppState;
  files: Record<string, unknown>;
}

/**
 * Each colour the old palette named, at its nearest neighbour in Excalidraw's.
 *
 * The old board was dark and its ink was light — chalk was very nearly white.
 * Excalidraw stores every colour as if the board were light and inverts the
 * whole canvas to draw a dark one, so carrying the old hex values across
 * verbatim would turn white ink black and hide it. Mapping onto Excalidraw's
 * own swatches keeps every stroke the colour it looked, in either theme, and
 * makes a converted board indistinguishable from one drawn fresh.
 */
const INK_HEX: Record<string, string> = {
  chalk: '#1e1e1e',
  coral: '#e03131',
  amber: '#f08c00',
  sage: '#2f9e44',
  azure: '#1971c2',
  violet: '#9c36b5',
};
const DEFAULT_INK = INK_HEX['chalk'] as string;

/** A note's paper, at the nearest fill in Excalidraw's background palette. */
const PAPER_HEX: Record<string, string> = {
  butter: '#ffec99',
  apricot: '#ffd8a8',
  rose: '#ffc9c9',
  mint: '#b2f2bb',
  sky: '#a5d8ff',
  lilac: '#eebefa',
};
const DEFAULT_PAPER = PAPER_HEX['butter'] as string;

/** Ink written on paper, rather than on the board: dark, so it reads on it. */
const NOTE_TEXT_HEX = '#1e1e1e';

/** The old three weights, at Excalidraw's thin, bold and extra bold. */
const STROKE_WIDTH: Record<string, number> = { fine: 1, medium: 2, bold: 4 };
/** The old three label sizes, at Excalidraw's S, M and XL. */
const FONT_SIZE: Record<string, number> = { fine: 16, medium: 20, bold: 36 };

/**
 * Nunito, Excalidraw's plain sans. Notes and labels were written in Inter, a
 * plain sans of their own, so prose that was never meant to look hand-drawn
 * does not become hand-drawn on the way across.
 */
const FONT_FAMILY_NUNITO = 6;

/** Excalidraw's own line height for its fonts, used to frame migrated text. */
const LINE_HEIGHT = 1.25;
/** Roughly how wide a character is, per unit of font size: a frame, not metrics. */
const CHAR_WIDTH = 0.62;

/** How much room a note's text is given inside its rectangle. */
const NOTE_PADDING = 12;

/**
 * Turns a board stored by the old engine into an Excalidraw scene, or null
 * when what was stored is not a board at all.
 *
 * Excalidraw runs its own `restore` over whatever `initialData` it is handed,
 * filling in every field an element is missing, so what is built here is the
 * part that carries meaning — shape, place, colour, size — and not the whole
 * of an element's record.
 */
export function migrateLegacyBoard(raw: unknown): MigratedScene | null {
  if (!isRecord(raw)) return null;

  const elements: StoredElement[] = [];
  const items = Array.isArray(raw['items']) ? raw['items'] : [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    elements.push(...convert(item));
  }

  return { elements, appState: migrateViewport(raw['viewport']), files: {} };
}

/**
 * The old viewport, in Excalidraw's terms. Both describe the same window onto
 * the same board, but the old one placed the board in screen pixels after
 * zooming and Excalidraw scrolls in board units before it, so the offset is
 * divided by the zoom on the way across.
 */
export function migrateViewport(raw: unknown): StoredAppState {
  const viewport = isRecord(raw) ? raw : {};
  const zoom = clamp(readZoom(viewport['zoom'], 1), 0.1, 30);
  return {
    scrollX: finiteOr(viewport['x'], 0) / zoom,
    scrollY: finiteOr(viewport['y'], 0) / zoom,
    zoom,
    theme: 'dark',
  };
}

function convert(item: Record<string, unknown>): StoredElement[] {
  const id = item['id'];
  if (typeof id !== 'string' || id.length === 0) return [];

  switch (item['type']) {
    case 'note':
      return note(id, item);
    case 'stroke':
      return ink(id, item);
    case 'shape':
      return shape(id, item);
    case 'text':
      return label(id, item);
    default:
      return [];
  }
}

/** A sticky note: a filled rectangle with its writing bound inside it. */
function note(id: string, item: Record<string, unknown>): StoredElement[] {
  const x = finiteOr(item['x'], 0);
  const y = finiteOr(item['y'], 0);
  const width = Math.max(finiteOr(item['width'], 208), 16);
  const height = Math.max(finiteOr(item['height'], 160), 16);
  const paper = lookup(PAPER_HEX, item['color'], DEFAULT_PAPER);
  const text = typeof item['text'] === 'string' ? item['text'] : '';
  const textId = `${id}-text`;

  const paperElement: StoredElement = {
    ...base(id, 'rectangle', x, y, width, height),
    strokeColor: 'transparent',
    backgroundColor: paper,
    fillStyle: 'solid',
    strokeWidth: 1,
    roughness: 0,
    roundness: { type: 3 },
    boundElements: [{ type: 'text', id: textId }],
  };

  const fontSize = 16;
  const writing: StoredElement = {
    ...base(textId, 'text', x + NOTE_PADDING, y + NOTE_PADDING, Math.max(width - NOTE_PADDING * 2, 1), Math.max(height - NOTE_PADDING * 2, 1)),
    strokeColor: NOTE_TEXT_HEX,
    text,
    originalText: text,
    fontSize,
    fontFamily: FONT_FAMILY_NUNITO,
    textAlign: 'left',
    verticalAlign: 'top',
    lineHeight: LINE_HEIGHT,
    containerId: id,
    autoResize: false,
  };

  return [paperElement, writing];
}

/** A freehand stroke. The stored samples map straight onto Excalidraw's own. */
function ink(id: string, item: Record<string, unknown>): StoredElement[] {
  const points = readPoints(item['points']);
  // A stroke with nothing in it would draw nothing and could never be erased.
  if (points.length === 0) return [];

  const [first] = points as [[number, number], ...[number, number][]];
  const relative = points.map(([x, y]) => [x - first[0], y - first[1]]);
  const xs = relative.map(([x]) => x as number);
  const ys = relative.map(([, y]) => y as number);

  return [
    {
      ...base(id, 'freedraw', first[0], first[1], span(xs), span(ys)),
      strokeColor: lookup(INK_HEX, item['color'], DEFAULT_INK),
      strokeWidth: lookup(STROKE_WIDTH, item['size'], 2),
      points: relative,
      pressures: [],
      // The old engine never stored pressure either: both simulate it from
      // how fast the line was drawn, so a mouse and a trackpad still taper.
      simulatePressure: true,
      lastCommittedPoint: relative[relative.length - 1],
    },
  ];
}

/**
 * A hand-drawn shape. `a` and `b` were the two points the drag defined, which
 * is why a line or an arrow keeps them in order — that is what points it the
 * way it was drawn — while a rectangle or an ellipse is normalised into the
 * box they bound.
 */
function shape(id: string, item: Record<string, unknown>): StoredElement[] {
  const a = readPoint(item['a']);
  const b = readPoint(item['b']);
  const stroke = lookup(INK_HEX, item['color'], DEFAULT_INK);
  const strokeWidth = lookup(STROKE_WIDTH, item['size'], 2);
  const seed = Math.trunc(finiteOr(item['seed'], seedFor(id)));

  if (item['shape'] === 'line' || item['shape'] === 'arrow') {
    const element: StoredElement = {
      ...base(id, item['shape'], a[0], a[1], Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])),
      strokeColor: stroke,
      strokeWidth,
      seed,
      points: [
        [0, 0],
        [b[0] - a[0], b[1] - a[1]],
      ],
      lastCommittedPoint: [b[0] - a[0], b[1] - a[1]],
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: item['shape'] === 'arrow' ? 'arrow' : null,
    };
    return [element];
  }

  if (item['shape'] !== 'rectangle' && item['shape'] !== 'ellipse') return [];
  return [
    {
      ...base(
        id,
        item['shape'],
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.abs(b[0] - a[0]),
        Math.abs(b[1] - a[1]),
      ),
      strokeColor: stroke,
      strokeWidth,
      seed,
    },
  ];
}

/** A text label, written straight onto the board with no paper behind it. */
function label(id: string, item: Record<string, unknown>): StoredElement[] {
  const text = typeof item['text'] === 'string' ? item['text'] : '';
  const fontSize = lookup(FONT_SIZE, item['size'], 20);
  const lines = text.split('\n');
  const longest = lines.reduce((widest, line) => Math.max(widest, line.length), 1);

  return [
    {
      ...base(
        id,
        'text',
        finiteOr(item['x'], 0),
        finiteOr(item['y'], 0),
        longest * fontSize * CHAR_WIDTH,
        lines.length * fontSize * LINE_HEIGHT,
      ),
      strokeColor: lookup(INK_HEX, item['color'], DEFAULT_INK),
      text,
      originalText: text,
      fontSize,
      fontFamily: FONT_FAMILY_NUNITO,
      textAlign: 'left',
      verticalAlign: 'top',
      lineHeight: LINE_HEIGHT,
      containerId: null,
    },
  ];
}

/** The fields every Excalidraw element has, whatever it draws. */
function base(id: string, type: string, x: number, y: number, width: number, height: number): StoredElement {
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: DEFAULT_INK,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    // Reused rather than rolled: migrating the same board twice has to draw
    // the same sketch, because rough.js re-rolls its wobble on every new seed.
    seed: seedFor(id),
    version: 1,
    versionNonce: seedFor(`${id}#nonce`),
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
  };
}

/** A stable 31-bit number for an id, so nothing here needs a random source. */
function seedFor(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  // rough.js seeds are 32-bit and zero means "roll a new one", so it is avoided.
  return (hash >>> 1) + 1;
}

function lookup<T>(table: Record<string, T>, key: unknown, fallback: T): T {
  return typeof key === 'string' && key in table ? (table[key] as T) : fallback;
}

function span(values: readonly number[]): number {
  return Math.max(...values) - Math.min(...values);
}

function readPoints(raw: unknown): [number, number][] {
  if (!Array.isArray(raw)) return [];
  const points: [number, number][] = [];
  for (const entry of raw) {
    if (!Array.isArray(entry)) continue;
    const [x, y] = entry;
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    points.push([x, y]);
  }
  return points;
}

function readPoint(raw: unknown): [number, number] {
  if (!isRecord(raw)) return [0, 0];
  return [finiteOr(raw['x'], 0), finiteOr(raw['y'], 0)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
