/**
 * Pointer, wheel and keyboard gestures for the canvas surface.
 *
 * Deliberately framework-free and Excalidraw-shaped: space-drag, middle-drag
 * and trackpad scroll pan; ctrl/cmd-wheel and trackpad pinch (which the browser
 * reports as a ctrl-wheel) zoom around the cursor; a letter or a digit picks a
 * tool, Escape puts it away, and the arrow keys nudge whatever is selected.
 */

import { TOOLS, type ToolName } from './toolbar.js';
import {
  panBy,
  resetZoomAt,
  zoomByWheel,
  zoomInAt,
  zoomOutAt,
  type Point,
  type Size,
  type Viewport,
} from './viewport.js';

export interface InteractionHost {
  getViewport(): Viewport;
  setViewport(next: Viewport): void;
  getSurfaceSize(): Size;
  /** A pan gesture is running: the surface shows a grabbing cursor. */
  setPanning(active: boolean): void;
  /** Space is held: the surface shows a grab cursor before any drag starts. */
  setSpaceHeld(active: boolean): void;
  fitToBoard(): void;
  /** Removes whatever is selected, or nothing when the board has no selection. */
  deleteSelection(): void;
  /** Selects everything on the board. */
  selectAll(): void;
  setTool(tool: ToolName): void;
  /** Escape: back to Select, holding nothing and drawing nothing. */
  escape(): void;
  /**
   * Moves the selection by a step. `continues` is true while the key is held,
   * so a whole run of repeats is one undo.
   */
  nudgeSelection(dx: number, dy: number, continues: boolean): void;
  /** Moves the selection to the next colour in the note palette. */
  cycleNoteColor(): void;
  undo(): void;
  redo(): void;
}

/**
 * A press that travels less than this, on screen, is a click, not a drag: it
 * neither moves what it landed on nor drags out a marquee. Shared with the
 * note and the surface so a trackpad twitch reads the same everywhere.
 */
export const CLICK_SLOP_PX = 3;

const MIDDLE_BUTTON = 1;
const PRIMARY_BUTTON = 0;
const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 100;
/** How far an arrow key moves the selection, in world units; shift goes faster. */
const NUDGE = 1;
const NUDGE_FAST = 5;

const TOOL_KEYS: ReadonlyMap<string, ToolName> = new Map(
  TOOLS.flatMap((tool) => tool.keys.map((key): [string, ToolName] => [key.toLowerCase(), tool.name])),
);

const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export function attachCanvasInteractions(
  surface: HTMLElement,
  host: InteractionHost,
): () => void {
  const ownerDocument = surface.ownerDocument;
  const ownerWindow = ownerDocument.defaultView ?? window;
  let spaceHeld = false;
  let panPointerId: number | null = null;
  let lastPanPoint: Point = { x: 0, y: 0 };

  function anchorOf(event: { clientX: number; clientY: number }): Point {
    const rect = surface.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function centerAnchor(): Point {
    const size = host.getSurfaceSize();
    return { x: size.width / 2, y: size.height / 2 };
  }

  function scrollPixels(delta: number, deltaMode: number): number {
    if (deltaMode === 1) return delta * LINE_HEIGHT_PX;
    if (deltaMode === 2) return delta * PAGE_HEIGHT_PX;
    return delta;
  }

  function onWheel(event: WheelEvent): void {
    // A wheel over the chrome belongs to the panel under the pointer: a board
    // list longer than the view scrolls itself instead of panning the board.
    if (insideChrome(event.target)) return;
    // Always swallow the event: unhandled wheels scroll or page-zoom the host view.
    event.preventDefault();
    const viewport = host.getViewport();
    if (event.ctrlKey || event.metaKey) {
      host.setViewport(zoomByWheel(viewport, anchorOf(event), scrollPixels(event.deltaY, event.deltaMode)));
      return;
    }
    host.setViewport(
      panBy(
        viewport,
        -scrollPixels(event.deltaX, event.deltaMode),
        -scrollPixels(event.deltaY, event.deltaMode),
      ),
    );
  }

  function onPointerDown(event: PointerEvent): void {
    const wantsPan =
      event.button === MIDDLE_BUTTON || (event.button === PRIMARY_BUTTON && spaceHeld);
    if (!wantsPan || panPointerId !== null) return;
    event.preventDefault();
    panPointerId = event.pointerId;
    lastPanPoint = { x: event.clientX, y: event.clientY };
    surface.setPointerCapture?.(event.pointerId);
    host.setPanning(true);
  }

  function onPointerMove(event: PointerEvent): void {
    if (panPointerId !== event.pointerId) return;
    const dx = event.clientX - lastPanPoint.x;
    const dy = event.clientY - lastPanPoint.y;
    lastPanPoint = { x: event.clientX, y: event.clientY };
    if (dx === 0 && dy === 0) return;
    host.setViewport(panBy(host.getViewport(), dx, dy));
  }

  function endPan(event: PointerEvent): void {
    if (panPointerId !== event.pointerId) return;
    panPointerId = null;
    // A cancelled pointer has already lost capture; releasing twice throws.
    if (surface.hasPointerCapture?.(event.pointerId)) {
      surface.releasePointerCapture(event.pointerId);
    }
    host.setPanning(false);
  }

  function onKeyDown(event: KeyboardEvent): void {
    // Chrome keeps its own keys: Space on a focused menu button presses it
    // rather than arming a pan, and Delete there deletes no notes.
    if (isTextEntry(event.target) || insideChrome(event.target)) return;
    if (event.code === 'Space' && !event.repeat) {
      spaceHeld = true;
      host.setSpaceHeld(true);
      event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) host.redo();
        else host.undo();
      } else if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        host.selectAll();
      } else if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        host.setViewport(zoomInAt(host.getViewport(), centerAnchor()));
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        host.setViewport(zoomOutAt(host.getViewport(), centerAnchor()));
      } else if (event.key === '0') {
        event.preventDefault();
        host.setViewport(resetZoomAt(host.getViewport(), centerAnchor()));
      }
      return;
    }
    if (event.shiftKey && event.key === '!') {
      // Shift-1 on a US layout: Excalidraw's zoom-to-fit.
      event.preventDefault();
      host.fitToBoard();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      host.deleteSelection();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      host.escape();
      return;
    }
    const arrow = ARROWS[event.key];
    if (arrow) {
      event.preventDefault();
      const step = event.shiftKey ? NUDGE_FAST : NUDGE;
      host.nudgeSelection(arrow[0] * step, arrow[1] * step, event.repeat);
      return;
    }
    if (event.altKey) return;
    if (event.key === 'c' || event.key === 'C') {
      event.preventDefault();
      host.cycleNoteColor();
      return;
    }
    // Shift-letters and shift-digits are other characters; a tool is a bare key.
    if (event.shiftKey) return;
    const tool = TOOL_KEYS.get(event.key.toLowerCase());
    if (tool) {
      event.preventDefault();
      host.setTool(tool);
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (event.code !== 'Space') return;
    spaceHeld = false;
    host.setSpaceHeld(false);
  }

  function releaseSpace(): void {
    if (!spaceHeld) return;
    spaceHeld = false;
    host.setSpaceHeld(false);
  }

  surface.addEventListener('wheel', onWheel, { passive: false });
  surface.addEventListener('pointerdown', onPointerDown);
  surface.addEventListener('pointermove', onPointerMove);
  surface.addEventListener('pointerup', endPan);
  surface.addEventListener('pointercancel', endPan);
  ownerDocument.addEventListener('keydown', onKeyDown);
  ownerDocument.addEventListener('keyup', onKeyUp);
  ownerWindow.addEventListener('blur', releaseSpace);

  return () => {
    surface.removeEventListener('wheel', onWheel);
    surface.removeEventListener('pointerdown', onPointerDown);
    surface.removeEventListener('pointermove', onPointerMove);
    surface.removeEventListener('pointerup', endPan);
    surface.removeEventListener('pointercancel', endPan);
    ownerDocument.removeEventListener('keydown', onKeyDown);
    ownerDocument.removeEventListener('keyup', onKeyUp);
    ownerWindow.removeEventListener('blur', releaseSpace);
  };
}

function insideChrome(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-chrome]') !== null;
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
