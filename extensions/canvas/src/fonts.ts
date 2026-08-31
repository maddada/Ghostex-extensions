/**
 * The fonts a note or label can be written in.
 *
 * Four faces ship inside `dist/fonts/` — a hand-drawn one, a sans, a serif and
 * a mono, all under the SIL Open Font License — and three are the system's own
 * stacks. The catalog forbids fetching anything at runtime, so this list is the
 * whole choice: nothing here is a URL. Only a font's *name* is ever stored, on
 * a note or in settings; the `@font-face` rules in `styles.css` say where each
 * bundled file lives, and `build.mjs` puts them there.
 */

export const FONTS = [
  {
    name: 'caveat',
    label: 'Caveat',
    hint: 'hand-drawn',
    stack: '"Caveat", "Bradley Hand", "Segoe Print", cursive',
    bundled: true,
  },
  {
    name: 'inter',
    label: 'Inter',
    hint: 'sans',
    stack: '"Inter", ui-sans-serif, system-ui, sans-serif',
    bundled: true,
  },
  {
    name: 'lora',
    label: 'Lora',
    hint: 'serif',
    stack: '"Lora", ui-serif, Georgia, serif',
    bundled: true,
  },
  {
    name: 'jetbrains-mono',
    label: 'JetBrains Mono',
    hint: 'mono',
    stack: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    bundled: true,
  },
  {
    name: 'system',
    label: 'System',
    hint: 'sans',
    stack: 'ui-sans-serif, -apple-system, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
    bundled: false,
  },
  {
    name: 'system-serif',
    label: 'System serif',
    hint: 'serif',
    stack: 'ui-serif, Georgia, "Iowan Old Style", "Times New Roman", serif',
    bundled: false,
  },
  {
    name: 'system-mono',
    label: 'System mono',
    hint: 'mono',
    stack: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    bundled: false,
  },
] as const;

export type FontName = (typeof FONTS)[number]['name'];
export type Font = (typeof FONTS)[number];

/** What every board was written in before there was a choice. */
export const DEFAULT_FONT: FontName = 'system';

const BY_NAME = Object.fromEntries(FONTS.map((font) => [font.name, font])) as Record<
  FontName,
  Font
>;

export function isFontName(value: unknown): value is FontName {
  return typeof value === 'string' && value in BY_NAME;
}

export function fontFor(name: FontName): Font {
  return BY_NAME[name];
}

/**
 * The family a bundled font's `@font-face` declares: the first quoted name in
 * its stack. What ties an entry here to its rule in `styles.css`.
 */
export function fontFamily(font: Font): string | null {
  return /^"([^"]+)"/.exec(font.stack)?.[1] ?? null;
}

/** The CSS `font-family` value for a font. */
export function fontStack(name: FontName): string {
  return fontFor(name).stack;
}
