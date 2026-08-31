/**
 * The settings panel: every look option Canvas has, editable from inside the
 * board instead of hardcoded or hidden in Ghostex's preferences.
 *
 * It owns nothing — the settings and the open board's background come in as
 * props and every change goes straight back out — and it closes the way the
 * board switcher does: Escape, or a press anywhere outside it. Text options
 * apply to every board; the background belongs to the board that is open.
 */

import { useRef } from 'preact/hooks';

import {
  IMAGE_TYPES,
  LOOK_CONTROLS,
  NEUTRAL_LOOK,
  type BoardBackground,
  type LookKey,
} from './background.js';
import { useDismiss } from './dismiss.js';
import { FONTS, type FontName } from './fonts.js';
import type { CanvasSettings } from './settings.js';

export interface SettingsPanelProps {
  settings: CanvasSettings;
  /** The open board's background, or null when it has none. */
  background: BoardBackground | null;
  /** The open board's name, so the panel says whose background it is changing. */
  boardName: string;
  /** Why the last import failed, or null. */
  importError: string | null;
  onFont(font: FontName): void;
  onImport(file: File): void;
  onAdjust(key: LookKey, value: number): void;
  onResetLook(): void;
  onRemoveBackground(): void;
  onClose(): void;
}

/** The `accept` for the file picker: the same list the drop handler checks. */
const IMAGE_ACCEPT = IMAGE_TYPES.join(',');

export function SettingsPanel(props: SettingsPanelProps) {
  const { settings, background, boardName, importError } = props;
  const root = useRef<HTMLDivElement | null>(null);

  // The toolbar button that opened the panel is not "outside": a press on it
  // toggles, or opening and closing would fight over the same click.
  useDismiss(root, props.onClose, { ignore: '[data-settings-toggle]' });

  const look = background ?? NEUTRAL_LOOK;

  return (
    <div
      ref={root}
      class="settings"
      role="dialog"
      aria-label="Settings"
      data-chrome="settings"
      onPointerDown={(event) => event.stopPropagation()}
      onDblClick={(event) => event.stopPropagation()}
    >
      <div class="settings__head">
        <h2 class="settings__title">Settings</h2>
        <button
          type="button"
          class="settings__close"
          aria-label="Close settings"
          title="Close (Esc)"
          onClick={props.onClose}
        >
          ×
        </button>
      </div>

      <section class="settings__section">
        <h3 class="settings__heading">Text</h3>
        <p class="settings__note">
          The font for every note and label. A note can pick its own from the bar above it.
        </p>
        <div class="settings__fonts" role="radiogroup" aria-label="Default font">
          {FONTS.map((font) => (
            <button
              key={font.name}
              type="button"
              role="radio"
              class={`settings__font${font.name === settings.font ? ' settings__font--on' : ''}`}
              style={{ fontFamily: font.stack }}
              aria-checked={font.name === settings.font}
              onClick={() => props.onFont(font.name)}
            >
              <span class="settings__font-name">{font.label}</span>
              <span class="settings__font-hint">{font.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section class="settings__section">
        <h3 class="settings__heading">
          Background <span class="settings__board">{boardName}</span>
        </h3>
        <div class="settings__row">
          <label class="settings__button settings__button--primary">
            {background ? 'Change picture…' : 'Choose picture…'}
            <input
              type="file"
              class="settings__file"
              accept={IMAGE_ACCEPT}
              aria-label="Choose a background picture"
              onChange={(event) => {
                const field = event.currentTarget;
                const file = field.files?.[0];
                // Cleared so the same file can be picked again after Remove.
                field.value = '';
                if (file) props.onImport(file);
              }}
            />
          </label>
          {background ? (
            <button type="button" class="settings__button" onClick={props.onRemoveBackground}>
              Remove
            </button>
          ) : null}
        </div>
        <p class="settings__note">
          PNG, JPEG or WebP — or drop one onto the board. It is shrunk to fit and kept with this
          board only.
        </p>
        {importError ? (
          <p class="settings__error" role="alert">
            {importError}
          </p>
        ) : null}

        <div class="settings__sliders">
          {LOOK_CONTROLS.map((control) => (
            <label key={control.key} class="settings__slider">
              <span class="settings__slider-name">{control.label}</span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={1}
                value={look[control.key]}
                disabled={!background}
                aria-label={control.label}
                onInput={(event) => props.onAdjust(control.key, Number(event.currentTarget.value))}
              />
              <output class="settings__slider-value">{look[control.key]}%</output>
            </label>
          ))}
        </div>
        {background ? (
          <button type="button" class="settings__button settings__reset" onClick={props.onResetLook}>
            Reset sliders
          </button>
        ) : null}
      </section>
    </div>
  );
}
