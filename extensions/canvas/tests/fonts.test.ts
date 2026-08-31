// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { DEFAULT_FONT, FONTS, fontFamily, fontFor, fontStack, isFontName } from '../src/fonts.js';

describe('the font list', () => {
  test('offers a hand-drawn face, a sans, a serif and a mono that ship in dist, plus the system stacks', () => {
    const bundled = FONTS.filter((font) => font.bundled).map((font) => font.name);
    const system = FONTS.filter((font) => !font.bundled).map((font) => font.name);

    expect(bundled).toEqual(['caveat', 'inter', 'lora', 'jetbrains-mono']);
    expect(system).toEqual(['system', 'system-serif', 'system-mono']);
  });

  test('starts every board on the system font, so nothing changes until it is asked to', () => {
    expect(DEFAULT_FONT).toBe('system');
    expect(fontFor('system').bundled).toBe(false);
  });

  test('a bundled font names itself first and falls back to the system', () => {
    expect(fontStack('caveat')).toMatch(/^"Caveat",/);
    expect(fontStack('caveat')).toMatch(/cursive$/);
    expect(fontStack('jetbrains-mono')).toMatch(/monospace$/);
  });

  test('never fetches: no stack is a URL', () => {
    for (const font of FONTS) {
      expect(font.stack).not.toMatch(/url\(|https?:/);
    }
  });

  test('knows its own names and nothing else', () => {
    expect(isFontName('lora')).toBe(true);
    expect(isFontName('Lora')).toBe(false);
    expect(isFontName('comic-sans')).toBe(false);
    expect(isFontName(null)).toBe(false);
  });

  test('every bundled font has a face declared in styles.css, and no system stack does', () => {
    const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
    const declared = new Set(
      Array.from(css.matchAll(/@font-face\s*\{[^}]*?font-family:\s*"([^"]+)"/g), (match) => match[1]),
    );

    for (const font of FONTS) {
      const family = fontFamily(font);
      if (font.bundled) {
        expect(family, `${font.name} names no family`).not.toBeNull();
        expect(declared.has(family ?? ''), `${family} has no @font-face`).toBe(true);
      } else {
        expect(family).toBeNull();
      }
    }
  });
});
