/**
 * The board document and the single pure reducer that owns every mutation.
 *
 * Rendering reads this state; nothing mutates a board except by dispatching an
 * action here. Undo/redo lives one layer up in `history.ts`, which wraps this
 * reducer, so every item type added later inherits it for free.
 */

import { isFontName, type FontName } from './fonts.js';
import { isRecord } from './stored.js';
import {
  DEFAULT_VIEWPORT,
  clampZoom,
  sameViewport,
  type Bounds,
  type Point,
  type Viewport,
} from './viewport.js';

/** Bumped whenever a stored board's shape changes; `readBoard` migrates. */
export const SCHEMA_VERSION = 5;

/** The board a first run opens, and the one the walking skeleton wrote. */
export const DEFAULT_BOARD_ID = 'default';

/** The size a note is born at, in world units. */
export const NOTE_WIDTH = 208;
export const NOTE_HEIGHT = 160;
/** Smaller than this and a note holds no text and is hard to grab. */
export const NOTE_MIN_WIDTH = 96;
export const NOTE_MIN_HEIGHT = 72;

/**
 * The paper a note can be written on, in cycling order. Only the name is
 * stored: what each one actually looks like is a `.note--<color>` rule in
 * `styles.css`, so the palette can be restyled without touching saved boards.
 */
export const NOTE_COLORS = ['butter', 'apricot', 'rose', 'mint', 'sky', 'lilac'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];
export const DEFAULT_NOTE_COLOR: NoteColor = 'butter';

/**
 * The ink a stroke, shape or label can be drawn in. Stored as a name, like
 * note paper, so the palette can be restyled without rewriting saved boards —
 * but unlike paper it cannot be a CSS class, because SVG paints a colour
 * value. `drawing.ts` owns what each name looks like.
 */
export const STROKE_COLORS = ['chalk', 'coral', 'amber', 'sage', 'azure', 'violet'] as const;
export type StrokeColor = (typeof STROKE_COLORS)[number];
export const DEFAULT_STROKE_COLOR: StrokeColor = 'chalk';

/** How heavy a stroke, shape outline or label is drawn. */
export const STROKE_WIDTHS = ['fine', 'medium', 'bold'] as const;
export type StrokeWidth = (typeof STROKE_WIDTHS)[number];
export const DEFAULT_STROKE_WIDTH: StrokeWidth = 'medium';

/** How wide each weight draws, in world units. */
export const STROKE_PX: Record<StrokeWidth, number> = { fine: 2, medium: 5, bold: 10 };
/** A label's font size, in world units: the same three steps, sized to read. */
export const LABEL_PX: Record<StrokeWidth, number> = { fine: 16, medium: 24, bold: 36 };

/** The shapes the hand-drawn tools make. */
export const SHAPE_KINDS = ['rectangle', 'ellipse', 'line', 'arrow'] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A sticky note. Its text is markdown; `markdown.ts` renders the preview. */
export interface NoteItem extends Rect {
  id: string;
  type: 'note';
  text: string;
  color: NoteColor;
  /**
   * The font this one note is written in. Absent, the note follows the
   * default in settings — so changing the default changes every note that
   * never chose, and leaves the ones that did alone.
   */
  font?: FontName;
}

/**
 * One sample of a freehand stroke, in world units. Pressure is deliberately
 * not stored: strokes are rendered with perfect-freehand's simulated pressure,
 * which reads velocity, so a trackpad and a mouse both get a live line.
 */
export type InkPoint = [x: number, y: number];

/** A freehand ink stroke, in the order it was drawn. */
export interface StrokeItem {
  id: string;
  type: 'stroke';
  points: InkPoint[];
  color: StrokeColor;
  size: StrokeWidth;
}

/**
 * A hand-drawn shape. `a` and `b` are the two points the drag defined:
 * opposite corners of a rectangle or ellipse, the two ends of a line or arrow.
 * Storing the drag rather than a normalised rectangle is what keeps an arrow
 * pointing the way it was drawn.
 */
export interface ShapeItem {
  id: string;
  type: 'shape';
  shape: ShapeKind;
  a: Point;
  b: Point;
  color: StrokeColor;
  size: StrokeWidth;
  /** rough.js re-rolls its sketch every call unless the seed travels with the shape. */
  seed: number;
}

/** A text label written straight onto the board, with no paper behind it. */
export interface TextItem {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: StrokeColor;
  size: StrokeWidth;
}

export type BoardItem = NoteItem | StrokeItem | ShapeItem | TextItem;

/** Items the eraser sweeps away. A note is not one: it holds typing that
 * cannot be redrawn, and it has its own ✕ and the Delete key. */
export type DrawnItem = StrokeItem | ShapeItem | TextItem;

export function isDrawn(item: BoardItem): item is DrawnItem {
  return item.type !== 'note';
}

/** The corners a note can be resized from. */
export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
export const RESIZE_HANDLES: readonly ResizeHandle[] = ['nw', 'ne', 'sw', 'se'];

/**
 * One board's contents. Its name and project link are not here: they live in
 * the board index (`boards.ts`), which owns everything about a board that the
 * switcher shows.
 */
export interface BoardDocument {
  schemaVersion: number;
  id: string;
  items: BoardItem[];
  viewport: Viewport;
}

/**
 * Actions a single gesture repeats carry its id, so the whole drag, resize,
 * typing burst or eraser sweep collapses into one undo step instead of
 * hundreds.
 */
interface Gestured {
  gesture?: string;
}

export type BoardAction =
  | { type: 'board/loaded'; document: BoardDocument }
  | { type: 'viewport/changed'; viewport: Viewport }
  | { type: 'item/added'; item: BoardItem }
  | ({ type: 'item/edited'; id: string; text: string } & Gestured)
  | ({ type: 'items/deleted'; ids: string[] } & Gestured)
  | ({ type: 'items/moved'; ids: string[]; dx: number; dy: number } & Gestured)
  | ({ type: 'note/resized'; id: string; rect: Rect } & Gestured)
  | { type: 'note/colored'; ids: string[]; color: NoteColor }
  /** Null hands the notes back to the default font in settings. */
  | { type: 'note/font'; ids: string[]; font: FontName | null };

/** Storage keys are capped at 128 characters by the host bridge. */
export function boardStorageKey(id: string): string {
  return `board:${id}`;
}

export function createBoard(id: string = DEFAULT_BOARD_ID): BoardDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    items: [],
    viewport: { ...DEFAULT_VIEWPORT },
  };
}

/** Ids only have to be unique within one board, and boards are single-user. */
let idCounter = 0;
export function nextItemId(): string {
  idCounter += 1;
  return `n${Date.now().toString(36)}${idCounter.toString(36)}`;
}

/** A note is born centred on the world point the user pointed at. */
export function createNote(
  center: Point,
  id: string = nextItemId(),
  color: NoteColor = DEFAULT_NOTE_COLOR,
): NoteItem {
  return {
    id,
    type: 'note',
    x: center.x - NOTE_WIDTH / 2,
    y: center.y - NOTE_HEIGHT / 2,
    width: NOTE_WIDTH,
    height: NOTE_HEIGHT,
    text: '',
    color,
  };
}

export function createStroke(
  points: InkPoint[],
  color: StrokeColor,
  size: StrokeWidth,
  id: string = nextItemId(),
): StrokeItem {
  return { id, type: 'stroke', points, color, size };
}

export function createShape(
  shape: ShapeKind,
  a: Point,
  b: Point,
  color: StrokeColor,
  size: StrokeWidth,
  id: string = nextItemId(),
  seed: number = nextSeed(),
): ShapeItem {
  return { id, type: 'shape', shape, a: { ...a }, b: { ...b }, color, size, seed };
}

/** A label is born with its top-left corner where the user clicked. */
export function createLabel(
  at: Point,
  color: StrokeColor,
  size: StrokeWidth,
  id: string = nextItemId(),
): TextItem {
  return { id, type: 'text', x: at.x, y: at.y, text: '', color, size };
}

/** rough.js seeds are 32-bit; zero means "roll a new one", so it is avoided. */
export function nextSeed(): number {
  return 1 + Math.floor(Math.random() * 2 ** 31);
}

/** The next paper in the palette, wrapping round: one keystroke, one colour. */
export function nextNoteColor(color: NoteColor): NoteColor {
  const index = NOTE_COLORS.indexOf(color);
  return NOTE_COLORS[(index + 1) % NOTE_COLORS.length] ?? DEFAULT_NOTE_COLOR;
}

export function isNoteColor(value: unknown): value is NoteColor {
  return typeof value === 'string' && (NOTE_COLORS as readonly string[]).includes(value);
}

export function isStrokeColor(value: unknown): value is StrokeColor {
  return typeof value === 'string' && (STROKE_COLORS as readonly string[]).includes(value);
}

export function isStrokeWidth(value: unknown): value is StrokeWidth {
  return typeof value === 'string' && (STROKE_WIDTHS as readonly string[]).includes(value);
}

export function isShapeKind(value: unknown): value is ShapeKind {
  return typeof value === 'string' && (SHAPE_KINDS as readonly string[]).includes(value);
}

/**
 * Whether an action belongs on the undo stack: undo rewinds what you changed,
 * not where you were looking or which board you opened.
 */
export function isUndoable(action: BoardAction): boolean {
  switch (action.type) {
    case 'board/loaded':
    case 'viewport/changed':
      return false;
    case 'item/added':
    case 'item/edited':
    case 'items/deleted':
    case 'items/moved':
    case 'note/colored':
    case 'note/font':
    case 'note/resized':
      return true;
  }
}

export function boardReducer(state: BoardDocument, action: BoardAction): BoardDocument {
  switch (action.type) {
    case 'board/loaded':
      return action.document;
    case 'viewport/changed': {
      const viewport = normalizeViewport(action.viewport, state.viewport);
      if (sameViewport(viewport, state.viewport)) return state;
      return { ...state, viewport };
    }
    case 'item/added': {
      if (state.items.some((item) => item.id === action.item.id)) return state;
      return { ...state, items: [...state.items, action.item] };
    }
    case 'item/edited':
      return replaceItem(state, action.id, (item) => {
        if (item.type !== 'note' && item.type !== 'text') return item;
        return item.text === action.text ? item : { ...item, text: action.text };
      });
    case 'items/deleted': {
      const doomed = new Set(action.ids);
      const items = state.items.filter((item) => !doomed.has(item.id));
      if (items.length === state.items.length) return state;
      return { ...state, items };
    }
    case 'items/moved': {
      const { dx, dy } = action;
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return state;
      const moving = new Set(action.ids);
      let changed = false;
      const items = state.items.map((item) => {
        if (!moving.has(item.id)) return item;
        changed = true;
        return translateItem(item, dx, dy);
      });
      return changed ? { ...state, items } : state;
    }
    case 'note/resized':
      return replaceItem(state, action.id, (item) => {
        if (item.type !== 'note') return item;
        const rect = clampRect(action.rect, item);
        return sameRect(item, rect) ? item : { ...item, ...rect };
      });
    case 'note/colored': {
      const targets = new Set(action.ids);
      let changed = false;
      const items = state.items.map((item) => {
        if (item.type !== 'note' || !targets.has(item.id) || item.color === action.color) {
          return item;
        }
        changed = true;
        return { ...item, color: action.color };
      });
      return changed ? { ...state, items } : state;
    }
    case 'note/font': {
      const targets = new Set(action.ids);
      let changed = false;
      const items = state.items.map((item) => {
        if (item.type !== 'note' || !targets.has(item.id) || (item.font ?? null) === action.font) {
          return item;
        }
        changed = true;
        return withFont(item, action.font);
      });
      return changed ? { ...state, items } : state;
    }
  }
}

/** A note in a font, or back on the default: the key goes, not just its value. */
function withFont(note: NoteItem, font: FontName | null): NoteItem {
  const { font: _dropped, ...rest } = note;
  return font === null ? rest : { ...rest, font };
}

/** Where a resize handle drag lands, with the opposite corner anchored. */
export function resizeRect(start: Rect, handle: ResizeHandle, dx: number, dy: number): Rect {
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  // Handles read as `<north|south><west|east>`, and the letters say which edges move.
  const movesLeft = handle.endsWith('w');
  const movesTop = handle.startsWith('n');

  const x = movesLeft ? Math.min(start.x + dx, right - NOTE_MIN_WIDTH) : start.x;
  const y = movesTop ? Math.min(start.y + dy, bottom - NOTE_MIN_HEIGHT) : start.y;
  const width = movesLeft ? right - x : Math.max(start.width + dx, NOTE_MIN_WIDTH);
  const height = movesTop ? bottom - y : Math.max(start.height + dy, NOTE_MIN_HEIGHT);

  return { x, y, width, height };
}

/** The same item, carried `dx, dy` across the board: geometry moves, nothing else. */
export function translateItem(item: BoardItem, dx: number, dy: number): BoardItem {
  switch (item.type) {
    case 'note':
    case 'text':
      return { ...item, x: item.x + dx, y: item.y + dy };
    case 'stroke':
      return { ...item, points: item.points.map(([x, y]) => [x + dx, y + dy]) };
    case 'shape':
      return {
        ...item,
        a: { x: item.a.x + dx, y: item.a.y + dy },
        b: { x: item.b.x + dx, y: item.b.y + dy },
      };
  }
}

/**
 * Flips the checkbox of the task at `index` in a note's markdown, counting
 * tasks the way `markdown.ts` numbers them: source order, skipping anything
 * inside a fenced code block, which renders as code rather than as a task.
 *
 * Returns the text unchanged when that task is not there, so a stale preview
 * can never rewrite the wrong line.
 */
export function toggleTask(text: string, index: number): string {
  if (!Number.isInteger(index) || index < 0) return text;
  const lines = text.split('\n');
  let fence: string | null = null;
  let seen = 0;

  for (let line = 0; line < lines.length; line += 1) {
    const source = lines[line] ?? '';
    const fenceMarker = CODE_FENCE.exec(source)?.[1];
    if (fenceMarker !== undefined) {
      if (fence === null) fence = fenceMarker;
      else if (fenceMarker[0] === fence[0] && fenceMarker.length >= fence.length) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const task = TASK_LINE.exec(source);
    if (!task) continue;
    if (seen === index) {
      const checked = task[2] !== ' ';
      lines[line] = source.replace(TASK_LINE, `$1${checked ? ' ' : 'x'}$3`);
      return lines.join('\n');
    }
    seen += 1;
  }

  return text;
}

/** ```` ```lang ```` or `~~~`, indented up to three spaces, per CommonMark. */
const CODE_FENCE = /^ {0,3}(`{3,}|~{3,})/;
/** A task line: a bullet or number, then `[ ]` or `[x]`, quoted or nested. */
const TASK_LINE = /^(\s*(?:>\s*)*(?:[-*+]|\d{1,9}[.)])\s+\[)([ xX])(\])/;

/**
 * Roughly how much room a label's text takes, per unit of font size. Real text
 * metrics only exist in the browser and the document has none, so this is a
 * deliberately generous estimate: it frames a label for zoom-to-fit and gives
 * the eraser something to hit, and nothing else depends on it.
 */
const LABEL_CHAR_WIDTH = 0.62;
const LABEL_LINE_HEIGHT = 1.3;

export function labelBounds(item: TextItem): Rect {
  const size = LABEL_PX[item.size];
  const lines = item.text.split('\n');
  const longest = lines.reduce((widest, line) => Math.max(widest, line.length), 1);
  return {
    x: item.x,
    y: item.y,
    width: longest * size * LABEL_CHAR_WIDTH,
    height: lines.length * size * LABEL_LINE_HEIGHT,
  };
}

/**
 * The rectangle one item sits inside. Ink and shapes are padded by half their
 * own weight, because a stroke is drawn centred on its path and spills past it.
 */
export function itemBounds(item: BoardItem): Rect {
  switch (item.type) {
    case 'note':
      return { x: item.x, y: item.y, width: item.width, height: item.height };
    case 'text':
      return labelBounds(item);
    case 'stroke':
      return padded(pointsBounds(item.points.map(([x, y]) => ({ x, y }))), STROKE_PX[item.size] / 2);
    case 'shape':
      return padded(pointsBounds([item.a, item.b]), STROKE_PX[item.size] / 2);
  }
}

/** The rectangle every item sits inside, or null for an empty board. */
export function boardBounds(items: readonly BoardItem[]): Bounds | null {
  if (items.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    const rect = itemBounds(item);
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Turns whatever the host storage returned into a usable board.
 *
 * Storage is shared, hand-editable JSON, so every field is coerced rather than
 * trusted. Anything unreadable falls back to a fresh board instead of throwing.
 */
export function readBoard(raw: unknown, id: string = DEFAULT_BOARD_ID): BoardDocument {
  if (!isRecord(raw)) return createBoard(id);
  const storedVersion = typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 0;
  if (storedVersion < 1) return createBoard(id);

  return {
    schemaVersion: SCHEMA_VERSION,
    // A board read under one id keeps that id, whatever the stored copy claims:
    // storage keys, not documents, decide which board this is.
    id,
    // Version 1 items were `{ id, type }` placeholders with no geometry, so
    // there is nowhere on the board to put them: the migration drops them.
    items: storedVersion < 2 ? [] : readItems(raw['items']),
    viewport: normalizeViewport(raw['viewport'], DEFAULT_VIEWPORT),
  };
}

function replaceItem(
  state: BoardDocument,
  id: string,
  update: (item: BoardItem) => BoardItem,
): BoardDocument {
  const index = state.items.findIndex((item) => item.id === id);
  const current = state.items[index];
  if (!current) return state;
  const next = update(current);
  if (next === current) return state;
  const items = [...state.items];
  items[index] = next;
  return { ...state, items };
}

function clampRect(rect: Rect, fallback: Rect): Rect {
  return {
    x: finiteOr(rect.x, fallback.x),
    y: finiteOr(rect.y, fallback.y),
    width: Math.max(finiteOr(rect.width, fallback.width), NOTE_MIN_WIDTH),
    height: Math.max(finiteOr(rect.height, fallback.height), NOTE_MIN_HEIGHT),
  };
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function pointsBounds(points: readonly Point[]): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function padded(rect: Rect, by: number): Rect {
  return {
    x: rect.x - by,
    y: rect.y - by,
    width: rect.width + by * 2,
    height: rect.height + by * 2,
  };
}

function readItems(raw: unknown): BoardItem[] {
  if (!Array.isArray(raw)) return [];
  const items: BoardItem[] = [];
  for (const stored of raw) {
    const item = readItem(stored);
    if (item) items.push(item);
  }
  return items;
}

function readItem(raw: unknown): BoardItem | null {
  if (!isRecord(raw)) return null;
  const id = raw['id'];
  if (typeof id !== 'string' || id.length === 0) return null;
  const color = isStrokeColor(raw['color']) ? raw['color'] : DEFAULT_STROKE_COLOR;
  const size = isStrokeWidth(raw['size']) ? raw['size'] : DEFAULT_STROKE_WIDTH;

  switch (raw['type']) {
    case 'note':
      return {
        id,
        type: 'note',
        x: finiteOr(raw['x'], 0),
        y: finiteOr(raw['y'], 0),
        width: Math.max(finiteOr(raw['width'], NOTE_WIDTH), NOTE_MIN_WIDTH),
        height: Math.max(finiteOr(raw['height'], NOTE_HEIGHT), NOTE_MIN_HEIGHT),
        text: typeof raw['text'] === 'string' ? raw['text'] : '',
        // Version 2 notes were all the same paper; they come back as the default.
        color: isNoteColor(raw['color']) ? raw['color'] : DEFAULT_NOTE_COLOR,
        // Notes before version 5 had no font of their own, and a font that is
        // no longer on the list falls back the same way: to the default.
        ...(isFontName(raw['font']) ? { font: raw['font'] } : {}),
      };
    case 'stroke': {
      const points = readPoints(raw['points']);
      // A stroke with nothing in it would draw nothing and could never be erased.
      if (points.length === 0) return null;
      return { id, type: 'stroke', points, color, size };
    }
    case 'shape': {
      if (!isShapeKind(raw['shape'])) return null;
      return {
        id,
        type: 'shape',
        shape: raw['shape'],
        a: readPoint(raw['a']),
        b: readPoint(raw['b']),
        color,
        size,
        seed: Math.trunc(finiteOr(raw['seed'], 1)),
      };
    }
    case 'text':
      return {
        id,
        type: 'text',
        x: finiteOr(raw['x'], 0),
        y: finiteOr(raw['y'], 0),
        text: typeof raw['text'] === 'string' ? raw['text'] : '',
        color,
        size,
      };
    default:
      return null;
  }
}

function readPoints(raw: unknown): InkPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: InkPoint[] = [];
  for (const entry of raw) {
    if (!Array.isArray(entry)) continue;
    const [x, y] = entry;
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    points.push([x, y]);
  }
  return points;
}

function readPoint(raw: unknown): Point {
  if (!isRecord(raw)) return { x: 0, y: 0 };
  return { x: finiteOr(raw['x'], 0), y: finiteOr(raw['y'], 0) };
}

function normalizeViewport(raw: unknown, fallback: Viewport): Viewport {
  if (!isRecord(raw)) return { ...fallback };
  return {
    x: finiteOr(raw['x'], fallback.x),
    y: finiteOr(raw['y'], fallback.y),
    zoom: clampZoom(finiteOr(raw['zoom'], fallback.zoom)),
  };
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
