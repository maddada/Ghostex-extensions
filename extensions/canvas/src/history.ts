/**
 * Undo, redo and selection: the session layer wrapped around the board reducer.
 *
 * Everything the user does goes through `sessionReducer`. Edits push the board
 * they replaced onto `past`, along with what was selected at the time, so
 * undoing a delete hands the items back selected; undo and redo move entries
 * between the two stacks. History is deliberately not persisted — a reload is
 * a fresh session, and only the board itself is stored.
 */

import {
  boardReducer,
  isUndoable,
  type BoardAction,
  type BoardDocument,
} from './board.js';

/** Deep enough that no real session hits it, shallow enough to stay cheap. */
export const HISTORY_LIMIT = 100;

/** One step of history: the board as it was, and what was selected on it. */
export interface HistoryEntry {
  document: BoardDocument;
  selection: string[];
}

export interface BoardSession {
  document: BoardDocument;
  /** Steps to go back to, oldest first. */
  past: HistoryEntry[];
  /** Steps undo took away, oldest first. */
  future: HistoryEntry[];
  selection: string[];
  /** The gesture currently folding its steps into the newest history entry. */
  gesture: string | null;
}

export type SessionAction =
  | BoardAction
  | { type: 'history/undo' }
  | { type: 'history/redo' }
  | { type: 'selection/changed'; ids: string[] }
  /** Shift-click: one item joins the selection, or leaves it if it was there. */
  | { type: 'selection/toggled'; id: string };

export function createSession(document: BoardDocument): BoardSession {
  return { document, past: [], future: [], selection: [], gesture: null };
}

export function canUndo(session: BoardSession): boolean {
  return session.past.length > 0;
}

export function canRedo(session: BoardSession): boolean {
  return session.future.length > 0;
}

export function sessionReducer(state: BoardSession, action: SessionAction): BoardSession {
  switch (action.type) {
    case 'history/undo': {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        document: keepView(previous.document, state.document),
        past: state.past.slice(0, -1),
        future: [...state.future, entryOf(state)],
        selection: onBoard(previous.selection, previous.document),
        gesture: null,
      };
    }
    case 'history/redo': {
      const next = state.future.at(-1);
      if (!next) return state;
      return {
        document: keepView(next.document, state.document),
        past: [...state.past, entryOf(state)],
        future: state.future.slice(0, -1),
        selection: onBoard(next.selection, next.document),
        gesture: null,
      };
    }
    case 'selection/changed': {
      const selection = onBoard(action.ids, state.document);
      if (sameIds(selection, state.selection)) return state;
      return { ...state, selection };
    }
    case 'selection/toggled': {
      if (!onBoard([action.id], state.document).length) return state;
      const selection = state.selection.includes(action.id)
        ? state.selection.filter((id) => id !== action.id)
        : [...state.selection, action.id];
      return { ...state, selection };
    }
    // Opening another board is not an edit of this one: its history starts empty.
    case 'board/loaded':
      return createSession(action.document);
    default:
      return applyEdit(state, action);
  }
}

/**
 * History holds what is on the board, not where the user is looking: stepping
 * back through edits must never teleport the view somewhere else.
 */
function keepView(restored: BoardDocument, current: BoardDocument): BoardDocument {
  if (restored.viewport === current.viewport) return restored;
  return { ...restored, viewport: current.viewport };
}

function applyEdit(state: BoardSession, action: BoardAction): BoardSession {
  const document = boardReducer(state.document, action);
  if (document === state.document) return state;
  if (!isUndoable(action)) return { ...state, document };

  const gesture = gestureOf(action);
  // One drag, resize or typing burst is one undo step, not one per event.
  const folds = gesture !== null && gesture === state.gesture;

  return {
    document,
    past: folds ? state.past : [...state.past, entryOf(state)].slice(-HISTORY_LIMIT),
    future: [],
    selection: onBoard(state.selection, document),
    gesture,
  };
}

function entryOf(state: BoardSession): HistoryEntry {
  return { document: state.document, selection: state.selection };
}

function gestureOf(action: BoardAction): string | null {
  return 'gesture' in action && typeof action.gesture === 'string' ? action.gesture : null;
}

function onBoard(ids: readonly string[], document: BoardDocument): string[] {
  return ids.filter((id) => document.items.some((item) => item.id === id));
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
