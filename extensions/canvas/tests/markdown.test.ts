/**
 * The markdown pipeline: what a note's text turns into, and what it must never
 * turn into. Notes render inside a page that holds the Ghostex bridge, so the
 * sanitizer is the load-bearing part of this file.
 */

import { describe, expect, test } from 'vitest';

import { toggleTask } from '../src/board.js';
import { TASK_ATTRIBUTE, renderMarkdown } from '../src/markdown.js';

/** Parses rendered HTML so assertions read the DOM, not a string of markup. */
function render(markdown: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = renderMarkdown(markdown);
  return host;
}

function checkboxes(host: HTMLElement): HTMLInputElement[] {
  return Array.from(host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
}

describe('markdown', () => {
  test('renders headings', () => {
    expect(render('# Title').querySelector('h1')?.textContent).toBe('Title');
    expect(render('### Smaller').querySelector('h3')?.textContent).toBe('Smaller');
  });

  test('renders emphasis and inline code', () => {
    const host = render('**bold** and `code`');
    expect(host.querySelector('strong')?.textContent).toBe('bold');
    expect(host.querySelector('code')?.textContent).toBe('code');
  });

  test('renders fenced code as a block', () => {
    const host = render('```\nnpm run check\n```');
    expect(host.querySelector('pre code')?.textContent?.trim()).toBe('npm run check');
  });

  test('renders lists', () => {
    const host = render('- one\n- two');
    expect(host.querySelectorAll('li')).toHaveLength(2);
  });

  test('renders a link that opens away from the board', () => {
    const link = render('[Ghostex](https://ghostex.dev)').querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://ghostex.dev');
    // A same-view navigation would replace the canvas with the linked page.
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });

  test('renders a single newline as a line break, the way a note is typed', () => {
    expect(render('one\ntwo').querySelector('br')).not.toBeNull();
  });

  test('renders nothing for an empty note', () => {
    expect(renderMarkdown('').trim()).toBe('');
  });
});

describe('task lists', () => {
  test('render as live checkboxes carrying their position in the source', () => {
    const boxes = checkboxes(render('- [ ] one\n- [x] two'));
    expect(boxes).toHaveLength(2);
    expect(boxes[0]?.checked).toBe(false);
    expect(boxes[1]?.checked).toBe(true);
    expect(boxes[0]?.getAttribute(TASK_ATTRIBUTE)).toBe('0');
    expect(boxes[1]?.getAttribute(TASK_ATTRIBUTE)).toBe('1');
  });

  test('are not disabled, because clicking one is the point', () => {
    expect(checkboxes(render('- [ ] one'))[0]?.disabled).toBe(false);
  });

  test('number from zero again on the next render', () => {
    render('- [ ] one\n- [ ] two');
    const boxes = checkboxes(render('- [ ] only one'));
    expect(boxes[0]?.getAttribute(TASK_ATTRIBUTE)).toBe('0');
  });

  test('count nested tasks in the order they are written', () => {
    const boxes = checkboxes(render('- [ ] outer\n  - [ ] inner\n- [x] last'));
    expect(boxes.map((box) => box.getAttribute(TASK_ATTRIBUTE))).toEqual(['0', '1', '2']);
  });
});

describe('sanitizing', () => {
  test('drops a script tag', () => {
    const host = render('<script>globalThis.pwned = true;</script>');
    expect(host.querySelector('script')).toBeNull();
    expect(renderMarkdown('<script>x</script>')).not.toContain('<script');
  });

  test('drops an inline event handler', () => {
    const host = render('<img src="x" onerror="globalThis.pwned = true">');
    expect(host.querySelector('img')?.getAttribute('onerror')).toBeNull();
  });

  test('drops a javascript: link', () => {
    const host = render('[tap](javascript:globalThis.pwned=true)');
    expect(host.querySelector('a')?.getAttribute('href') ?? '').not.toContain('javascript:');
  });

  test('drops an iframe', () => {
    expect(render('<iframe src="https://example.com"></iframe>').querySelector('iframe')).toBeNull();
  });

  test('keeps the harmless markup a note is made of', () => {
    const host = render('Plain **bold** text');
    expect(host.textContent).toContain('Plain bold text');
  });
});

describe('a click in the preview and the markdown behind it', () => {
  // The renderer numbers tasks and `toggleTask` counts them: the two have to
  // agree, or clicking one checkbox ticks a different line.
  const NOTE = [
    '# Plan',
    '',
    '- [ ] outer',
    '  - [x] inner',
    '',
    '```',
    '- [ ] fenced, not a task',
    '```',
    '',
    '1. [ ] numbered',
    '',
    '> - [ ] quoted',
  ].join('\n');

  function ticked(markdown: string): boolean[] {
    return checkboxes(render(markdown)).map((box) => box.checked);
  }

  test('agree on how many tasks there are', () => {
    expect(ticked(NOTE)).toEqual([false, true, false, false]);
  });

  test('flip exactly the clicked task, whichever one it is', () => {
    ticked(NOTE).forEach((_, index) => {
      const before = ticked(NOTE);
      const after = ticked(toggleTask(NOTE, index));
      expect(after[index]).toBe(!before[index]);
      after.forEach((state, other) => {
        if (other !== index) expect(state).toBe(before[other]);
      });
    });
  });
});
