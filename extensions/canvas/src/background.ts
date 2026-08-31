/**
 * A board's background: a picture of the user's own behind the whole board,
 * and four sliders that keep what is on top of it readable.
 *
 * The picture is shrunk and compressed on import and then stored as a data
 * URL under `background:<board id>` — its own key, beside the board's, so the
 * board document that autosaves on every drag never carries the image. The
 * sliders are CSS filters applied when the background is drawn; the stored
 * picture is never touched again, so every adjustment can be undone by moving
 * the slider back.
 */

import { isRecord } from './stored.js';

/** Bumped whenever the stored shape changes; `readBackground` migrates. */
export const BACKGROUND_SCHEMA_VERSION = 1;

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
  /** The picture, as a data URL small enough to live in the host's JSON store. */
  image: string;
}

export function createBackground(image: string, look: BackgroundLook = NEUTRAL_LOOK): BoardBackground {
  return {
    schemaVersion: BACKGROUND_SCHEMA_VERSION,
    image,
    contrast: look.contrast,
    brightness: look.brightness,
    saturation: look.saturation,
    opacity: look.opacity,
  };
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

/** How the sliders are drawn: filters over the picture, never changes to it. */
export function backgroundStyle(background: BoardBackground): { filter: string; opacity: string } {
  return {
    filter: `contrast(${background.contrast}%) brightness(${background.brightness}%) saturate(${background.saturation}%)`,
    opacity: `${background.opacity / 100}`,
  };
}

/**
 * Turns whatever storage returned into a background, or null when the board
 * has none — which is also what a deleted board's tombstone reads back as.
 */
export function readBackground(raw: unknown): BoardBackground | null {
  if (!isRecord(raw)) return null;
  const version = typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 0;
  if (version < 1) return null;
  const image = raw['image'];
  // Only a data URL of a type we import is a picture we hold ourselves;
  // anything else would be a fetch, or an SVG with script in it.
  if (typeof image !== 'string' || !isImageFile({ type: dataUrlType(image) })) return null;

  const background = createBackground(image);
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
