/**
 * Settings: the look options that apply to every board, kept in one storage
 * key of their own rather than in the manifest's preferences, so they can be
 * changed from inside the canvas and grow without a new consent prompt.
 *
 * Per-board looks — a board's background — are not here; `background.ts`
 * owns those. Every function is pure: the app writes what it gets back.
 */

import { DEFAULT_FONT, isFontName, type FontName } from './fonts.js';
import { isRecord } from './stored.js';

/** Bumped whenever the stored shape changes; `readSettings` migrates. */
export const SETTINGS_SCHEMA_VERSION = 1;

export const SETTINGS_STORAGE_KEY = 'settings';

export interface CanvasSettings {
  schemaVersion: number;
  /** What notes and labels are written in, unless a note picks its own font. */
  font: FontName;
}

export function createSettings(): CanvasSettings {
  return { schemaVersion: SETTINGS_SCHEMA_VERSION, font: DEFAULT_FONT };
}

export function setDefaultFont(settings: CanvasSettings, font: FontName): CanvasSettings {
  return settings.font === font ? settings : { ...settings, font };
}

/**
 * Turns whatever storage returned into usable settings. The store is shared,
 * hand-editable JSON, so each field is coerced on its own and anything
 * unreadable falls back to its default instead of taking the rest down.
 */
export function readSettings(raw: unknown): CanvasSettings {
  const defaults = createSettings();
  if (!isRecord(raw)) return defaults;
  const version = typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 0;
  if (version < 1) return defaults;
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    font: isFontName(raw['font']) ? raw['font'] : defaults.font,
  };
}
