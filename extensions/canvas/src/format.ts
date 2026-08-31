/**
 * The markdown a format button types for you.
 *
 * A note's source stays markdown: the buttons edit no document model, they do
 * to the text exactly what the user would have typed by hand. That work lives
 * here rather than in the component so it can be read and tested as what it is
 * — a string and a selection in, a string and a selection out.
 *
 * Where markdown gives a toggle for free the button is one: the press that
 * wraps a selection unwraps it again, and heading cycles H1, H2, H3 and off.
 * Code blocks and links have no symmetric off state, so instead they write the
 * shape out with placeholder words already selected, ready to be typed over.
 */

/** The buttons on the format bar, in no particular order. */
export type FormatKind =
  | 'bold'
  | 'italic'
  | 'heading'
  | 'bullet'
  | 'task'
  | 'code'
  | 'codeblock'
  | 'link';

/** What a textarea holds and where the user is in it. */
export interface Selected {
  text: string;
  start: number;
  end: number;
}

export function applyFormat(kind: FormatKind, current: Selected): Selected {
  switch (kind) {
    case 'bold':
      return wrap(current, '**', 'bold');
    case 'italic':
      return wrap(current, '*', 'italic');
    case 'code':
      return wrap(current, '`', 'code');
    case 'heading':
      return editLines(current, heading);
    case 'bullet':
      return editLines(current, (lines) => list(lines, '- ', isBullet));
    case 'task':
      return editLines(current, (lines) => list(lines, '- [ ] ', isTask));
    case 'codeblock':
      return fence(current);
    case 'link':
      return link(current);
  }
}

/** A bullet, once its indentation has been taken off. */
const BULLET = /^[-*+] +/;
/** A bullet carrying a checkbox: `- [ ] ` or `- [x] `. */
const TASK = /^[-*+] +\[[ xX]\] +/;
/** An ATX heading. Only `#` at the very start of a line opens one. */
const HEADING = /^(#{1,6}) +/;
/** Past this the button has cycled through every level a note needs. */
const MAX_HEADING = 3;

/**
 * Puts `marker` around the selection, or takes it off again when the selection
 * is already sitting inside exactly that marker.
 *
 * The run of marker characters either side has to be exactly as long as the
 * marker, so italic on `**bold**` reads the `**` as bold's and adds its own
 * rather than eating half of it.
 */
function wrap(current: Selected, marker: string, placeholder: string): Selected {
  const { text, start, end } = current;
  const char = marker[0] ?? '';
  const wrapped =
    start !== end &&
    run(text, start, -1, char) === marker.length &&
    run(text, end, 1, char) === marker.length;

  if (wrapped) {
    const stripped =
      text.slice(0, start - marker.length) +
      text.slice(start, end) +
      text.slice(end + marker.length);
    return { text: stripped, start: start - marker.length, end: end - marker.length };
  }

  const inner = start === end ? placeholder : text.slice(start, end);
  return {
    text: `${text.slice(0, start)}${marker}${inner}${marker}${text.slice(end)}`,
    start: start + marker.length,
    end: start + marker.length + inner.length,
  };
}

/** How many `char` in a row sit at `index`, walking in `step`'s direction. */
function run(text: string, index: number, step: -1 | 1, char: string): number {
  let count = 0;
  for (;;) {
    const at = step === -1 ? index - count - 1 : index + count;
    if (at < 0 || at >= text.length || text[at] !== char) return count;
    count += 1;
  }
}

/**
 * The whole lines a selection touches. A selection that ends on a line break
 * stops at the line above it, the way every editor treats a trailing newline.
 */
function lineRange({ text, start, end }: Selected): { from: number; to: number } {
  const from = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
  const last = end > start && text[end - 1] === '\n' ? end - 1 : end;
  const breakAfter = text.indexOf('\n', last);
  return { from, to: breakAfter === -1 ? text.length : breakAfter };
}

/**
 * Rewrites every line the selection touches.
 *
 * A caret stays a caret, moved by however much its own line grew, so pressing
 * bullet on an empty line leaves the user typing the first item rather than
 * with the line selected. A selection comes back covering what it changed, so
 * pressing heading twice cycles the same lines.
 */
function editLines(current: Selected, transform: (lines: string[]) => string[]): Selected {
  const { text, start, end } = current;
  const { from, to } = lineRange(current);

  const before = text.slice(from, to).split('\n');
  const after = transform(before);
  const replaced = after.join('\n');
  const rewritten = text.slice(0, from) + replaced + text.slice(to);

  if (start !== end) return { text: rewritten, start: from, end: from + replaced.length };
  const shift = (after[0]?.length ?? 0) - (before[0]?.length ?? 0);
  const caret = Math.max(from, start + shift);
  return { text: rewritten, start: caret, end: caret };
}

/** Every line gets the level after whatever the first line is already at. */
function heading(lines: string[]): string[] {
  const current = HEADING.exec(indented(lines[0] ?? '').body)?.[1]?.length ?? 0;
  const level = current >= MAX_HEADING ? 0 : current + 1;
  return lines.map((line, index) => {
    if (!marks(lines, index)) return line;
    const { indent, body } = indented(line);
    const prefix = level === 0 ? '' : `${'#'.repeat(level)} `;
    return `${indent}${prefix}${plain(body)}`;
  });
}

/**
 * Marks every line with `prefix`, or clears the prefix when every line already
 * has it. A bullet asked to become a task keeps its place in the list: the old
 * prefix comes off before the new one goes on.
 */
function list(lines: string[], prefix: string, has: (body: string) => boolean): string[] {
  const marked = lines.filter((line, index) => marks(lines, index));
  const clear = marked.length > 0 && marked.every((line) => has(indented(line).body));

  return lines.map((line, index) => {
    if (!marks(lines, index)) return line;
    const { indent, body } = indented(line);
    return `${indent}${clear ? '' : prefix}${plain(body)}`;
  });
}

/**
 * A line with its block marker taken off. A heading and a list item are two
 * kinds of line rather than two layers on one, so the button that makes a line
 * into either takes off whatever it was before.
 */
function plain(body: string): string {
  return body.replace(HEADING, '').replace(TASK, '').replace(BULLET, '');
}

function isBullet(body: string): boolean {
  return BULLET.test(body) && !TASK.test(body);
}

function isTask(body: string): boolean {
  return TASK.test(body);
}

/** A blank line inside a multi-line selection is a gap, not a line to mark. */
function marks(lines: string[], index: number): boolean {
  return lines.length === 1 || (lines[index] ?? '').trim().length > 0;
}

function indented(line: string): { indent: string; body: string } {
  const indent = /^[ \t]*/.exec(line)?.[0] ?? '';
  return { indent, body: line.slice(indent.length) };
}

/** A fence has to own its lines, so the block grows out to whole lines first. */
function fence(current: Selected): Selected {
  const { text } = current;
  const { from, to } = lineRange(current);

  const block = text.slice(from, to);
  const inner = block.length > 0 ? block : 'code';
  const opened = '```\n';
  const body = `${opened}${inner}\n\`\`\``;
  return {
    text: text.slice(0, from) + body + text.slice(to),
    start: from + opened.length,
    end: from + opened.length + inner.length,
  };
}

/**
 * Writes the shape out in full — `[text](url)` — and leaves the part still to
 * be filled in selected: the name when there was nothing to name the link
 * after, the address when the selection already named it.
 */
function link(current: Selected): Selected {
  const { text, start, end } = current;
  const named = start !== end;
  const label = named ? text.slice(start, end) : 'text';
  const url = 'url';
  const rewritten = `${text.slice(0, start)}[${label}](${url})${text.slice(end)}`;
  // `[` before the label, then `](` between the label and the address.
  const at = named ? start + label.length + 3 : start + 1;
  return { text: rewritten, start: at, end: at + (named ? url.length : label.length) };
}
