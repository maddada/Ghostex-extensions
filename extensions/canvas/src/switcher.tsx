/**
 * The board switcher: the board's name in the top-left corner, and the menu
 * behind it that lists every board and manages them.
 *
 * It owns no board state — the index comes in as a prop and every action goes
 * straight back out — but it does own its own transient modes: the menu is
 * either listing boards, taking a name for a new or renamed board, or asking
 * whether a delete was meant.
 */

import { useLayoutEffect, useRef, useState } from 'react';

import { projectLabel, type HostProject } from './bridge.js';
import {
  MAX_BOARD_NAME_LENGTH,
  boardForProject,
  currentBoard,
  type BoardsIndex,
} from './boards.js';
import { useDismiss } from './dismiss.js';

export interface SwitcherProps {
  index: BoardsIndex;
  /** The project Ghostex has open, or null when it has none. */
  project: HostProject | null;
  onOpen(id: string): void;
  onCreate(name: string, projectId: string | null): void;
  /** Renames the open board. */
  onRename(name: string): void;
  /** Links the open board to a project, or unlinks it with null. */
  onLink(projectId: string | null): void;
  /** Copies the open board to the clipboard as JSON. */
  onCopy(): void;
  /** Deletes the open board. */
  onDelete(): void;
}

type Mode = 'list' | 'create' | 'rename' | 'delete';

export function Switcher(props: SwitcherProps) {
  const { index, project } = props;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('list');
  const root = useRef<HTMLDivElement | null>(null);

  const board = currentBoard(index);
  const linked = project ? boardForProject(index, project.id) : null;

  function close(): void {
    setOpen(false);
    setMode('list');
  }

  /** Every action closes the menu: one click, one outcome, back to the board. */
  function run(action: () => void): void {
    action();
    close();
  }

  useDismiss(root, close, { active: open });

  return (
    <div className="boards" ref={root} data-chrome="boards">
      <button
        type="button"
        className="boards__current"
        aria-label="Boards"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className="boards__name">{board.name}</span>
        {board.projectId !== null ? (
          <span className="boards__link" title={`Linked to ${projectLabel(board.projectId)}`}>
            ◆
          </span>
        ) : null}
        <span className="boards__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="boards__menu" role="menu" aria-label="Boards">
          {mode === 'list' ? (
            <List
              {...props}
              board={board}
              linked={linked}
              onMode={setMode}
              onRun={run}
            />
          ) : null}

          {mode === 'create' ? (
            <NameForm
              label="Name the new board"
              submit="Create"
              initial=""
              onCancel={() => setMode('list')}
              onSubmit={(name) => run(() => props.onCreate(name, null))}
            />
          ) : null}

          {mode === 'rename' ? (
            <NameForm
              label="Rename this board"
              submit="Save"
              initial={board.name}
              onCancel={() => setMode('list')}
              onSubmit={(name) => run(() => props.onRename(name))}
            />
          ) : null}

          {mode === 'delete' ? (
            <div className="boards__confirm">
              <p className="boards__question">Delete “{board.name}” and everything on it?</p>
              <div className="boards__row">
                <button
                  type="button"
                  className="boards__button boards__button--danger"
                  onClick={() => run(props.onDelete)}
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  className="boards__button"
                  onClick={() => setMode('list')}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function List({
  index,
  project,
  board,
  linked,
  onOpen,
  onLink,
  onCreate,
  onCopy,
  onMode,
  onRun,
}: SwitcherProps & {
  board: { id: string; name: string; projectId: string | null };
  linked: { id: string; name: string } | null;
  onMode(mode: Mode): void;
  onRun(action: () => void): void;
}) {
  return (
    <>
      {/*
        The active project's board is the one the user most likely wants, so it
        is offered above the list — or offered to be created, if it has none.
        Nothing switches on its own: Ghostex changing project never moves the
        board out from under whoever is drawing on it.
      */}
      {project ? (
        <div className="boards__section">
          <p className="boards__heading">Project · {project.name}</p>
          {linked === null ? (
            <button
              type="button"
              className="boards__item"
              role="menuitem"
              onClick={() => onRun(() => onCreate(project.name, project.id))}
            >
              New board for {project.name}
            </button>
          ) : linked.id === board.id ? (
            <p className="boards__note">This board is linked to {project.name}.</p>
          ) : (
            <button
              type="button"
              className="boards__item"
              role="menuitem"
              onClick={() => onRun(() => onOpen(linked.id))}
            >
              Open “{linked.name}”
            </button>
          )}
        </div>
      ) : null}

      <div className="boards__section boards__section--list">
        <p className="boards__heading">Boards</p>
        {index.boards.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`boards__item${entry.id === board.id ? ' boards__item--current' : ''}`}
            role="menuitemradio"
            aria-checked={entry.id === board.id}
            data-board-id={entry.id}
            onClick={() => onRun(() => onOpen(entry.id))}
          >
            <span className="boards__tick" aria-hidden="true">
              {entry.id === board.id ? '✓' : ''}
            </span>
            <span className="boards__label">{entry.name}</span>
            {entry.projectId !== null ? (
              <span className="boards__project">{projectLabel(entry.projectId)}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="boards__section">
        <button type="button" className="boards__item" role="menuitem" onClick={() => onMode('create')}>
          New board…
        </button>
        <button type="button" className="boards__item" role="menuitem" onClick={() => onMode('rename')}>
          Rename this board…
        </button>
        <button
          type="button"
          className="boards__item"
          role="menuitem"
          onClick={() => onRun(onCopy)}
        >
          Copy this board as JSON
        </button>
        {project ? (
          board.projectId === project.id ? (
            <button
              type="button"
              className="boards__item"
              role="menuitem"
              onClick={() => onRun(() => onLink(null))}
            >
              Unlink from {project.name}
            </button>
          ) : (
            <button
              type="button"
              className="boards__item"
              role="menuitem"
              onClick={() => onRun(() => onLink(project.id))}
            >
              Link this board to {project.name}
            </button>
          )
        ) : null}
        <button
          type="button"
          className="boards__item boards__item--danger"
          role="menuitem"
          onClick={() => onMode('delete')}
        >
          Delete this board…
        </button>
      </div>
    </>
  );
}

function NameForm({
  label,
  submit,
  initial,
  onSubmit,
  onCancel,
}: {
  label: string;
  submit: string;
  initial: string;
  onSubmit(name: string): void;
  onCancel(): void;
}) {
  const field = useRef<HTMLInputElement | null>(null);

  useLayoutEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  return (
    <form
      className="boards__form"
      onSubmit={(event) => {
        event.preventDefault();
        const name = field.current?.value.trim() ?? '';
        if (name.length === 0) return;
        onSubmit(name);
      }}
    >
      <label className="boards__heading" htmlFor="board-name">
        {label}
      </label>
      <input
        ref={field}
        id="board-name"
        className="boards__input"
        type="text"
        defaultValue={initial}
        maxLength={MAX_BOARD_NAME_LENGTH}
        autoComplete="off"
        spellCheck={false}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          onCancel();
        }}
      />
      <div className="boards__row">
        <button type="submit" className="boards__button boards__button--primary">
          {submit}
        </button>
        <button type="button" className="boards__button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
