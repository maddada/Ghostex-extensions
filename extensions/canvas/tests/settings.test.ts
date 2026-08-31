import { describe, expect, test } from 'vitest';

import { DEFAULT_FONT } from '../src/fonts.js';
import {
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  createSettings,
  readSettings,
  setDefaultFont,
} from '../src/settings.js';

describe('settings', () => {
  test('live under one short storage key', () => {
    expect(SETTINGS_STORAGE_KEY).toBe('settings');
  });

  test('start on the system font', () => {
    expect(createSettings()).toEqual({ schemaVersion: SETTINGS_SCHEMA_VERSION, font: DEFAULT_FONT });
  });

  test('read back what was stored', () => {
    expect(readSettings({ schemaVersion: 1, font: 'lora' })).toEqual({
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      font: 'lora',
    });
  });

  test('fall back to defaults for anything unreadable, one field at a time', () => {
    expect(readSettings(null)).toEqual(createSettings());
    expect(readSettings('settings')).toEqual(createSettings());
    expect(readSettings({ schemaVersion: 1, font: 'papyrus' })).toEqual(createSettings());
    expect(readSettings({ schemaVersion: 0, font: 'lora' })).toEqual(createSettings());
  });

  test('changing the font returns new settings and leaves the old ones alone', () => {
    const before = createSettings();
    const after = setDefaultFont(before, 'caveat');

    expect(after.font).toBe('caveat');
    expect(before.font).toBe(DEFAULT_FONT);
    expect(setDefaultFont(after, 'caveat')).toBe(after);
  });
});
