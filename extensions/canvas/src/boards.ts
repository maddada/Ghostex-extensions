/**
 * The board index: which boards exist, what they are called, which one is open,
 * and which project each belongs to.
 *
 * A board's contents live in its own `board:<id>` key; this index is the only
 * place its name and project link are kept, so the two can never drift apart.
 * Every function here is pure — the app writes the returned index to storage.
 */

import { DEFAULT_BOARD_ID } from './board.js';
import { isRecord } from './stored.js';

/** Bumped whenever the stored index shape changes; `readIndex` migrates. */
export const INDEX_SCHEMA_VERSION = 1;

export const BOARDS_STORAGE_KEY = 'boards';
export const DEFAULT_BOARD_NAME = 'Canvas';
/** Long enough for a real title, short enough to stay readable in the switcher. */
export const MAX_BOARD_NAME_LENGTH = 60;

export interface BoardSummary {
  id: string;
  name: string;
  /** The Ghostex project this board is linked to, or null when it is free. */
  projectId: string | null;
}

export interface BoardsIndex {
  schemaVersion: number;
  /** Display order: the order boards were created in. */
  boards: BoardSummary[];
  /** The board to reopen. Always the id of one of `boards`. */
  lastOpen: string;
}

/** Ids only have to be unique within one install, and installs are single-user. */
let idCounter = 0;
export function nextBoardId(): string {
  idCounter += 1;
  return `b${Date.now().toString(36)}${idCounter.toString(36)}`;
}

/** The index a first run starts from: one board, the one the skeleton wrote. */
export function createIndex(): BoardsIndex {
  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    boards: [{ id: DEFAULT_BOARD_ID, name: DEFAULT_BOARD_NAME, projectId: null }],
    lastOpen: DEFAULT_BOARD_ID,
  };
}

export function currentBoard(index: BoardsIndex): BoardSummary {
  return index.boards.find((board) => board.id === index.lastOpen) ?? firstBoard(index);
}

export function boardForProject(index: BoardsIndex, projectId: string): BoardSummary | null {
  return index.boards.find((board) => board.projectId === projectId) ?? null;
}

/** Marks `id` as the board to show now and to reopen next time. */
export function openBoard(index: BoardsIndex, id: string): BoardsIndex {
  if (id === index.lastOpen || !index.boards.some((board) => board.id === id)) return index;
  return { ...index, lastOpen: id };
}

export function addBoard(
  index: BoardsIndex,
  name: string,
  projectId: string | null = null,
  id: string = nextBoardId(),
): { index: BoardsIndex; board: BoardSummary } {
  const board: BoardSummary = { id, name: cleanName(name), projectId };
  // A project has at most one board, so a new linked board takes the link over.
  const boards = projectId === null ? index.boards : unlinkProject(index.boards, projectId);
  return {
    index: { ...index, boards: [...boards, board], lastOpen: board.id },
    board,
  };
}

export function renameBoard(index: BoardsIndex, id: string, name: string): BoardsIndex {
  const cleaned = cleanName(name);
  return replaceBoard(index, id, (board) =>
    board.name === cleaned ? board : { ...board, name: cleaned },
  );
}

/**
 * Links a board to a project, or unlinks it when `projectId` is null. Linking
 * moves the link: the project's previous board keeps its contents, unlinked.
 */
export function setBoardProject(
  index: BoardsIndex,
  id: string,
  projectId: string | null,
): BoardsIndex {
  if (!index.boards.some((board) => board.id === id)) return index;
  const boards = projectId === null ? index.boards : unlinkProject(index.boards, projectId);
  return {
    ...index,
    boards: boards.map((board) => (board.id === id ? { ...board, projectId } : board)),
  };
}

/**
 * Drops a board from the index. Canvas always has a board open, so deleting the
 * last one leaves a fresh empty board in its place rather than an empty app.
 */
export function deleteBoard(
  index: BoardsIndex,
  id: string,
  replacementId: string = nextBoardId(),
): BoardsIndex {
  const doomed = index.boards.findIndex((board) => board.id === id);
  if (doomed === -1) return index;

  const boards = index.boards.filter((board) => board.id !== id);
  if (boards.length === 0) {
    return {
      ...index,
      boards: [{ id: replacementId, name: DEFAULT_BOARD_NAME, projectId: null }],
      lastOpen: replacementId,
    };
  }

  // Deleting the open board lands on its neighbour, the way closing a tab does.
  const neighbour = boards[Math.min(doomed, boards.length - 1)] ?? boards[0];
  const lastOpen = index.lastOpen === id ? (neighbour?.id ?? '') : index.lastOpen;
  return { ...index, boards, lastOpen };
}

/**
 * Turns whatever storage returned into a usable index.
 *
 * The store is shared, hand-editable JSON, so every field is coerced rather
 * than trusted, and anything unreadable falls back to a fresh index.
 */
export function readIndex(raw: unknown): BoardsIndex {
  if (!isRecord(raw)) return createIndex();
  const version = typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 0;
  if (version < 1) return createIndex();

  const boards = readBoards(raw['boards']);
  if (boards.length === 0) return createIndex();

  const lastOpen = typeof raw['lastOpen'] === 'string' ? raw['lastOpen'] : '';
  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    boards,
    lastOpen: boards.some((board) => board.id === lastOpen) ? lastOpen : (boards[0]?.id ?? ''),
  };
}

/** Trims a typed name and caps it; an empty one falls back to the default. */
export function cleanName(name: string): string {
  const trimmed = name.trim().slice(0, MAX_BOARD_NAME_LENGTH).trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_BOARD_NAME;
}

function firstBoard(index: BoardsIndex): BoardSummary {
  return index.boards[0] ?? { id: DEFAULT_BOARD_ID, name: DEFAULT_BOARD_NAME, projectId: null };
}

function replaceBoard(
  index: BoardsIndex,
  id: string,
  update: (board: BoardSummary) => BoardSummary,
): BoardsIndex {
  const position = index.boards.findIndex((board) => board.id === id);
  const current = index.boards[position];
  if (!current) return index;
  const next = update(current);
  if (next === current) return index;
  const boards = [...index.boards];
  boards[position] = next;
  return { ...index, boards };
}

function unlinkProject(boards: readonly BoardSummary[], projectId: string): BoardSummary[] {
  return boards.map((board) => (board.projectId === projectId ? { ...board, projectId: null } : board));
}

function readBoards(raw: unknown): BoardSummary[] {
  if (!Array.isArray(raw)) return [];
  const boards: BoardSummary[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = entry['id'];
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    const name = entry['name'];
    const projectId = entry['projectId'];
    boards.push({
      id,
      name: typeof name === 'string' ? cleanName(name) : DEFAULT_BOARD_NAME,
      projectId: typeof projectId === 'string' && projectId.length > 0 ? projectId : null,
    });
  }
  return boards;
}
