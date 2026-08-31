import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  BACKGROUND_SCHEMA_VERSION,
  LOOK_CONTROLS,
  MAX_BACKGROUND_EDGE,
  NEUTRAL_LOOK,
  adjustBackground,
  backgroundStorageKey,
  backgroundStyle,
  createBackground,
  isImageFile,
  readBackground,
  resetLook,
  shrinkImage,
} from '../src/background.js';

const IMAGE = 'data:image/webp;base64,c2hydW5r';

describe('a board background', () => {
  test('lives in its own key next to the board, so board saves stay lean', () => {
    expect(backgroundStorageKey('default')).toBe('background:default');
    expect(backgroundStorageKey('b2')).not.toBe('board:b2');
  });

  test('starts neutral: the picture as imported', () => {
    expect(createBackground(IMAGE)).toEqual({
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      image: IMAGE,
      ...NEUTRAL_LOOK,
    });
  });

  test('has four controls, each with a range and a neutral point', () => {
    expect(LOOK_CONTROLS.map((control) => control.key)).toEqual([
      'contrast',
      'brightness',
      'saturation',
      'opacity',
    ]);
    for (const control of LOOK_CONTROLS) {
      expect(control.min).toBeLessThan(control.neutral);
      expect(control.neutral).toBeLessThanOrEqual(control.max);
      expect(NEUTRAL_LOOK[control.key]).toBe(control.neutral);
    }
  });

  test('a slider moves one value, clamped to its range, and rounded', () => {
    const background = createBackground(IMAGE);

    expect(adjustBackground(background, 'contrast', 140).contrast).toBe(140);
    expect(adjustBackground(background, 'opacity', 250).opacity).toBe(100);
    expect(adjustBackground(background, 'brightness', -5).brightness).toBe(0);
    expect(adjustBackground(background, 'saturation', 33.6).saturation).toBe(34);
    expect(adjustBackground(background, 'saturation', Number.NaN)).toBe(background);
    expect(adjustBackground(background, 'contrast', 100)).toBe(background);
  });

  test('reset puts every slider back and keeps the picture', () => {
    const tuned = adjustBackground(adjustBackground(createBackground(IMAGE), 'opacity', 40), 'contrast', 160);

    expect(resetLook(tuned)).toEqual(createBackground(IMAGE));
    expect(resetLook(createBackground(IMAGE))).toEqual(createBackground(IMAGE));
  });

  test('is drawn with CSS filters, never by touching the picture', () => {
    const tuned = { ...createBackground(IMAGE), contrast: 120, brightness: 90, saturation: 50, opacity: 35 };

    expect(backgroundStyle(tuned)).toEqual({
      filter: 'contrast(120%) brightness(90%) saturate(50%)',
      opacity: '0.35',
    });
  });

  describe('reading it back from storage', () => {
    test('returns what was stored', () => {
      const stored = { ...createBackground(IMAGE), opacity: 60 };
      expect(readBackground(stored)).toEqual(stored);
    });

    test('is null for nothing, for a tombstone, and for anything without a picture', () => {
      expect(readBackground(null)).toBeNull();
      expect(readBackground(undefined)).toBeNull();
      expect(readBackground({ schemaVersion: 1 })).toBeNull();
      expect(readBackground({ schemaVersion: 1, image: 'https://example.com/a.png' })).toBeNull();
      expect(readBackground({ schemaVersion: 1, image: 'data:image/svg+xml;base64,PHN2Zz4=' })).toBeNull();
      expect(readBackground({ schemaVersion: 1, image: 'data:text/html,<b>' })).toBeNull();
      expect(readBackground({ schemaVersion: 1, image: 'data:image/png;base64,iVBOR' })).not.toBeNull();
      expect(readBackground({ schemaVersion: 0, image: IMAGE })).toBeNull();
    });

    test('coerces every slider, so a hand-edited store cannot break the board', () => {
      expect(
        readBackground({ schemaVersion: 1, image: IMAGE, contrast: 999, brightness: 'x', opacity: -1 }),
      ).toEqual({ ...createBackground(IMAGE), contrast: 200, opacity: 0 });
    });
  });
});

describe('shrinking an imported picture', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap;
  });

  test('accepts the raster types a board can show and nothing else', () => {
    expect(isImageFile(new File([''], 'a.png', { type: 'image/png' }))).toBe(true);
    expect(isImageFile(new File([''], 'a.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(isImageFile(new File([''], 'a.webp', { type: 'image/webp' }))).toBe(true);
    expect(isImageFile(new File([''], 'a.svg', { type: 'image/svg+xml' }))).toBe(false);
    // A GIF would come out as one still frame, which is not what dropping one meant.
    expect(isImageFile(new File([''], 'a.gif', { type: 'image/gif' }))).toBe(false);
    expect(isImageFile(new File([''], 'a.txt', { type: 'text/plain' }))).toBe(false);
  });

  test('scales the long edge down to the cap, keeps the shape, and compresses', async () => {
    const close = vi.fn();
    (globalThis as { createImageBitmap?: unknown }).createImageBitmap = vi.fn(async () => ({
      width: 4000,
      height: 2000,
      close,
    }));
    const drawImage = vi.fn();
    const sized: { width?: number; height?: number } = {};
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      sized.width = this.width;
      sized.height = this.height;
      return { drawImage } as unknown as CanvasRenderingContext2D;
    });
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(IMAGE);

    const image = await shrinkImage(new File(['png'], 'big.png', { type: 'image/png' }));

    expect(image).toBe(IMAGE);
    expect(sized).toEqual({ width: MAX_BACKGROUND_EDGE, height: MAX_BACKGROUND_EDGE / 2 });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, MAX_BACKGROUND_EDGE, MAX_BACKGROUND_EDGE / 2);
    expect(toDataURL).toHaveBeenCalledWith('image/webp', expect.any(Number));
    expect(close).toHaveBeenCalled();
  });

  test('never enlarges a small picture', async () => {
    (globalThis as { createImageBitmap?: unknown }).createImageBitmap = vi.fn(async () => ({
      width: 300,
      height: 200,
      close: vi.fn(),
    }));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(IMAGE);

    await shrinkImage(new File(['png'], 'small.png', { type: 'image/png' }));

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 300, 200);
  });

  test('fails plainly when the picture cannot be decoded', async () => {
    (globalThis as { createImageBitmap?: unknown }).createImageBitmap = vi.fn(async () => {
      throw new Error('decode failed');
    });

    await expect(shrinkImage(new File(['?'], 'broken.png', { type: 'image/png' }))).rejects.toThrow();
  });
});
