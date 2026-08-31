/**
 * Note text in, safe HTML out.
 *
 * Notes render into the same page that holds the Ghostex bridge, so nothing
 * from a note reaches the DOM without passing through DOMPurify: `renderMarkdown`
 * is the only way markup is produced, and it always sanitizes.
 *
 * The checkbox renderer is ours so every task carries its position in the
 * source. That number is what turns a click in the preview back into an edit of
 * the markdown, in `toggleTask`.
 */

import DOMPurify from 'dompurify';
import { Marked } from 'marked';

/** Attribute holding a task's zero-based position among the note's tasks. */
export const TASK_ATTRIBUTE = 'data-task';

/**
 * Counts tasks within one `parse` call. Rendering is synchronous and
 * single-threaded, so a module-level counter reset per render is safe.
 */
let taskCount = 0;

const markdown = new Marked({
  gfm: true,
  // A note is typed, not composed: a single newline means a new line.
  breaks: true,
  renderer: {
    checkbox({ checked }): string {
      const index = taskCount;
      taskCount += 1;
      return `<input type="checkbox" ${TASK_ATTRIBUTE}="${index}"${checked ? ' checked=""' : ''}> `;
    },
  },
});

/**
 * A link that navigates this view replaces the whole board with the linked
 * page, and there is no way back. Every link leaves instead.
 */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName !== 'A') return;
  const element = node as Element;
  if (!element.hasAttribute('href')) return;
  element.setAttribute('target', '_blank');
  element.setAttribute('rel', 'noopener noreferrer');
});

export function renderMarkdown(text: string): string {
  taskCount = 0;
  const html = markdown.parse(text, { async: false });
  return DOMPurify.sanitize(html, {
    // `target` is not sanitized in by default, and the hook above adds it.
    ADD_ATTR: ['target'],
    // The board is not a document: a note may not carry its own page furniture.
    FORBID_TAGS: ['style', 'form', 'iframe', 'object', 'embed'],
  });
}
