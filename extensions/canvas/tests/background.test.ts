import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  BACKDROP_SWATCHES,
  BACKGROUND_SCHEMA_VERSION,
  DEFAULT_BACKDROP,
  DEFAULT_FIT,
  LOOK_CONTROLS,
  MAX_BACKGROUND_EDGE,
  NEUTRAL_LOOK,
  adjustBackground,
  backgroundStorageKey,
  backgroundStyle,
  createBackground,
  isBackdropColor,
  isDefaultBackground,
  isImageFile,
  readBackground,
  resetLook,
  setBackdropColor,
  setBackgroundFit,
  shrinkImage,
  type BackgroundFit,
} from '../src/background.js';

const IMAGE = 'data:image/webp;base64,c2hydW5r';

describe('a board background', () => {
  test('lives in its own key next to the board, so board saves stay lean', () => {
    expect(backgroundStorageKey('default')).toBe('background:default');
    expect(backgroundStorageKey('b2')).not.toBe('board:b2');
  });

  test('starts neutral: the picture as imported, on the default colour', () => {
    expect(createBackground(IMAGE)).toEqual({
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      color: DEFAULT_BACKDROP,
      fit: DEFAULT_FIT,
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

    expect(backgroundStyle(tuned)).toMatchObject({
      filter: 'contrast(120%) brightness(90%) saturate(50%)',
      opacity: '0.35',
    });
  });

  describe('reading it back from storage', () => {
    test('returns what was stored', () => {
      const stored = { ...createBackground(IMAGE), opacity: 60 };
      expect(readBackground(stored)).toEqual(stored);
    });

    test('is null for nothing, for a tombstone, and for a board saying nothing', () => {
      expect(readBackground(null)).toBeNull();
      expect(readBackground(undefined)).toBeNull();
      expect(readBackground({ schemaVersion: 2 })).toBeNull();
      // A picture that is not one we hold ourselves leaves nothing behind, and
      // the default colour on its own is not worth a record either.
      expect(readBackground({ schemaVersion: 2, image: 'https://example.com/a.png' })).toBeNull();
      expect(readBackground({ schemaVersion: 2, image: 'data:image/svg+xml;base64,PHN2Zz4=' })).toBeNull();
      expect(readBackground({ schemaVersion: 2, image: 'data:text/html,<b>' })).toBeNull();
      expect(readBackground({ schemaVersion: 2, color: DEFAULT_BACKDROP })).toBeNull();
      expect(readBackground({ schemaVersion: 2, image: 'data:image/png;base64,iVBOR' })).not.toBeNull();
      expect(readBackground({ schemaVersion: 0, image: IMAGE })).toBeNull();
    });

    test('coerces every slider, so a hand-edited store cannot break the board', () => {
      expect(
        readBackground({ schemaVersion: 1, image: IMAGE, contrast: 999, brightness: 'x', opacity: -1 }),
      ).toEqual({ ...createBackground(IMAGE), contrast: 200, opacity: 0 });
    });

    test('a background saved before colours existed keeps the board it had', () => {
      // Version 1 had no colour, and every board was drawn on the default, so
      // reading one back must change nothing about how it looks.
      expect(readBackground({ schemaVersion: 1, image: IMAGE, ...NEUTRAL_LOOK })?.color).toBe(
        DEFAULT_BACKDROP,
      );
    });

    test('a colour that is not a hex colour falls back rather than reaching CSS', () => {
      for (const bad of ['red', '#fff', 'rgb(0,0,0)', 'url(evil)', 42, null]) {
        expect(readBackground({ schemaVersion: 2, image: IMAGE, color: bad })?.color).toBe(
          DEFAULT_BACKDROP,
        );
      }
    });
  });
});

describe('how the picture lies over the board', () => {
  test('fills the board unless told otherwise', () => {
    expect(createBackground(IMAGE).fit).toBe('cover');
    expect(backgroundStyle(createBackground(IMAGE))).toMatchObject({
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    });
  });

  test('each fit is the CSS a desktop would use for that wallpaper', () => {
    const css = (fit: BackgroundFit) => backgroundStyle(setBackgroundFit(createBackground(IMAGE), fit));

    expect(css('contain')).toMatchObject({ backgroundSize: 'contain', backgroundRepeat: 'no-repeat' });
    expect(css('stretch')).toMatchObject({ backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' });
    expect(css('center')).toMatchObject({ backgroundSize: 'auto', backgroundRepeat: 'no-repeat' });
    expect(css('tile')).toMatchObject({ backgroundSize: 'auto', backgroundRepeat: 'repeat' });
  });

  test('the picture is quoted, so its own characters cannot end the CSS value', () => {
    expect(backgroundStyle(createBackground(IMAGE)).backgroundImage).toBe(`url("${IMAGE}")`);
    expect(backgroundStyle(createBackground(null)).backgroundImage).toBe('none');
  });

  test('setting a fit keeps everything else, and setting the same one changes nothing', () => {
    const tuned = adjustBackground(createBackground(IMAGE), 'opacity', 40);
    const tiled = setBackgroundFit(tuned, 'tile');

    expect(tiled.fit).toBe('tile');
    expect(tiled.image).toBe(IMAGE);
    expect(tiled.opacity).toBe(40);
    expect(setBackgroundFit(tiled, 'tile')).toBe(tiled);
  });

  test('a fit the board has never heard of is refused', () => {
    const background = createBackground(IMAGE);

    for (const bad of ['zoom', '', 'COVER', 42, null]) {
      expect(setBackgroundFit(background, bad as BackgroundFit)).toBe(background);
    }
    expect(readBackground({ ...createBackground(IMAGE), fit: 'nonsense' })?.fit).toBe(DEFAULT_FIT);
  });

  test('a background saved before fits existed still fills the board', () => {
    // Every picture filled the board before version 3, which is `cover`.
    expect(readBackground({ schemaVersion: 2, image: IMAGE, ...NEUTRAL_LOOK })?.fit).toBe('cover');
  });
});

describe('the colour a board sits on', () => {
  test('a board can have one with no picture at all', () => {
    const stored = createBackground(null, NEUTRAL_LOOK, '#000000');

    expect(readBackground(stored)).toEqual(stored);
    expect(readBackground(stored)?.image).toBeNull();
  });

  test('setting it keeps everything else, and setting the same one changes nothing', () => {
    const tuned = adjustBackground(createBackground(IMAGE), 'opacity', 40);
    const painted = setBackdropColor(tuned, '#000000');

    expect(painted.color).toBe('#000000');
    expect(painted.image).toBe(IMAGE);
    expect(painted.opacity).toBe(40);
    expect(setBackdropColor(painted, '#000000')).toBe(painted);
  });

  test('is stored lower-case, so the swatch a board is on always matches', () => {
    expect(setBackdropColor(createBackground(null), '#AABBCC').color).toBe('#aabbcc');
    expect(createBackground(null, NEUTRAL_LOOK, '#AABBCC').color).toBe('#aabbcc');
  });

  test('anything that is not a hex colour is refused, not written into CSS', () => {
    const background = createBackground(IMAGE);

    for (const bad of ['red', '#ffff', 'rgb(0,0,0)', '#12121', 'javascript:alert(1)']) {
      expect(setBackdropColor(background, bad)).toBe(background);
    }
  });

  test('every offered swatch is a real colour, and the default is among them', () => {
    for (const swatch of BACKDROP_SWATCHES) expect(isBackdropColor(swatch.color)).toBe(true);
    expect(BACKDROP_SWATCHES.map((swatch) => swatch.color)).toContain(DEFAULT_BACKDROP);
  });

  test('a board back on the default with no picture is worth storing nothing', () => {
    expect(isDefaultBackground(createBackground(null))).toBe(true);
    expect(isDefaultBackground(createBackground(null, NEUTRAL_LOOK, '#000000'))).toBe(false);
    expect(isDefaultBackground(createBackground(IMAGE))).toBe(false);
    // A slider moved on a picture-less board still says something.
    expect(isDefaultBackground(adjustBackground(createBackground(null), 'opacity', 40))).toBe(false);
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
