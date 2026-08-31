/**
 * A board's background: the colour behind everything, a picture of the user's
 * own in front of it, and four sliders that keep what is drawn readable.
 *
 * The colour matters more than it looks. Excalidraw would normally paint its
 * own canvas background and offers a picker for it, but Canvas paints that
 * canvas transparent so a picture can sit behind it — which took the picker
 * away. This is what gives it back, and it is the only thing a board with no
 * picture at all still has: a PNG with transparency shows this colour through
 * its holes, so "grey behind my cut-out" is a setting rather than a fact.
 *
 * The picture is shrunk and compressed on import and then stored as a data
 * URL under `background:<board id>` — its own key, beside the board's, so the
 * board document that autosaves on every drag never carries the image. The
 * sliders are CSS filters applied when the picture is drawn; the stored
 * picture is never touched again, so every adjustment can be undone by moving
 * the slider back.
 */

import { isRecord } from './stored.js';

/** Bumped whenever the stored shape changes; `readBackground` migrates. */
export const BACKGROUND_SCHEMA_VERSION = 3;

/**
 * What a board sits on before anything is drawn or imported. The same near
 * black Ghostex uses, so a board looks like part of the app until it is
 * changed — and the one every board had before the colour was settable.
 */
export const DEFAULT_BACKDROP = '#121212';

/**
 * The colours offered a click away. Two darks either side of the default, a
 * true black for a picture that is meant to float, and three papers for a
 * board that reads better light. Any other colour is a picker away.
 */
export const BACKDROP_SWATCHES = [
  { color: '#000000', label: 'Black' },
  { color: DEFAULT_BACKDROP, label: 'Ghostex' },
  { color: '#1e2430', label: 'Slate' },
  { color: '#3d3428', label: 'Sepia' },
  { color: '#f5f2e8', label: 'Paper' },
  { color: '#ffffff', label: 'White' },
] as const;

/** A CSS hex colour, the only shape a stored backdrop may take. */
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isBackdropColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

/** Storage keys are capped at 128 characters by the host bridge. */
export function backgroundStorageKey(boardId: string): string {
  return `background:${boardId}`;
}

/**
 * The longest a stored picture's edge may be. Enough to fill a large Ghostex
 * window without going soft; small enough that the host's JSON store, which is
 * rewritten whole on every save, is not paying for pixels nobody can see.
 */
export const MAX_BACKGROUND_EDGE = 2048;
/** WebP keeps a PNG's transparency and is a fraction of its size. */
export const BACKGROUND_FORMAT = 'image/webp';
export const BACKGROUND_QUALITY = 0.8;

/**
 * What can be dropped or picked, and what a stored picture may be. SVG is left
 * out because it can carry script; GIF because the import would keep one
 * still frame of it, which is not what anyone dropping a GIF meant.
 */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/**
 * How a picture is laid over the board, the way a desktop lays out a
 * wallpaper. `cover` is the default because it is what a photograph almost
 * always wants; `centre` and `tile` are the ones that matter for a small
 * picture, which the others would blow up into a blur.
 */
export const BACKGROUND_FITS = [
  { key: 'cover', label: 'Fill', hint: 'Fills the board, cropping the overflow' },
  { key: 'contain', label: 'Fit', hint: 'Whole picture, letterboxed' },
  { key: 'stretch', label: 'Stretch', hint: 'Fills the board, ignoring the shape' },
  { key: 'center', label: 'Centre', hint: 'Actual size, in the middle' },
  { key: 'tile', label: 'Tile', hint: 'Actual size, repeated' },
] as const;

export type BackgroundFit = (typeof BACKGROUND_FITS)[number]['key'];
export const DEFAULT_FIT: BackgroundFit = 'cover';

export function isBackgroundFit(value: unknown): value is BackgroundFit {
  return typeof value === 'string' && BACKGROUND_FITS.some((fit) => fit.key === value);
}

/** What each fit means in CSS, on the layer the picture is painted on. */
const FIT_CSS: Record<BackgroundFit, { size: string; repeat: string }> = {
  cover: { size: 'cover', repeat: 'no-repeat' },
  contain: { size: 'contain', repeat: 'no-repeat' },
  stretch: { size: '100% 100%', repeat: 'no-repeat' },
  center: { size: 'auto', repeat: 'no-repeat' },
  tile: { size: 'auto', repeat: 'repeat' },
};

export const LOOK_CONTROLS = [
  { key: 'contrast', label: 'Contrast', min: 0, max: 200, neutral: 100 },
  { key: 'brightness', label: 'Brightness', min: 0, max: 200, neutral: 100 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 200, neutral: 100 },
  { key: 'opacity', label: 'Opacity', min: 0, max: 100, neutral: 100 },
] as const;

export type LookKey = (typeof LOOK_CONTROLS)[number]['key'];

/** The four sliders, each a percentage. */
export type BackgroundLook = Record<LookKey, number>;

/** The picture exactly as imported: every slider at its neutral point. */
export const NEUTRAL_LOOK: BackgroundLook = Object.fromEntries(
  LOOK_CONTROLS.map((control) => [control.key, control.neutral]),
) as BackgroundLook;

export interface BoardBackground extends BackgroundLook {
  schemaVersion: number;
  /** What the board sits on. Shows through a picture's transparency. */
  color: string;
  /** How the picture is laid over the board. */
  fit: BackgroundFit;
  /**
   * The picture, as a data URL small enough to live in the host's JSON store,
   * or null for a board that has only chosen a colour.
   */
  image: string | null;
}

export function createBackground(
  image: string | null,
  look: BackgroundLook = NEUTRAL_LOOK,
  color: string = DEFAULT_BACKDROP,
  fit: BackgroundFit = DEFAULT_FIT,
): BoardBackground {
  return {
    schemaVersion: BACKGROUND_SCHEMA_VERSION,
    color: isBackdropColor(color) ? color.toLowerCase() : DEFAULT_BACKDROP,
    fit: isBackgroundFit(fit) ? fit : DEFAULT_FIT,
    image,
    contrast: look.contrast,
    brightness: look.brightness,
    saturation: look.saturation,
    opacity: look.opacity,
  };
}

/** Lays the picture out differently. A fit it already has changes nothing. */
export function setBackgroundFit(background: BoardBackground, fit: BackgroundFit): BoardBackground {
  if (!isBackgroundFit(fit) || background.fit === fit) return background;
  return { ...background, fit };
}

/** Repaints what the board sits on. A colour it already has changes nothing. */
export function setBackdropColor(background: BoardBackground, color: string): BoardBackground {
  if (!isBackdropColor(color)) return background;
  const next = color.toLowerCase();
  return background.color === next ? background : { ...background, color: next };
}

/** Whether a background is worth storing at all, or is just the default again. */
export function isDefaultBackground(background: BoardBackground): boolean {
  return (
    background.image === null &&
    background.color === DEFAULT_BACKDROP &&
    LOOK_CONTROLS.every((control) => background[control.key] === control.neutral)
  );
}

/** Moves one slider. Out-of-range values are clamped; a non-number is ignored. */
export function adjustBackground(
  background: BoardBackground,
  key: LookKey,
  value: number,
): BoardBackground {
  const control = LOOK_CONTROLS.find((entry) => entry.key === key);
  if (!control || !Number.isFinite(value)) return background;
  const next = clamp(Math.round(value), control.min, control.max);
  return background[key] === next ? background : { ...background, [key]: next };
}

/** Every slider back to neutral, the picture kept. */
export function resetLook(background: BoardBackground): BoardBackground {
  return LOOK_CONTROLS.every((control) => background[control.key] === control.neutral)
    ? background
    : { ...background, ...NEUTRAL_LOOK };
}

/**
 * How the picture is drawn: the fit as CSS, and the sliders as filters over
 * it. Nothing here ever changes the stored picture, so every adjustment undoes
 * by moving the control back.
 *
 * It is a painted layer rather than an `<img>` because tiling is a thing an
 * image element cannot do, and one code path for all five fits beats two.
 */
export function backgroundStyle(background: BoardBackground): {
  backgroundImage: string;
  backgroundSize: string;
  backgroundRepeat: string;
  backgroundPosition: string;
  filter: string;
  opacity: string;
} {
  const fit = FIT_CSS[background.fit] ?? FIT_CSS[DEFAULT_FIT];
  return {
    // Quoted, so a data URL's own characters cannot end the CSS value early.
    backgroundImage: background.image === null ? 'none' : `url("${background.image}")`,
    backgroundSize: fit.size,
    backgroundRepeat: fit.repeat,
    backgroundPosition: 'center',
    filter: `contrast(${background.contrast}%) brightness(${background.brightness}%) saturate(${background.saturation}%)`,
    opacity: `${background.opacity / 100}`,
  };
}

/**
 * Turns whatever storage returned into a background, or null when the board
 * has none — which is also what a deleted board's tombstone reads back as.
 *
 * A background is worth having as soon as it says *something*: version 1
 * records were a picture and its sliders, and version 2 records may be a
 * colour alone, so a record with neither reads as no background at all.
 */
export function readBackground(raw: unknown): BoardBackground | null {
  if (!isRecord(raw)) return null;
  const version = typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 0;
  if (version < 1) return null;

  const stored = raw['image'];
  // Only a data URL of a type we import is a picture we hold ourselves;
  // anything else would be a fetch, or an SVG with script in it.
  const image =
    typeof stored === 'string' && isImageFile({ type: dataUrlType(stored) }) ? stored : null;
  // Version 1 had no colour, so one of those reads back on the default the
  // board was already being drawn on: nothing about it changes on upgrade.
  const color = isBackdropColor(raw['color']) ? raw['color'] : DEFAULT_BACKDROP;
  if (image === null && color === DEFAULT_BACKDROP) return null;
  // Before version 3 a picture always filled the board, which is `cover`.
  const fit = isBackgroundFit(raw['fit']) ? raw['fit'] : DEFAULT_FIT;

  const background = createBackground(image, NEUTRAL_LOOK, color, fit);
  for (const control of LOOK_CONTROLS) {
    const value = raw[control.key];
    background[control.key] =
      typeof value === 'number' && Number.isFinite(value)
        ? clamp(Math.round(value), control.min, control.max)
        : control.neutral;
  }
  return background;
}

export function isImageFile(file: { type: string }): boolean {
  return (IMAGE_TYPES as readonly string[]).includes(file.type);
}

/**
 * Decodes a picked or dropped picture, scales it down to the cap without
 * changing its shape, and compresses it into a data URL. Nothing is enlarged.
 */
export async function shrinkImage(
  file: Blob,
  maxEdge: number = MAX_BACKGROUND_EDGE,
  quality: number = BACKGROUND_QUALITY,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot draw pictures.');
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL(BACKGROUND_FORMAT, quality);
  } finally {
    bitmap.close();
  }
}

/** The MIME type a data URL declares, or an empty string for anything else. */
function dataUrlType(value: string): string {
  return /^data:([a-z]+\/[a-z0-9.+-]+)[;,]/i.exec(value)?.[1]?.toLowerCase() ?? '';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
