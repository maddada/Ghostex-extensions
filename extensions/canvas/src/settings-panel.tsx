/**
 * The background panel: a picture of your own behind the board, and the four
 * sliders that keep what is drawn on top of it readable.
 *
 * It owns nothing — the open board's background comes in as a prop and every
 * change goes straight back out — and it closes the way the board switcher
 * does: Escape, or a press anywhere outside it. A background belongs to the
 * board that is open; everything else about how the board looks is Excalidraw's
 * own, and lives in its menus rather than here.
 */

import { useRef } from 'react';

import {
  IMAGE_TYPES,
  LOOK_CONTROLS,
  NEUTRAL_LOOK,
  type BoardBackground,
  type LookKey,
} from './background.js';
import { useDismiss } from './dismiss.js';

export interface SettingsPanelProps {
  /** The open board's background, or null when it has none. */
  background: BoardBackground | null;
  /** The open board's name, so the panel says whose background it is changing. */
  boardName: string;
  /** Why the last import failed, or null. */
  importError: string | null;
  onImport(file: File): void;
  onAdjust(key: LookKey, value: number): void;
  onResetLook(): void;
  onRemoveBackground(): void;
  onClose(): void;
}

/** The `accept` for the file picker: the same list the drop handler checks. */
const IMAGE_ACCEPT = IMAGE_TYPES.join(',');

export function SettingsPanel(props: SettingsPanelProps) {
  const { background, boardName, importError } = props;
  const root = useRef<HTMLDivElement | null>(null);

  // The button that opened the panel is not "outside": a press on it toggles,
  // or opening and closing would fight over the same click.
  useDismiss(root, props.onClose, { ignore: '[data-settings-toggle]' });

  const look = background ?? NEUTRAL_LOOK;

  return (
    <div
      ref={root}
      className="settings"
      role="dialog"
      aria-label="Background"
      data-chrome="settings"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="settings__head">
        <h2 className="settings__title">
          Background <span className="settings__board">{boardName}</span>
        </h2>
        <button
          type="button"
          className="settings__close"
          aria-label="Close background"
          title="Close (Esc)"
          onClick={props.onClose}
        >
          ×
        </button>
      </div>

      <section className="settings__section">
        <div className="settings__row">
          <label className="settings__button settings__button--primary">
            {background ? 'Change picture…' : 'Choose picture…'}
            <input
              type="file"
              className="settings__file"
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
            <button type="button" className="settings__button" onClick={props.onRemoveBackground}>
              Remove
            </button>
          ) : null}
        </div>
        <p className="settings__note">
          PNG, JPEG or WebP — or drop one onto the board. It is shrunk to fit and kept with this
          board only.
        </p>
        {importError ? (
          <p className="settings__error" role="alert">
            {importError}
          </p>
        ) : null}

        <div className="settings__sliders">
          {LOOK_CONTROLS.map((control) => (
            <label key={control.key} className="settings__slider">
              <span className="settings__slider-name">{control.label}</span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={1}
                value={look[control.key]}
                disabled={!background}
                aria-label={control.label}
                onChange={(event) => props.onAdjust(control.key, Number(event.currentTarget.value))}
              />
              <output className="settings__slider-value">{look[control.key]}%</output>
            </label>
          ))}
        </div>
        {background ? (
          <button
            type="button"
            className="settings__button settings__reset"
            onClick={props.onResetLook}
          >
            Reset sliders
          </button>
        ) : null}
      </section>
    </div>
  );
}
