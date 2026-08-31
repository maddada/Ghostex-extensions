/**
 * The Canvas view: named boards of sticky notes and drawings on an infinite
 * pan and zoom surface, autosaved to Ghostex.
 *
 * The imperative canvas core lives in `interactions.ts` and `viewport.ts`, the
 * open board and its undo stack in `board.ts` and `history.ts`, the list of
 * boards in `boards.ts`, the drawing maths in `drawing.ts`; Preact renders the
 * chrome, the transformed world layer, and the notes, labels and ink on it.
 * This module is the one place they meet: it loads them, keeps them in step,
 * and hands every change to `persistence.ts`.
 */

import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
  adjustBackground,
  createBackground,
  backgroundStyle,
  isImageFile,
  resetLook,
  shrinkImage,
  type BoardBackground,
  type LookKey,
} from './background.js';
import {
  readProject,
  type BridgeContext,
  type GhostexBridge,
  type HostProject,
} from './bridge.js';
import {
  DEFAULT_STROKE_COLOR,
  DEFAULT_STROKE_WIDTH,
  boardBounds,
  createBoard,
  createLabel,
  createNote,
  createShape,
  createStroke,
  isDrawn,
  nextItemId,
  nextNoteColor,
  nextSeed,
  toggleTask,
  type BoardDocument,
  type InkPoint,
  type NoteColor,
  type Rect,
  type ShapeKind,
  type StrokeColor,
  type StrokeWidth,
  type TextItem,
} from './board.js';
import {
  addBoard,
  currentBoard,
  deleteBoard,
  openBoard,
  renameBoard,
  setBoardProject,
  type BoardsIndex,
} from './boards.js';
import { constrain, erasedAlong, normalize, simplifyStroke } from './drawing.js';
import { copyText, formatBoardExport } from './export.js';
import { fontStack, type FontName } from './fonts.js';
import { Ink, type Draft } from './ink.js';
import {
  CLICK_SLOP_PX,
  attachCanvasInteractions,
  type InteractionHost,
} from './interactions.js';
import {
  createSession,
  sessionReducer,
  type BoardSession,
  type SessionAction,
} from './history.js';
import { Label } from './label.js';
import { Note } from './note.js';
import {
  createAutosave,
  loadBackground,
  loadBoard,
  loadIndex,
  loadSettings,
  type Autosave,
  type SaveStatus,
} from './persistence.js';
import { drawnItemAt, itemsInside } from './selection.js';
import { createSettings, setDefaultFont, type CanvasSettings } from './settings.js';
import { SettingsPanel } from './settings-panel.js';
import { Switcher } from './switcher.js';
import {
  DEFAULT_TOOL,
  Toolbar,
  isDrawingTool,
  isShapeTool,
  type ToolName,
} from './toolbar.js';
import {
  DEFAULT_VIEWPORT,
  fitToBounds,
  gridStep,
  resetZoomAt,
  surfaceToWorld,
  worldToSurface,
  wrap,
  zoomInAt,
  zoomOutAt,
  zoomPercent,
  type Point,
  type Viewport,
} from './viewport.js';

const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: 'Loading…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved',
  unavailable: 'No host storage',
};

/** How long a message about something that just happened stays on screen. */
const TOAST_MS = 2600;

/**
 * Drawing tolerances, in screen pixels: each one is divided by the zoom before
 * it is used, so a gesture feels the same however far in or out the board is.
 */
/** Ink samples closer together than this are dropped before the stroke is stored. */
const INK_SAMPLE_PX = 2;
/** How near the eraser has to pass an item to take it. */
const ERASER_REACH_PX = 10;
/** A shape drag shorter than this was a click, and leaves nothing behind. */
const MIN_SHAPE_DRAG_PX = 4;
/** How near a Select press has to land on a stroke or shape to pick it up. */
const SELECT_REACH_PX = 8;

/** A drawing or erasing gesture in flight, held outside Preact's state. */
type DrawGesture =
  | { kind: 'ink'; pointerId: number; id: string; points: InkPoint[] }
  | {
      kind: 'shape';
      pointerId: number;
      id: string;
      seed: number;
      shape: ShapeKind;
      origin: Point;
    }
  | { kind: 'erase'; pointerId: number; gesture: string; last: Point };

/**
 * A Select gesture in flight: an item being carried, with whatever is selected
 * alongside it, or a marquee being dragged out over the board.
 */
type SelectGesture =
  | {
      kind: 'move';
      pointerId: number;
      id: string;
      gesture: string;
      origin: Point;
      last: Point;
      moved: boolean;
      additive: boolean;
    }
  | {
      kind: 'marquee';
      pointerId: number;
      origin: Point;
      /** What shift is adding to; empty for a plain marquee. */
      base: string[];
      additive: boolean;
      moved: boolean;
    };

/** The note or label the keyboard is writing into. */
interface Editing {
  id: string;
  /** Folds the whole typing burst into one undo step. */
  gesture: string;
}

/** Filled in by the mounted app so the caller can await and flush it. */
interface AppBindings {
  flush(): Promise<void>;
  markReady(): void;
}

export interface CanvasHandle {
  /** Resolves once the stored board has been loaded and rendered. */
  ready: Promise<void>;
  /** Writes any debounced board straight away. */
  flush(): Promise<void>;
  unmount(): void;
}

export function mountCanvas(root: HTMLElement, bridge: GhostexBridge | null): CanvasHandle {
  let markReady = (): void => {};
  const ready = new Promise<void>((resolve) => {
    markReady = resolve;
  });
  const bindings: AppBindings = {
    flush: async () => {},
    markReady: () => markReady(),
  };

  render(<CanvasApp bridge={bridge} bindings={bindings} />, root);

  return {
    ready,
    flush: () => bindings.flush(),
    unmount: () => render(null, root),
  };
}

function CanvasApp({ bridge, bindings }: { bridge: GhostexBridge | null; bindings: AppBindings }) {
  const storage = bridge?.storage ?? null;
  const [session, setSession] = useState<BoardSession | null>(null);
  const [index, setIndex] = useState<BoardsIndex | null>(null);
  const [project, setProject] = useState<HostProject | null>(null);
  const [status, setStatus] = useState<SaveStatus>('loading');
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [tool, setTool] = useState<ToolName>(DEFAULT_TOOL);
  const [strokeColor, setStrokeColor] = useState<StrokeColor>(DEFAULT_STROKE_COLOR);
  const [strokeSize, setStrokeSize] = useState<StrokeWidth>(DEFAULT_STROKE_WIDTH);
  /** The stroke or shape under the pointer, drawn but not yet on the board. */
  const [draft, setDraft] = useState<Draft | null>(null);
  /**
   * A label that has been placed but not written in yet. It only reaches the
   * board once it says something, so putting one down and changing your mind
   * leaves nothing behind and nothing in the undo stack.
   */
  const [pendingLabel, setPendingLabel] = useState<TextItem | null>(null);
  /** The box being dragged out in Select, in world units. */
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [settings, setSettings] = useState<CanvasSettings>(createSettings);
  /** The open board's background, or null when it has none. */
  const [background, setBackground] = useState<BoardBackground | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Why the last picture could not become the background, shown in the panel. */
  const [importError, setImportError] = useState<string | null>(null);
  /** A file is being dragged over the board. */
  const [dropping, setDropping] = useState(false);
  /** What just happened, said briefly over the board, or null for nothing. */
  const [toast, setToast] = useState<string | null>(null);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<BoardSession | null>(null);
  const indexRef = useRef<BoardsIndex | null>(null);
  const settingsRef = useRef<CanvasSettings>(createSettings());
  const backgroundRef = useRef<BoardBackground | null>(null);
  /** Drag enters and leaves nest as the file crosses the board's children. */
  const dragDepth = useRef(0);
  /** The timer clearing the current toast, so a second one restarts the wait. */
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingRef = useRef<Editing | null>(null);
  const pendingLabelRef = useRef<TextItem | null>(null);
  const drawRef = useRef<DrawGesture | null>(null);
  const selectRef = useRef<SelectGesture | null>(null);
  /** The run of arrow-key repeats being folded into one undo step. */
  const nudgeRef = useRef<string | null>(null);
  const gestureCount = useRef(0);
  // A board, or an index, that failed to load must never be saved over.
  const savingBlockedRef = useRef(false);
  const indexBlockedRef = useRef(false);

  const autosave: Autosave = useMemo(() => createAutosave(storage, setStatus), [storage]);

  useEffect(() => {
    bindings.flush = () => autosave.flush();
  }, [autosave, bindings]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [stored, prefs] = await Promise.all([loadIndex(storage), loadSettings(storage)]);
      const [document, backdrop] = await Promise.all([
        loadBoard(storage, stored.value.lastOpen),
        loadBackground(storage, stored.value.lastOpen),
      ]);
      if (cancelled) return;

      const loaded = createSession(document.value);
      sessionRef.current = loaded;
      indexRef.current = stored.value;
      settingsRef.current = prefs;
      backgroundRef.current = backdrop;
      savingBlockedRef.current = document.failed;
      indexBlockedRef.current = stored.failed;
      setSession(loaded);
      setIndex(stored.value);
      setSettings(prefs);
      setBackground(backdrop);

      if (document.failed || stored.failed) setStatus('error');
      else if (!storage) setStatus('unavailable');
      else {
        // Writing both back on open is what creates them on a first run.
        autosave.writeIndex(stored.value);
        autosave.schedule(document.value);
      }
      bindings.markReady();
    })();
    return () => {
      cancelled = true;
      autosave.dispose();
    };
  }, [autosave, bindings, storage]);

  /**
   * Which project Ghostex has open. `onContextChange` never replays the current
   * context, so the first value has to be asked for.
   */
  useEffect(() => {
    const read = bridge?.context;
    if (!read) return;
    let cancelled = false;
    const apply = (context: BridgeContext | null): void => {
      if (!cancelled) setProject(readProject(context));
    };
    void read.call(bridge).then(apply, () => apply(null));
    const unsubscribe = bridge?.onContextChange?.call(bridge, apply);
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [bridge]);

  const dispatch = useCallback(
    (action: SessionAction) => {
      const current = sessionRef.current;
      if (!current) return;
      const next = sessionReducer(current, action);
      if (next === current) return;
      sessionRef.current = next;
      setSession(next);
      if (next.document !== current.document && !savingBlockedRef.current) {
        autosave.schedule(next.document);
      }
    },
    [autosave],
  );

  const setViewport = useCallback(
    (viewport: Viewport) => dispatch({ type: 'viewport/changed', viewport }),
    [dispatch],
  );

  const updateIndex = useCallback(
    (next: BoardsIndex) => {
      if (next === indexRef.current) return;
      indexRef.current = next;
      setIndex(next);
      if (!indexBlockedRef.current) autosave.writeIndex(next);
    },
    [autosave],
  );

  const startGesture = useCallback((kind: string): string => {
    gestureCount.current += 1;
    return `${kind}#${gestureCount.current}`;
  }, []);

  const setLabelDraft = useCallback((label: TextItem | null) => {
    pendingLabelRef.current = label;
    setPendingLabel(label);
  }, []);

  const startEditing = useCallback(
    (id: string) => {
      const next: Editing = { id, gesture: startGesture(`text:${id}`) };
      editingRef.current = next;
      setEditing(next);
    },
    [startGesture],
  );

  /**
   * Stops typing. A label that was placed and never written in goes away; one
   * that says something joins the board as a single undoable addition.
   */
  const stopEditing = useCallback(() => {
    editingRef.current = null;
    setEditing(null);
    const label = pendingLabelRef.current;
    if (!label) return;
    setLabelDraft(null);
    if (label.text.trim().length > 0) dispatch({ type: 'item/added', item: label });
  }, [dispatch, setLabelDraft]);

  /** Drops anything half-drawn or half-typed, without putting it on the board. */
  const abandonDrafts = useCallback(() => {
    drawRef.current = null;
    setDraft(null);
    selectRef.current = null;
    setMarquee(null);
    editingRef.current = null;
    setEditing(null);
    setLabelDraft(null);
  }, [setLabelDraft]);

  /** Puts a board on screen with a fresh undo stack: it is not an edit. */
  const showBoard = useCallback(
    (document: BoardDocument, failed: boolean) => {
      savingBlockedRef.current = failed;
      dispatch({ type: 'board/loaded', document });
      if (failed) setStatus('error');
    },
    [dispatch],
  );

  const showBackground = useCallback((next: BoardBackground | null) => {
    backgroundRef.current = next;
    setBackground(next);
  }, []);

  /** A board and its background, loaded side by side. */
  const loadBoardWithBackground = useCallback(
    (id: string) => Promise.all([loadBoard(storage, id), loadBackground(storage, id)]),
    [storage],
  );

  const openBoardById = useCallback(
    async (id: string) => {
      if (id === indexRef.current?.lastOpen) return;
      abandonDrafts();
      // The board being left keeps what was typed into it a keystroke ago.
      await autosave.flush();
      const [{ value, failed }, backdrop] = await loadBoardWithBackground(id);
      const current = indexRef.current;
      if (!current) return;
      updateIndex(openBoard(current, id));
      showBoard(value, failed);
      showBackground(backdrop);
    },
    [abandonDrafts, autosave, loadBoardWithBackground, showBackground, showBoard, updateIndex],
  );

  const createNewBoard = useCallback(
    async (name: string, projectId: string | null) => {
      const current = indexRef.current;
      if (!current) return;
      abandonDrafts();
      await autosave.flush();
      const { index: next, board } = addBoard(current, name, projectId);
      updateIndex(next);
      showBoard(createBoard(board.id), false);
      showBackground(null);
    },
    [abandonDrafts, autosave, showBackground, showBoard, updateIndex],
  );

  const renameCurrentBoard = useCallback(
    (name: string) => {
      const current = indexRef.current;
      if (current) updateIndex(renameBoard(current, current.lastOpen, name));
    },
    [updateIndex],
  );

  const linkCurrentBoard = useCallback(
    (projectId: string | null) => {
      const current = indexRef.current;
      if (current) updateIndex(setBoardProject(current, current.lastOpen, projectId));
    },
    [updateIndex],
  );

  /** Says something over the board for a moment. A second call restarts the wait. */
  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      toastTimer.current = null;
      setToast(null);
    }, TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    },
    [],
  );

  /**
   * Puts the open board on the clipboard as JSON. The name comes from the
   * index, which is the only place it lives, and the message says which board
   * was copied — the menu it was clicked in has closed by then.
   */
  const copyCurrentBoard = useCallback(async () => {
    const board = sessionRef.current?.document;
    const current = indexRef.current;
    if (!board || !current) return;
    const { name } = currentBoard(current);
    const copied = await copyText(formatBoardExport(board, name));
    flash(copied ? `Copied “${name}” as JSON.` : 'Could not copy the board.');
  }, [flash]);

  const deleteCurrentBoard = useCallback(async () => {
    const current = indexRef.current;
    if (!current) return;
    const doomed = current.lastOpen;
    abandonDrafts();
    // Anything still debounced belongs to the board that is about to go.
    autosave.discard();
    updateIndex(deleteBoard(current, doomed));
    // Contents and picture both: the picture stops taking room in the store.
    autosave.tombstone(doomed);
    showBackground(null);
    const next = indexRef.current;
    if (!next) return;
    const [{ value, failed }, backdrop] = await loadBoardWithBackground(next.lastOpen);
    showBoard(value, failed);
    showBackground(backdrop);
  }, [abandonDrafts, autosave, loadBoardWithBackground, showBackground, showBoard, updateIndex]);

  /** The default font is one deliberate choice: written the moment it is made. */
  const chooseDefaultFont = useCallback(
    (font: FontName) => {
      const next = setDefaultFont(settingsRef.current, font);
      if (next === settingsRef.current) return;
      settingsRef.current = next;
      setSettings(next);
      autosave.writeSettings(next);
    },
    [autosave],
  );

  /**
   * Makes a picked or dropped picture the open board's background. Shrinking
   * it takes a moment, so the board it was dropped on is pinned down before
   * the wait; if that board has been switched away from or deleted by the time
   * the picture is ready, nothing is written anywhere — not under the board
   * now open, and not under a key nothing will ever read again.
   */
  const importBackground = useCallback(
    async (file: File) => {
      const id = indexRef.current?.lastOpen;
      if (!id) return;
      if (!isImageFile(file)) {
        setImportError(`${file.name || 'That file'} is not a picture Canvas can use. Try a PNG, JPEG or WebP.`);
        setSettingsOpen(true);
        return;
      }
      try {
        const image = await shrinkImage(file);
        if (indexRef.current?.lastOpen !== id) return;
        // A new picture keeps the sliders: they were set for this board, not the old picture.
        const previous = backgroundRef.current;
        const next = previous ? createBackground(image, previous) : createBackground(image);
        showBackground(next);
        autosave.writeBackground(id, next);
        setImportError(null);
      } catch {
        setImportError('Could not read that picture.');
        setSettingsOpen(true);
      }
    },
    [autosave, showBackground],
  );

  /** A slider moves the look, debounced like a drag: one write per adjustment, not per pixel. */
  const adjustLook = useCallback(
    (key: LookKey, value: number) => {
      const current = backgroundRef.current;
      const id = indexRef.current?.lastOpen;
      if (!current || !id) return;
      const next = adjustBackground(current, key, value);
      if (next === current) return;
      showBackground(next);
      autosave.scheduleBackground(id, next);
    },
    [autosave, showBackground],
  );

  const resetBackgroundLook = useCallback(() => {
    const current = backgroundRef.current;
    const id = indexRef.current?.lastOpen;
    if (!current || !id) return;
    const next = resetLook(current);
    if (next === current) return;
    showBackground(next);
    autosave.writeBackground(id, next);
  }, [autosave, showBackground]);

  const removeBackground = useCallback(() => {
    const id = indexRef.current?.lastOpen;
    if (!id || !backgroundRef.current) return;
    showBackground(null);
    setImportError(null);
    autosave.writeBackground(id, null);
  }, [autosave, showBackground]);

  const surfaceSize = useCallback((): { width: number; height: number } => {
    const surface = surfaceRef.current;
    return { width: surface?.clientWidth ?? 0, height: surface?.clientHeight ?? 0 };
  }, []);

  const centerAnchor = useCallback((): Point => {
    const size = surfaceSize();
    return { x: size.width / 2, y: size.height / 2 };
  }, [surfaceSize]);

  const currentZoom = useCallback(
    (): number => sessionRef.current?.document.viewport.zoom ?? DEFAULT_VIEWPORT.zoom,
    [],
  );

  /** Where on the board a pointer is, whatever the pan and zoom are doing. */
  const toWorld = useCallback((event: { clientX: number; clientY: number }): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    const viewport = sessionRef.current?.document.viewport ?? DEFAULT_VIEWPORT;
    return surfaceToWorld(viewport, {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    });
  }, []);

  const addNote = useCallback(
    (center: Point) => {
      const note = createNote(center);
      dispatch({ type: 'item/added', item: note });
      dispatch({ type: 'selection/changed', ids: [note.id] });
      startEditing(note.id);
    },
    [dispatch, startEditing],
  );

  /** Puts a label down ready to type in, and hands the pointer back to Select. */
  const addLabel = useCallback(
    (at: Point) => {
      const label = createLabel(at, strokeColor, strokeSize);
      setLabelDraft(label);
      setTool('select');
      startEditing(label.id);
    },
    [setLabelDraft, startEditing, strokeColor, strokeSize],
  );

  const fitToBoard = useCallback(() => {
    const items = sessionRef.current?.document.items ?? [];
    setViewport(fitToBounds(boardBounds(items), surfaceSize()));
  }, [setViewport, surfaceSize]);

  const setNoteColor = useCallback(
    (ids: string[], color: NoteColor) => {
      if (ids.length === 0) return;
      dispatch({ type: 'note/colored', ids, color });
    },
    [dispatch],
  );

  /** A font of the note's own, or null to follow the default again. */
  const setNoteFont = useCallback(
    (ids: string[], font: FontName | null) => {
      if (ids.length === 0) return;
      dispatch({ type: 'note/font', ids, font });
    },
    [dispatch],
  );

  /** One keystroke moves every selected note to the next paper in the palette. */
  const cycleNoteColor = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const first = session.document.items.find(
      (item) => item.type === 'note' && session.selection.includes(item.id),
    );
    if (first?.type !== 'note') return;
    setNoteColor(session.selection, nextNoteColor(first.color));
  }, [setNoteColor]);

  /**
   * A press on an item, before any drag. Without shift it becomes the
   * selection, unless it already belongs to one: a group is dragged by any of
   * its members. With shift it joins or leaves. Returns whether the item is
   * selected afterwards, which is whether a drag may begin.
   */
  const pressItem = useCallback(
    (id: string, additive: boolean): boolean => {
      const session = sessionRef.current;
      if (!session) return false;
      const held = session.selection.includes(id);
      if (additive) {
        dispatch({ type: 'selection/toggled', id });
        return !held;
      }
      if (!held) dispatch({ type: 'selection/changed', ids: [id] });
      return true;
    },
    [dispatch],
  );

  /**
   * A press that was released without moving, on an item that was one of
   * several: the click meant that one, so the selection narrows to it.
   */
  const clickItem = useCallback(
    (id: string, additive: boolean) => {
      const selection = sessionRef.current?.selection ?? [];
      if (additive || selection.length < 2 || !selection.includes(id)) return;
      dispatch({ type: 'selection/changed', ids: [id] });
    },
    [dispatch],
  );

  /**
   * A checkbox click edits the markdown behind it. Each toggle is its own undo
   * step: it carries no gesture, so it never folds into a typing burst.
   */
  const toggleNoteTask = useCallback(
    (id: string, task: number) => {
      const note = sessionRef.current?.document.items.find((item) => item.id === id);
      if (note?.type !== 'note') return;
      dispatch({ type: 'item/edited', id, text: toggleTask(note.text, task) });
    },
    [dispatch],
  );

  /**
   * A dragged item reports where it wants to be; the distance it asks for is
   * what the whole selection moves by, so a group follows the one being held.
   */
  const moveItemTo = useCallback(
    (id: string, position: Point, gesture: string) => {
      const session = sessionRef.current;
      const item = session?.document.items.find((entry) => entry.id === id);
      if (!session || item?.type !== 'note') return;
      const ids = session.selection.includes(id) ? session.selection : [id];
      dispatch({
        type: 'items/moved',
        ids,
        dx: position.x - item.x,
        dy: position.y - item.y,
        gesture,
      });
    },
    [dispatch],
  );

  const deleteSelection = useCallback(() => {
    const ids = sessionRef.current?.selection ?? [];
    if (ids.length === 0) return;
    stopEditing();
    dispatch({ type: 'items/deleted', ids });
  }, [dispatch, stopEditing]);

  /**
   * Puts a tool in hand, closing whatever was being typed into. A drawing tool
   * lets go of the selection, as Excalidraw's do: the boxes would only sit in
   * the way of the drawing.
   */
  const pickTool = useCallback(
    (next: ToolName) => {
      stopEditing();
      setTool(next);
      if (next !== 'select') dispatch({ type: 'selection/changed', ids: [] });
    },
    [dispatch, stopEditing],
  );

  /** Escape: back to Select, holding nothing, with anything half-made dropped. */
  const escape = useCallback(() => {
    abandonDrafts();
    setTool('select');
    dispatch({ type: 'selection/changed', ids: [] });
  }, [abandonDrafts, dispatch]);

  /**
   * An arrow key moves the selection a step. A held key repeats into the same
   * gesture, so letting go and pressing again is the next undo step.
   */
  const nudgeSelection = useCallback(
    (dx: number, dy: number, continues: boolean) => {
      const ids = sessionRef.current?.selection ?? [];
      if (ids.length === 0) return;
      if (!continues || nudgeRef.current === null) nudgeRef.current = startGesture('nudge');
      dispatch({ type: 'items/moved', ids, dx, dy, gesture: nudgeRef.current });
    },
    [dispatch, startGesture],
  );

  /** Everything on the board, and the Select tool to do something with it. */
  const selectAll = useCallback(() => {
    const items = sessionRef.current?.document.items ?? [];
    if (items.length === 0) return;
    stopEditing();
    setTool('select');
    dispatch({ type: 'selection/changed', ids: items.map((item) => item.id) });
  }, [dispatch, stopEditing]);

  const undo = useCallback(() => {
    abandonDrafts();
    dispatch({ type: 'history/undo' });
  }, [abandonDrafts, dispatch]);

  const redo = useCallback(() => {
    abandonDrafts();
    dispatch({ type: 'history/redo' });
  }, [abandonDrafts, dispatch]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const host: InteractionHost = {
      getViewport: () => sessionRef.current?.document.viewport ?? DEFAULT_VIEWPORT,
      setViewport,
      getSurfaceSize: surfaceSize,
      setPanning,
      setSpaceHeld,
      fitToBoard,
      deleteSelection,
      selectAll,
      setTool: pickTool,
      escape,
      nudgeSelection,
      cycleNoteColor,
      undo,
      redo,
    };
    return attachCanvasInteractions(surface, host);
  }, [
    cycleNoteColor,
    deleteSelection,
    escape,
    fitToBoard,
    nudgeSelection,
    pickTool,
    redo,
    selectAll,
    setViewport,
    surfaceSize,
    undo,
  ]);

  /** Everything the eraser is allowed to take: ink, shapes and labels, never a note. */
  const drawnItems = useCallback(
    () => (sessionRef.current?.document.items ?? []).filter(isDrawn),
    [],
  );

  function beginDraw(event: PointerEvent): void {
    const at = toWorld(event);
    if (tool === 'pen') {
      const id = nextItemId();
      const points: InkPoint[] = [[at.x, at.y]];
      drawRef.current = { kind: 'ink', pointerId: event.pointerId, id, points };
      setDraft(createStroke([...points], strokeColor, strokeSize, id));
    } else if (isShapeTool(tool)) {
      const id = nextItemId();
      const seed = nextSeed();
      drawRef.current = { kind: 'shape', pointerId: event.pointerId, id, seed, shape: tool, origin: at };
      setDraft(createShape(tool, at, at, strokeColor, strokeSize, id, seed));
    } else if (tool === 'eraser') {
      const gesture = startGesture('erase');
      drawRef.current = { kind: 'erase', pointerId: event.pointerId, gesture, last: at };
      eraseTo(at, at, gesture);
    } else {
      return;
    }
    surfaceRef.current?.setPointerCapture?.(event.pointerId);
  }

  function eraseTo(from: Point, to: Point, gesture: string): void {
    const ids = erasedAlong(drawnItems(), from, to, ERASER_REACH_PX / currentZoom());
    if (ids.length > 0) dispatch({ type: 'items/deleted', ids, gesture });
  }

  function continueDraw(event: PointerEvent): void {
    const active = drawRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const at = toWorld(event);
    if (active.kind === 'ink') {
      active.points.push([at.x, at.y]);
      setDraft(createStroke([...active.points], strokeColor, strokeSize, active.id));
    } else if (active.kind === 'shape') {
      const end = event.shiftKey ? constrain(active.shape, active.origin, at) : at;
      setDraft(
        createShape(active.shape, active.origin, end, strokeColor, strokeSize, active.id, active.seed),
      );
    } else {
      eraseTo(active.last, at, active.gesture);
      active.last = at;
    }
  }

  function endDraw(event: PointerEvent, commit: boolean): void {
    const active = drawRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drawRef.current = null;
    setDraft(null);
    if (surfaceRef.current?.hasPointerCapture?.(event.pointerId)) {
      surfaceRef.current.releasePointerCapture(event.pointerId);
    }
    if (!commit) return;

    const zoom = currentZoom();
    if (active.kind === 'ink') {
      const points = simplifyStroke(active.points, INK_SAMPLE_PX / zoom);
      dispatch({
        type: 'item/added',
        item: createStroke(points, strokeColor, strokeSize, active.id),
      });
    } else if (active.kind === 'shape') {
      const at = toWorld(event);
      const end = event.shiftKey ? constrain(active.shape, active.origin, at) : at;
      // A click that never became a drag leaves nothing behind.
      const dragged = Math.hypot(end.x - active.origin.x, end.y - active.origin.y);
      if (dragged < MIN_SHAPE_DRAG_PX / zoom) return;
      dispatch({
        type: 'item/added',
        item: createShape(
          active.shape,
          active.origin,
          end,
          strokeColor,
          strokeSize,
          active.id,
          active.seed,
        ),
      });
    }
  }

  /**
   * A Select press: on a label or on the board itself. A stroke or shape is
   * found by asking the document what is under the pointer, because the ink
   * layer never takes one. What it lands on is picked up; empty board starts
   * a marquee. Notes press themselves, and stop the event on its way here.
   */
  function beginSelect(event: PointerEvent): void {
    const labelId = labelUnder(event.target);
    if (!labelId && !onBackground(event.target)) return;
    // The label being typed into keeps its pointer.
    if (labelId && editingRef.current?.id === labelId) return;
    const at = toWorld(event);
    startSelect(event, at, labelId ?? inkAt(at)?.id ?? null);
  }

  /** The stroke or shape under a world point, within a Select press's reach. */
  function inkAt(at: Point): { id: string } | null {
    const items = sessionRef.current?.document.items ?? [];
    return drawnItemAt(items, at, SELECT_REACH_PX / currentZoom());
  }

  /**
   * Ink is painted above notes, so a press on a note's paper where a stroke or
   * shape crosses it belongs to the ink, the way Excalidraw picks the topmost
   * thing. This runs in the capture phase, before the note can claim the
   * press, and only where the note's own controls are not the target.
   */
  function claimInkOverNote(event: PointerEvent): void {
    if (event.button !== 0 || spaceHeld || drawing) return;
    if (!onNotePaper(event.target)) return;
    const at = toWorld(event);
    const hit = inkAt(at);
    if (!hit) return;
    event.stopPropagation();
    startSelect(event, at, hit.id);
  }

  /** A Select press that has found what it landed on: carry `hit`, or open a marquee. */
  function startSelect(event: PointerEvent, at: Point, hit: string | null): void {
    if (!sessionRef.current) return;
    stopEditing();
    if (hit) {
      if (!pressItem(hit, event.shiftKey)) return;
      selectRef.current = {
        kind: 'move',
        pointerId: event.pointerId,
        id: hit,
        gesture: startGesture(`move:${hit}`),
        origin: at,
        last: at,
        moved: false,
        additive: event.shiftKey,
      };
    } else {
      const additive = event.shiftKey;
      selectRef.current = {
        kind: 'marquee',
        pointerId: event.pointerId,
        origin: at,
        base: additive ? (sessionRef.current?.selection ?? []) : [],
        additive,
        moved: false,
      };
    }
    surfaceRef.current?.setPointerCapture?.(event.pointerId);
  }

  function continueSelect(event: PointerEvent): void {
    const active = selectRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const at = toWorld(event);
    const slop = CLICK_SLOP_PX / currentZoom();
    // Nothing moves, and no marquee opens, until the press has clearly become a drag.
    if (!active.moved && Math.hypot(at.x - active.origin.x, at.y - active.origin.y) < slop) return;
    active.moved = true;
    if (active.kind === 'move') {
      const dx = at.x - active.last.x;
      const dy = at.y - active.last.y;
      if (dx === 0 && dy === 0) return;
      active.last = at;
      const ids = sessionRef.current?.selection ?? [];
      dispatch({ type: 'items/moved', ids, dx, dy, gesture: active.gesture });
      return;
    }
    const box = normalize(active.origin, at);
    setMarquee(box);
    const inside = itemsInside(sessionRef.current?.document.items ?? [], box);
    dispatch({ type: 'selection/changed', ids: union(active.base, inside) });
  }

  /** `clicked` is false for a cancelled pointer: it was neither a drag nor a click. */
  function endSelect(event: PointerEvent, clicked: boolean): void {
    const active = selectRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    selectRef.current = null;
    setMarquee(null);
    if (surfaceRef.current?.hasPointerCapture?.(event.pointerId)) {
      surfaceRef.current.releasePointerCapture(event.pointerId);
    }
    if (active.moved || !clicked) return;
    // A press that never moved was a click: on an item it picks that one out,
    // on empty board it lets go of everything.
    if (active.kind === 'move') clickItem(active.id, active.additive);
    else if (!active.additive) dispatch({ type: 'selection/changed', ids: [] });
  }

  const board = session?.document ?? null;
  const viewport = board?.viewport ?? DEFAULT_VIEWPORT;
  const step = gridStep(viewport.zoom);
  const drawing = isDrawingTool(tool);
  const classes = ['canvas'];
  if (drawing) classes.push('canvas--drawing');
  if (tool === 'eraser') classes.push('canvas--erasing');
  if (panning) classes.push('canvas--panning');
  else if (spaceHeld) classes.push('canvas--grab');
  if (dropping) classes.push('canvas--dropping');
  const labels = [...(board?.items ?? []).filter(isText), ...(pendingLabel ? [pendingLabel] : [])];

  return (
    <div
      class={classes.join(' ')}
      ref={surfaceRef}
      role="application"
      aria-label="Canvas board"
      onPointerDownCapture={claimInkOverNote}
      // The board's default font, as a token the notes and labels read.
      style={`--text-font: ${fontStack(settings.font)}`}
      onDragEnter={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDropping(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        // Without this the browser refuses the drop and opens the file instead.
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDropping(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDropping(false);
        const file = draggedFile(event);
        if (file) void importBackground(file);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || spaceHeld) return;
        if (drawing) {
          stopEditing();
          if (tool === 'text') addLabel(toWorld(event));
          else beginDraw(event);
          return;
        }
        beginSelect(event);
      }}
      onPointerMove={(event) => {
        continueDraw(event);
        continueSelect(event);
      }}
      onPointerUp={(event) => {
        endDraw(event, true);
        endSelect(event, true);
      }}
      onPointerCancel={(event) => {
        endDraw(event, false);
        endSelect(event, false);
      }}
      onDblClick={(event) => {
        if (drawing || !onBackground(event.target)) return;
        addNote(toWorld(event));
      }}
    >
      {background ? (
        <img
          class="canvas__backdrop"
          data-testid="canvas-backdrop"
          src={background.image}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={backgroundStyle(background)}
        />
      ) : null}
      <div
        class="canvas__grid"
        aria-hidden="true"
        style={{
          backgroundSize: `${step}px ${step}px`,
          backgroundPosition: `${wrap(viewport.x, step)}px ${wrap(viewport.y, step)}px`,
        }}
      />
      {dropping ? (
        <div class="canvas__drop" aria-hidden="true">
          Drop to make this the board's background
        </div>
      ) : null}
      <div
        class="canvas__world"
        data-testid="canvas-world"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {board?.items.map((item) =>
          item.type === 'note' ? (
            <Note
              key={item.id}
              note={item}
              selected={session?.selection.includes(item.id) ?? false}
              editing={editing?.id === item.id}
              zoom={viewport.zoom}
              locked={spaceHeld || drawing}
              toWorld={toWorld}
              onSelect={pressItem}
              onClick={clickItem}
              onEdit={startEditing}
              onEditEnd={stopEditing}
              onMove={(id, position, gesture) => moveItemTo(id, position, gesture)}
              onResize={(id, rect, gesture) => dispatch({ type: 'note/resized', id, rect, gesture })}
              onColor={(id, color) => setNoteColor([id], color)}
              onFont={(id, font) => setNoteFont([id], font)}
              onToggleTask={toggleNoteTask}
              onText={(id, text) => {
                // The editor only exists because this render put it there, so
                // `editing` is the burst this keystroke belongs to.
                if (editing?.id !== id) return;
                dispatch({ type: 'item/edited', id, text, gesture: editing.gesture });
              }}
              // A format button is one edit of its own: it carries no gesture, so
              // it never folds into the typing burst around it and one undo takes
              // back exactly the button that was pressed.
              onFormat={(id, text) => dispatch({ type: 'item/edited', id, text })}
              onDelete={(id) => {
                stopEditing();
                dispatch({ type: 'items/deleted', ids: [id] });
              }}
              startGesture={startGesture}
            />
          ) : null,
        )}

        {labels.map((item) => (
          <Label
            key={item.id}
            item={item}
            selected={session?.selection.includes(item.id) ?? false}
            editing={editing?.id === item.id}
            zoom={viewport.zoom}
            locked={spaceHeld || drawing}
            onEdit={startEditing}
            onEditEnd={stopEditing}
            onText={(id, text) => {
              if (pendingLabelRef.current?.id === id) {
                setLabelDraft({ ...pendingLabelRef.current, text });
                return;
              }
              if (editing?.id !== id) return;
              dispatch({ type: 'item/edited', id, text, gesture: editing.gesture });
            }}
          />
        ))}

        <Ink
          items={board?.items ?? []}
          draft={draft}
          selection={session?.selection ?? []}
          zoom={viewport.zoom}
        />
      </div>

      {marquee ? (
        <div class="canvas__marquee" aria-hidden="true" style={marqueeStyle(marquee, viewport)} />
      ) : null}

      {index ? (
        <Switcher
          index={index}
          project={project}
          onOpen={(id) => void openBoardById(id)}
          onCreate={(name, projectId) => void createNewBoard(name, projectId)}
          onRename={renameCurrentBoard}
          onLink={linkCurrentBoard}
          onCopy={() => void copyCurrentBoard()}
          onDelete={() => void deleteCurrentBoard()}
        />
      ) : null}
      <div class="canvas__status" role="status">
        {SAVE_LABELS[status]}
      </div>

      {toast !== null ? (
        <div class="canvas__toast" role="status">
          {toast}
        </div>
      ) : null}

      {board && board.items.length === 0 ? (
        <p class="canvas__hint">
          Empty board. Double-click to write a note, or pick a drawing tool above; pan with
          space-drag, middle-drag or scroll; zoom with ⌘-scroll or pinch.
        </p>
      ) : null}

      <Toolbar
        tool={tool}
        color={strokeColor}
        size={strokeSize}
        onTool={pickTool}
        onColor={setStrokeColor}
        onSize={setStrokeSize}
        onAddNote={() => addNote(surfaceToWorld(viewport, centerAnchor()))}
      />

      <div
        class="toolbar"
        role="toolbar"
        aria-label="Zoom"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          class="toolbar__button"
          aria-label="Zoom out"
          onClick={() => setViewport(zoomOutAt(viewport, centerAnchor()))}
        >
          −
        </button>
        <button
          type="button"
          class="toolbar__button toolbar__zoom"
          aria-label="Reset zoom to 100%"
          onClick={() => setViewport(resetZoomAt(viewport, centerAnchor()))}
        >
          {zoomPercent(viewport.zoom)}%
        </button>
        <button
          type="button"
          class="toolbar__button"
          aria-label="Zoom in"
          onClick={() => setViewport(zoomInAt(viewport, centerAnchor()))}
        >
          +
        </button>
        <button type="button" class="toolbar__button" aria-label="Zoom to fit" onClick={fitToBoard}>
          Fit
        </button>
        <span class="toolbar__separator" aria-hidden="true" />
        <button
          type="button"
          class={`toolbar__button${settingsOpen ? ' toolbar__button--on' : ''}`}
          aria-label="Settings"
          aria-pressed={settingsOpen}
          aria-expanded={settingsOpen}
          title="Fonts and the board's background"
          data-settings-toggle
          onClick={() => setSettingsOpen((open) => !open)}
        >
          Settings
        </button>
      </div>

      {settingsOpen ? (
        <SettingsPanel
          settings={settings}
          background={background}
          boardName={index ? currentBoard(index).name : ''}
          importError={importError}
          onFont={chooseDefaultFont}
          onImport={(file) => void importBackground(file)}
          onAdjust={adjustLook}
          onResetLook={resetBackgroundLook}
          onRemoveBackground={removeBackground}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}

function isText(item: { type: string }): item is TextItem {
  return item.type === 'text';
}

/** The marquee is drawn over the surface, in screen pixels, wherever the board is. */
function marqueeStyle(box: Rect, viewport: Viewport): Record<string, string> {
  const corner = worldToSurface(viewport, { x: box.x, y: box.y });
  return {
    left: `${corner.x}px`,
    top: `${corner.y}px`,
    width: `${box.width * viewport.zoom}px`,
    height: `${box.height * viewport.zoom}px`,
  };
}

/** `base` first, then whatever `more` adds, so shift-marquee keeps its order. */
function union(base: readonly string[], more: readonly string[]): string[] {
  return [...base, ...more.filter((id) => !base.includes(id))];
}

/**
 * True for a note's paper and the text on it; false for its bars, handles and
 * editor, and for a checkbox or link in its preview, which answer for themselves.
 */
function onNotePaper(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-testid="note"]') === null) return false;
  return target.closest('.note__chrome, .note__editor, .note__handle, input, a, button') === null;
}

/** The label a press landed on, or null: labels are HTML, so the DOM knows. */
function labelUnder(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  return target.closest('[data-label-id]')?.getAttribute('data-label-id') ?? null;
}

/** Whether a drag is carrying files at all, as against text or a link. */
function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/** The first file being dragged in; the board takes one picture at a time. */
function draggedFile(event: DragEvent): File | null {
  return event.dataTransfer?.files?.[0] ?? null;
}

/** True for the board itself, false for a note, a handle or the toolbar. */
function onBackground(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.classList.contains('canvas') ||
    target.classList.contains('canvas__grid') ||
    target.classList.contains('canvas__world')
  );
}
