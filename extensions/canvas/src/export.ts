/**
 * Copying a board out of Ghostex as JSON.
 *
 * Boards live in the host's own extension store, which has no export and no
 * file of its own that a user would think to back up. This is the escape
 * hatch: one click puts the open board on the clipboard as the same versioned
 * document that is stored, readable enough to keep in a note or a gist.
 *
 * Both ways of reaching the clipboard here are the page's own, so Canvas
 * still asks the host for nothing: the manifest's `clipboard` permission is
 * about `ghostex`'s bridge, which this never touches.
 */

import type { BoardDocument, BoardItem } from './board.js';
import type { Viewport } from './viewport.js';

/**
 * A copied board: the stored document, plus the name. The name lives in the
 * board index rather than in the document, so it has to be put back in here
 * for a paste to say which board it was.
 */
export interface BoardExport {
  schemaVersion: number;
  id: string;
  name: string;
  items: BoardItem[];
  viewport: Viewport;
}

export function boardExport(document: BoardDocument, name: string): BoardExport {
  return {
    schemaVersion: document.schemaVersion,
    id: document.id,
    name,
    items: document.items,
    viewport: document.viewport,
  };
}

/** What goes on the clipboard: indented to be read, and newline-terminated. */
export function formatBoardExport(document: BoardDocument, name: string): string {
  return `${JSON.stringify(boardExport(document, name), null, 2)}\n`;
}

/**
 * Puts text on the clipboard, and says whether it landed.
 *
 * `navigator.clipboard` is the one to use where it works. An embedded view
 * can refuse it — no permission, or the page not focused — and then the old
 * selection copy still goes through, so the fallback is not dead weight.
 */
export async function copyText(text: string, host: Document = document): Promise<boolean> {
  const api = host.defaultView?.navigator?.clipboard;
  if (api) {
    try {
      await api.writeText(text);
      return true;
    } catch {
      // Refused. The selection copy below is the other way in.
    }
  }
  return copyBySelection(text, host);
}

/**
 * The pre-`navigator.clipboard` copy: put the text in a field, select it, and
 * ask the document to copy the selection. The field has to be in the page and
 * selectable, so it is moved out of sight rather than hidden — `display:none`
 * makes the copy a no-op — and taken out again either way.
 */
function copyBySelection(text: string, host: Document): boolean {
  const exec = (host as Partial<Document>).execCommand;
  if (typeof exec !== 'function') return false;

  const field = host.createElement('textarea');
  field.value = text;
  field.setAttribute('aria-hidden', 'true');
  field.style.position = 'fixed';
  field.style.top = '-1000px';
  field.style.opacity = '0';
  host.body.append(field);
  // Selecting text in a field nothing has focused copies nothing.
  field.focus();
  field.select();
  try {
    return exec.call(host, 'copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
