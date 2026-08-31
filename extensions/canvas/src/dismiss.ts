/**
 * Closing a floating piece of chrome the way every menu and panel on the
 * board closes: Escape, or a press anywhere outside it.
 *
 * Layout effect, not effect: the listener is on from the moment the thing is
 * on screen, so the very next click outside it closes it. Escape is stopped
 * so the board's own key handling never sees the press that closed a menu.
 */

import type { RefObject } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

export interface DismissOptions {
  /** Whether the thing is open at all; nothing is listened for while it is not. */
  active?: boolean;
  /** A selector for a control that must not count as "outside": its own toggle button. */
  ignore?: string;
}

export function useDismiss(
  root: RefObject<HTMLElement>,
  onClose: () => void,
  { active = true, ignore }: DismissOptions = {},
): void {
  // The newest close function, so the listener never calls a stale one and
  // never has to be re-attached for it.
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    if (!active) return;
    const owner = root.current?.ownerDocument ?? document;

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && root.current?.contains(target)) return;
      if (ignore && target instanceof Element && target.closest(ignore)) return;
      close.current();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close.current();
    };

    owner.addEventListener('pointerdown', onPointerDown, true);
    owner.addEventListener('keydown', onKeyDown);
    return () => {
      owner.removeEventListener('pointerdown', onPointerDown, true);
      owner.removeEventListener('keydown', onKeyDown);
    };
  }, [active, ignore, root]);
}
