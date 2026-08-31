/**
 * A stand-in for `@excalidraw/excalidraw`.
 *
 * The real component draws on a `<canvas>` with a `ResizeObserver`, fonts and
 * a worker, none of which jsdom has — and none of which these tests are about.
 * What they are about is everything around it: which board is open, what it is
 * called, what reaches the host store. So this renders the scene it is handed
 * as plain DOM, hands the chrome back through the same slot the real component
 * uses, and lets a test push a change through `onChange` the way a drag would.
 */

import type { ReactNode } from 'react';

interface ExcalidrawElementLike {
  id: string;
  type?: string;
  text?: string;
}

interface FakeExcalidrawProps {
  initialData?: { elements?: ExcalidrawElementLike[]; appState?: Record<string, unknown> } | null;
  onChange?: (
    elements: readonly ExcalidrawElementLike[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>,
  ) => void;
  renderTopRightUI?: (isMobile: boolean, appState: unknown) => ReactNode;
  name?: string;
  theme?: string;
  children?: ReactNode;
}

/** The props of the mounted component, refreshed on every render. */
let mounted: FakeExcalidrawProps | null = null;

export function Excalidraw(props: FakeExcalidrawProps) {
  mounted = props;
  const elements = props.initialData?.elements ?? [];
  return (
    <div className="excalidraw" data-testid="excalidraw" data-theme={props.theme}>
      {elements.map((element) => (
        <div key={element.id} className="scene__element" data-element-id={element.id}>
          {element.text ?? ''}
        </div>
      ))}
      <div className="excalidraw-top-right">{props.renderTopRightUI?.(false, {})}</div>
      {props.children}
    </div>
  );
}

/** Driving the mounted stand-in from a test. */
export const excalidraw = {
  /** The scene the app handed Excalidraw to render. */
  elements(): ExcalidrawElementLike[] {
    return mounted?.initialData?.elements ?? [];
  },
  /** What Excalidraw would report after a drag: a new scene. */
  change(elements: ExcalidrawElementLike[], appState: Record<string, unknown> = {}): void {
    mounted?.onChange?.(elements, { scrollX: 0, scrollY: 0, zoom: { value: 1 }, ...appState }, {});
  },
  /** Forgets the mounted component, so one test cannot drive the next one's. */
  reset(): void {
    mounted = null;
  },
};

/** Just enough of Excalidraw's hamburger menu for `app.tsx` to compose one. */
function Item() {
  return null;
}

export const MainMenu = Object.assign(({ children }: { children?: ReactNode }) => <>{children}</>, {
  Separator: () => null,
  DefaultItems: {
    SearchMenu: Item,
    CommandPalette: Item,
    SaveAsImage: Item,
    Help: Item,
    ClearCanvas: Item,
    ToggleTheme: Item,
  },
});
