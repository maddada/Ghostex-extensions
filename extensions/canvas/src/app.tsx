/**
 * The Canvas view: named boards drawn with Excalidraw, autosaved to Ghostex.
 *
 * Excalidraw owns the drawing entirely — the tools, the canvas, the undo
 * stack, the keyboard, the elements themselves — so what is left here is the
 * part it has no opinion about: which board is open, what it is called, which
 * Ghostex project it belongs to, what picture sits behind it, and getting the
 * scene in and out of the host store. `board.ts` says what a stored board is,
 * `boards.ts` the list of them, `persistence.ts` the writing, `migrate.ts` the
 * boards drawn before Excalidraw arrived. This module is where they meet.
 */

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  adjustBackground,
  backgroundStyle,
  createBackground,
  isImageFile,
  resetLook,
  shrinkImage,
  type BoardBackground,
  type LookKey,
} from './background.js';
import {
  createBoard,
  readAppState,
  sceneSignature,
  type BoardDocument,
  type StoredElement,
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
import {
  readProject,
  type BridgeContext,
  type GhostexBridge,
  type HostProject,
} from './bridge.js';
import {
  createAutosave,
  loadBackground,
  loadBoard,
  loadIndex,
  type Autosave,
  type SaveStatus,
} from './persistence.js';
import { SettingsPanel } from './settings-panel.js';
import { Switcher } from './switcher.js';

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
 * The board is drawn straight onto whatever is behind it, so a background
 * picture can show through from under the canvas. Excalidraw paints this
 * colour itself, and its "canvas background" picker is hidden to match.
 */
const TRANSPARENT_CANVAS = 'transparent';

/**
 * What the switcher copies. `.excalidraw` is Excalidraw's own file format, so
 * a copied board pastes straight into excalidraw.com or a Ghostex drawing.
 */
const EXPORT_TYPE = 'excalidraw';
const EXPORT_VERSION = 2;
const EXPORT_SOURCE = 'ghostex-extension-canvas';

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

  const reactRoot: Root = createRoot(root);
  // Not wrapped in StrictMode: it remounts effects, and the autosave this app
  // holds is created once and disposed when the view goes away. A second mount
  // would inherit the disposed one and never write anything again.
  reactRoot.render(<CanvasApp bridge={bridge} bindings={bindings} />);

  return {
    ready,
    flush: () => bindings.flush(),
    unmount: () => reactRoot.unmount(),
  };
}

function CanvasApp({ bridge, bindings }: { bridge: GhostexBridge | null; bindings: AppBindings }) {
  const storage = bridge?.storage ?? null;
  const [board, setBoard] = useState<BoardDocument | null>(null);
  const [index, setIndex] = useState<BoardsIndex | null>(null);
  const [project, setProject] = useState<HostProject | null>(null);
  const [status, setStatus] = useState<SaveStatus>('loading');
  /** The open board's background, or null when it has none. */
  const [background, setBackground] = useState<BoardBackground | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Why the last picture could not become the background, shown in the panel. */
  const [importError, setImportError] = useState<string | null>(null);
  /** A file is being dragged over the board. */
  const [dropping, setDropping] = useState(false);
  /** What just happened, said briefly over the board, or null for nothing. */
  const [toast, setToast] = useState<string | null>(null);

  const boardRef = useRef<BoardDocument | null>(null);
  const indexRef = useRef<BoardsIndex | null>(null);
  const backgroundRef = useRef<BoardBackground | null>(null);
  /**
   * The scene as last stored. Excalidraw reports a change for things that
   * leave the board exactly as it was — a selection, a pointer moving — so a
   * change is only a change when this signature moves.
   */
  const signatureRef = useRef<string>('');
  /** Drag enters and leaves nest as the file crosses the board's children. */
  const dragDepth = useRef(0);
  /** The timer clearing the current toast, so a second one restarts the wait. */
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      const stored = await loadIndex(storage);
      const [document, backdrop] = await Promise.all([
        loadBoard(storage, stored.value.lastOpen),
        loadBackground(storage, stored.value.lastOpen),
      ]);
      if (cancelled) return;

      boardRef.current = document.value;
      indexRef.current = stored.value;
      backgroundRef.current = backdrop;
      signatureRef.current = sceneSignature(document.value);
      savingBlockedRef.current = document.failed;
      indexBlockedRef.current = stored.failed;
      setBoard(document.value);
      setIndex(stored.value);
      setBackground(backdrop);

      if (document.failed || stored.failed) setStatus('error');
      else if (!storage) setStatus('unavailable');
      else {
        // Writing both back on open is what creates them on a first run, and
        // what lands a board converted from the old drawing engine in its new
        // shape so the conversion only ever happens once.
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

  useEffect(
    () => () => {
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    },
    [],
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

  const updateIndex = useCallback(
    (next: BoardsIndex) => {
      if (next === indexRef.current) return;
      indexRef.current = next;
      setIndex(next);
      if (!indexBlockedRef.current) autosave.writeIndex(next);
    },
    [autosave],
  );

  /** Puts a board on screen. Excalidraw is remounted for it, so its undo stack
   * belongs to the board that is open and never reaches across a switch. */
  const showBoard = useCallback((document: BoardDocument, failed: boolean) => {
    savingBlockedRef.current = failed;
    boardRef.current = document;
    signatureRef.current = sceneSignature(document);
    setBoard(document);
    if (failed) setStatus('error');
  }, []);

  const showBackground = useCallback((next: BoardBackground | null) => {
    backgroundRef.current = next;
    setBackground(next);
  }, []);

  /** A board and its background, loaded side by side. */
  const loadBoardWithBackground = useCallback(
    (id: string) => Promise.all([loadBoard(storage, id), loadBackground(storage, id)]),
    [storage],
  );

  /**
   * Every change Excalidraw reports. It fires on things that leave the board
   * exactly as it was, so the signature decides whether anything happened;
   * only then does a save get queued behind the debounce.
   */
  const onSceneChange = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      const current = boardRef.current;
      if (!current) return;
      const next: BoardDocument = {
        ...current,
        elements: elements as unknown as StoredElement[],
        appState: readAppState(appState),
        files: files as Record<string, unknown>,
      };
      const signature = sceneSignature(next);
      if (signature === signatureRef.current) return;
      signatureRef.current = signature;
      boardRef.current = next;
      if (!savingBlockedRef.current) autosave.schedule(next);
    },
    [autosave],
  );

  const openBoardById = useCallback(
    async (id: string) => {
      if (id === indexRef.current?.lastOpen) return;
      // The board being left keeps what was drawn on it a moment ago.
      await autosave.flush();
      const [{ value, failed }, backdrop] = await loadBoardWithBackground(id);
      const current = indexRef.current;
      if (!current) return;
      updateIndex(openBoard(current, id));
      showBoard(value, failed);
      showBackground(backdrop);
    },
    [autosave, loadBoardWithBackground, showBackground, showBoard, updateIndex],
  );

  const createNewBoard = useCallback(
    async (name: string, projectId: string | null) => {
      const current = indexRef.current;
      if (!current) return;
      await autosave.flush();
      const { index: next, board: created } = addBoard(current, name, projectId);
      updateIndex(next);
      const fresh = createBoard(created.id);
      showBoard(fresh, false);
      showBackground(null);
      // A board nothing has been drawn on yet still has to exist in the store,
      // or reopening Canvas would find nothing under its key.
      autosave.schedule(fresh);
    },
    [autosave, showBackground, showBoard, updateIndex],
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

  /**
   * Puts the open board on the clipboard as an `.excalidraw` file. The name
   * comes from the index, which is the only place it lives, and the message
   * says which board was copied — the menu it was clicked in has closed by then.
   */
  const copyCurrentBoard = useCallback(async () => {
    const current = boardRef.current;
    const list = indexRef.current;
    if (!current || !list) return;
    const { name } = currentBoard(list);
    const copied = await copyText(formatBoardExport(current, name));
    flash(copied ? `Copied “${name}” as JSON.` : 'Could not copy the board.');
  }, [flash]);

  const deleteCurrentBoard = useCallback(async () => {
    const current = indexRef.current;
    if (!current) return;
    const doomed = current.lastOpen;
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
    // The replacement a delete leaves behind has never been written either.
    if (!failed) autosave.schedule(value);
  }, [autosave, loadBoardWithBackground, showBackground, showBoard, updateIndex]);

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
        setImportError(
          `${file.name || 'That file'} is not a picture Canvas can use. Try a PNG, JPEG or WebP.`,
        );
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

  /**
   * The board's own chrome, rendered inside Excalidraw's top-right island so
   * it sits with the rest of the controls instead of floating over them.
   */
  const renderChrome = useCallback(
    (): JSX.Element | null =>
      index ? (
        <>
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
          <button
            type="button"
            className={`chrome__button${settingsOpen ? ' chrome__button--on' : ''}`}
            aria-label="Background"
            aria-pressed={settingsOpen}
            aria-expanded={settingsOpen}
            title="The picture behind this board"
            data-settings-toggle
            onClick={() => setSettingsOpen((open) => !open)}
          >
            Background
          </button>
        </>
      ) : null,
    [
      copyCurrentBoard,
      createNewBoard,
      deleteCurrentBoard,
      index,
      linkCurrentBoard,
      openBoardById,
      project,
      renameCurrentBoard,
      settingsOpen,
    ],
  );

  const initialData = useMemo(
    () =>
      board
        ? {
            elements: board.elements as never,
            appState: {
              ...board.appState,
              // Ours to set, not the board's: the canvas is see-through so a
              // background picture can sit behind it.
              viewBackgroundColor: TRANSPARENT_CANVAS,
              collaborators: new Map(),
            } as never,
            files: board.files as never,
            scrollToContent: false,
          }
        : null,
    [board],
  );

  return (
    <div
      className={`canvas${dropping ? ' canvas--dropping' : ''}`}
      onDragEnter={(event) => {
        if (!hasFiles(event.nativeEvent)) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDropping(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event.nativeEvent)) return;
        // Without this the browser refuses the drop and opens the file instead.
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event.nativeEvent)) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDropping(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event.nativeEvent)) return;
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = 0;
        setDropping(false);
        const file = draggedFile(event.nativeEvent);
        if (file) void importBackground(file);
      }}
    >
      {background ? (
        <img
          className="canvas__backdrop"
          data-testid="canvas-backdrop"
          src={background.image}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={backgroundStyle(background)}
        />
      ) : null}

      <div className="canvas__scene">
        {board ? (
          <Excalidraw
            // A new key per board, so switching boards gives Excalidraw a
            // fresh scene and a fresh undo stack rather than grafting one
            // board's history onto another.
            key={board.id}
            initialData={initialData}
            onChange={onSceneChange}
            theme={board.appState.theme === 'light' ? 'light' : 'dark'}
            name={index ? currentBoard(index).name : 'Canvas'}
            renderTopRightUI={renderChrome}
            // Canvas declares no `network` permission, so the two features
            // that would reach out are off: turning a prompt into a diagram,
            // and turning a pasted link into a live embedded frame.
            aiEnabled={false}
            validateEmbeddable={false}
            UIOptions={{
              canvasActions: {
                // Loading and saving files belongs to Ghostex, not to a board
                // that lives in the host store and saves itself.
                loadScene: false,
                saveToActiveFile: false,
                export: false,
                saveAsImage: true,
                // Ours: the canvas stays see-through for the backdrop.
                changeViewBackgroundColor: false,
                clearCanvas: true,
                toggleTheme: true,
              },
            }}
          >
            <MainMenu>
              <MainMenu.DefaultItems.SearchMenu />
              <MainMenu.DefaultItems.CommandPalette />
              <MainMenu.DefaultItems.SaveAsImage />
              <MainMenu.DefaultItems.Help />
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.Separator />
              <MainMenu.DefaultItems.ToggleTheme />
            </MainMenu>
          </Excalidraw>
        ) : null}
      </div>

      {dropping ? (
        <div className="canvas__drop" aria-hidden="true">
          Drop to make this the board's background
        </div>
      ) : null}

      <div className="canvas__status" role="status">
        {SAVE_LABELS[status]}
      </div>

      {toast !== null ? (
        <div className="canvas__toast" role="status">
          {toast}
        </div>
      ) : null}

      {settingsOpen ? (
        <SettingsPanel
          background={background}
          boardName={index ? currentBoard(index).name : ''}
          importError={importError}
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

/**
 * The open board as an `.excalidraw` file. The name rides along in `name`,
 * which is where Excalidraw itself keeps it.
 */
export function formatBoardExport(document: BoardDocument, name: string): string {
  return JSON.stringify(
    {
      type: EXPORT_TYPE,
      version: EXPORT_VERSION,
      source: EXPORT_SOURCE,
      name,
      elements: document.elements,
      appState: {
        ...document.appState,
        viewBackgroundColor: TRANSPARENT_CANVAS,
      },
      files: document.files,
    },
    null,
    2,
  );
}

/** Puts text on the clipboard, saying whether it landed. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

function draggedFile(event: DragEvent): File | null {
  return event.dataTransfer?.files?.[0] ?? null;
}
