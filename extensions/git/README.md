# Git

A responsive Git workspace for Ghostex. Open it as a 1200×800 modal, a full
view, or a compact popup without changing tools or losing repository context.

## Features

- See the current branch and its ahead/behind state.
- Stage or unstage individual changed files.
- Review staged, unstaged, renamed, deleted, and untracked-file diffs.
- Commit staged work or amend the latest commit with a new message.
- List, switch, and create local branches.
- Browse the latest 30 commits with author and date metadata.
- Refresh explicitly or automatically when the extension regains focus.

In a wide view, Git uses three panes for branches, files, and the selected
diff. Modal-sized windows use a focused two-column workspace, and widths below
720px stack the controls and diff vertically.

## Project access

Git requests the `exec` permission. Every command runs with
`ghostex.context().project.path` as its working directory, so an active
worktree is handled as its own repository context. The extension invokes the
system Git executable directly and does not send repository data anywhere.

## Development

The extension is dependency-free and its committed `dist/` mirrors `src/`.
Run the parser acceptance check from the repository root:

```sh
node extensions/git/selftest.mjs --selftest
```

Then validate the manifest and build the catalog with the repository tooling.
