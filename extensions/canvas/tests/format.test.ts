/**
 * What each format button types into a note.
 *
 * Tests are written in the notation the helpers below read: `a«bc»d` is the
 * text `abcd` with `bc` selected, and `a«»d` is a caret between the two. Every
 * case asserts on the text *and* on where the user is left in it, because a
 * button that formats the right characters and then loses the caret is broken.
 */

import { describe, expect, test } from 'vitest';

import { applyFormat, type FormatKind, type Selected } from '../src/format.js';

const OPEN = '«';
const CLOSE = '»';

function at(marked: string): Selected {
  const start = marked.indexOf(OPEN);
  const close = marked.indexOf(CLOSE);
  if (start === -1 || close === -1) throw new Error(`Nothing selected in: ${marked}`);
  return {
    text: marked.slice(0, start) + marked.slice(start + 1, close) + marked.slice(close + 1),
    start,
    end: close - 1,
  };
}

function show({ text, start, end }: Selected): string {
  return `${text.slice(0, start)}${OPEN}${text.slice(start, end)}${CLOSE}${text.slice(end)}`;
}

function press(kind: FormatKind, marked: string): string {
  return show(applyFormat(kind, at(marked)));
}

describe('wrapping a selection', () => {
  test('bold, italic and code put their markers round it', () => {
    expect(press('bold', 'make «this» loud')).toBe('make **«this»** loud');
    expect(press('italic', 'make «this» lean')).toBe('make *«this»* lean');
    expect(press('code', 'run «npm ci» first')).toBe('run `«npm ci»` first');
  });

  test('pressing the same button again takes the markers off', () => {
    expect(press('bold', 'make **«this»** loud')).toBe('make «this» loud');
    expect(press('italic', 'make *«this»* lean')).toBe('make «this» lean');
    expect(press('code', 'run `«npm ci»` first')).toBe('run «npm ci» first');
  });

  test('italic on bold text adds to it rather than eating half of it', () => {
    expect(press('italic', '**«bold»**')).toBe('***«bold»***');
    expect(press('bold', '*«lean»*')).toBe('***«lean»***');
  });

  test('with nothing selected it writes a word to type over', () => {
    expect(press('bold', 'shout «»')).toBe('shout **«bold»**');
    expect(press('italic', 'lean «»')).toBe('lean *«italic»*');
    expect(press('code', 'run «»')).toBe('run `«code»`');
  });
});

describe('heading', () => {
  test('cycles the line through H1, H2, H3 and back to plain text', () => {
    expect(press('heading', '«»Plan')).toBe('# «»Plan');
    expect(press('heading', '# «»Plan')).toBe('## «»Plan');
    expect(press('heading', '## «»Plan')).toBe('### «»Plan');
    expect(press('heading', '### «»Plan')).toBe('«»Plan');
  });

  test('puts every selected line at the level the first one is going to', () => {
    expect(press('heading', '«# One\nTwo»')).toBe('«## One\n## Two»');
  });

  test('replaces a list marker rather than sitting on top of one', () => {
    expect(press('heading', '«- [ ] ship it»')).toBe('«# ship it»');
  });
});

describe('lists', () => {
  test('mark every line the selection touches', () => {
    expect(press('bullet', '«one\ntwo»')).toBe('«- one\n- two»');
    expect(press('task', '«one\ntwo»')).toBe('«- [ ] one\n- [ ] two»');
  });

  test('pressing the same button again clears the list', () => {
    expect(press('bullet', '«- one\n- two»')).toBe('«one\ntwo»');
    expect(press('task', '«- [ ] one\n- [x] two»')).toBe('«one\ntwo»');
  });

  test('turn into each other without stacking two markers up', () => {
    expect(press('task', '«- one»')).toBe('«- [ ] one»');
    expect(press('bullet', '«- [ ] one»')).toBe('«- one»');
  });

  test('replace a heading rather than nesting inside one', () => {
    expect(press('bullet', '«## Plan»')).toBe('«- Plan»');
  });

  test('keep the indentation a nested item already has', () => {
    expect(press('bullet', '«  one»')).toBe('«  - one»');
  });

  test('leave the blank lines between blocks alone', () => {
    expect(press('bullet', '«one\n\ntwo»')).toBe('«- one\n\n- two»');
  });

  test('start a list under the caret without selecting the line', () => {
    expect(press('bullet', 'one«»')).toBe('- one«»');
    expect(press('bullet', '«»')).toBe('- «»');
  });

  test('stop at the line above a selection that ends on a line break', () => {
    expect(press('bullet', '«one\n»two')).toBe('«- one»\ntwo');
  });
});

describe('code block', () => {
  test('fences the whole lines the selection touches', () => {
    expect(press('codeblock', '«npm run check»')).toBe('```\n«npm run check»\n```');
  });

  test('grows a part-line selection out to the line it is on', () => {
    expect(press('codeblock', 'npm «run» check')).toBe('```\n«npm run check»\n```');
  });

  test('with nothing selected it writes a word to type over', () => {
    expect(press('codeblock', '«»')).toBe('```\n«code»\n```');
  });
});

describe('link', () => {
  test('names the link after the selection and leaves the address to fill in', () => {
    expect(press('link', 'see «the docs»')).toBe('see [the docs](«url»)');
  });

  test('with nothing selected it writes the whole shape out, name first', () => {
    expect(press('link', 'see «»')).toBe('see [«text»](url)');
  });
});
