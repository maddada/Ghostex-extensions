import { parseUnifiedDiff, summarizeDiff } from './diff-parser.mjs';

const STATUS_COMMAND = 'git status --porcelain=v1 -z --branch';
const BRANCH_COMMAND =
  "git for-each-ref --sort=-committerdate --format='%(refname:short)%1f%(HEAD)%1f%(objectname:short)%1f%(subject)' refs/heads";
const LOG_COMMAND = "git log --all -n 30 --date=short --pretty=format:'%h%x1f%an%x1f%ad%x1f%s'";

const elements = Object.fromEntries(
  [
    'project-name',
    'placement-badge',
    'refresh-button',
    'notice',
    'workspace',
    'branch-count',
    'branch-list',
    'branch-list-compact',
    'branch-form',
    'branch-form-compact',
    'current-branch',
    'sync-state',
    'file-count',
    'file-list',
    'commit-form',
    'commit-message',
    'commit-button',
    'amend-button',
    'diff-kicker',
    'diff-file',
    'diff-summary',
    'diff-view',
    'history-view',
    'diff-tab',
    'history-tab',
  ].map((id) => [id, document.getElementById(id)])
);

const state = {
  context: null,
  status: { branch: '', ahead: 0, behind: 0, files: [] },
  branches: [],
  history: [],
  selectedPath: null,
  refreshToken: 0,
  operationLocked: false,
};

function bridge() {
  if (!window.ghostex || window.ghostex.__bridgeVersion !== 1) {
    throw new Error('The Ghostex extension bridge is unavailable.');
  }
  return window.ghostex;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function gitError(command, result) {
  const details = (result.stderr || result.stdout || 'Git did not provide an error message.').trim();
  return new Error(`${command} failed (exit ${result.exitCode}): ${details}`);
}

async function runGit(command, allowedExitCodes = [0]) {
  const projectPath = state.context?.project?.path;
  if (!projectPath) {
    throw new Error('Choose a Ghostex project with a local path before opening Git.');
  }

  const result = await bridge().exec(command, { cwd: projectPath });
  if (!allowedExitCodes.includes(result.exitCode)) {
    throw gitError(command, result);
  }
  return result.stdout;
}

function parseBranchHeader(header) {
  const value = header.startsWith('## ') ? header.slice(3) : header;
  if (value.startsWith('HEAD (no branch)')) {
    return { branch: 'Detached HEAD', ahead: 0, behind: 0 };
  }
  if (value.startsWith('No commits yet on ')) {
    return { branch: value.slice('No commits yet on '.length), ahead: 0, behind: 0 };
  }

  const [branchPart] = value.split('...');
  const counts = value.match(/\[(?:ahead (\d+))?(?:, )?(?:behind (\d+))?\]/);
  return {
    branch: branchPart || 'Unknown branch',
    ahead: Number(counts?.[1] ?? 0),
    behind: Number(counts?.[2] ?? 0),
  };
}

function parseStatus(output) {
  const records = output.split('\0').filter(Boolean);
  let branch = 'Unknown branch';
  let ahead = 0;
  let behind = 0;

  if (records[0]?.startsWith('## ')) {
    ({ branch, ahead, behind } = parseBranchHeader(records.shift()));
  }

  const files = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.length < 4) continue;

    const status = record.slice(0, 2);
    const path = record.slice(3);
    const renamed = /[RC]/.test(status);
    const originalPath = renamed ? (records[index + 1] ?? '') : '';
    if (renamed) index += 1;

    files.push({
      path,
      originalPath,
      indexStatus: status[0],
      worktreeStatus: status[1],
      staged: status[0] !== ' ' && status[0] !== '?',
      untracked: status === '??',
    });
  }

  return { branch, ahead, behind, files };
}

function parseBranches(output) {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name = '', head = '', hash = '', subject = ''] = line.split('\x1f');
      return { name, current: head === '*', hash, subject };
    });
}

function parseHistory(output) {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash = '', author = '', date = '', subject = ''] = line.split('\x1f');
      return { hash, author, date, subject };
    });
}

function statusLabel(file) {
  if (file.untracked) return 'U';
  const code = `${file.indexStatus}${file.worktreeStatus}`.trim();
  return code || 'M';
}

function fileParts(path) {
  const slash = path.lastIndexOf('/');
  return {
    name: slash === -1 ? path : path.slice(slash + 1),
    directory: slash === -1 ? '' : path.slice(0, slash),
  };
}

function emptyState(message) {
  const node = document.createElement('div');
  node.className = 'empty-state';
  node.textContent = message;
  return node;
}

function showNotice(message, tone = 'error') {
  elements.notice.textContent = message;
  elements.notice.classList.toggle('neutral', tone === 'neutral');
  elements.notice.hidden = false;
}

function hideNotice() {
  elements.notice.hidden = true;
  elements.notice.textContent = '';
}

function setBusy(busy) {
  elements['refresh-button'].disabled = busy;
  elements['refresh-button'].classList.toggle('busy', busy);
}

function setOperationLocked(locked) {
  state.operationLocked = locked;
  elements.workspace.classList.toggle('operation-lock', locked);
  elements['commit-button'].disabled = locked || !state.status.files.some((file) => file.staged);
  elements['amend-button'].disabled = locked;
  elements['refresh-button'].disabled = locked;
}

function applyContext(context) {
  state.context = context;
  const placement = context.placement || 'modal';
  document.body.dataset.placement = placement;
  elements['placement-badge'].textContent = placement;
  elements['project-name'].textContent = context.project?.name || context.project?.path || 'No active project';
}

function renderBranchList(target) {
  target.replaceChildren();
  if (state.branches.length === 0) {
    target.append(emptyState('No local branches'));
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const branch of state.branches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `branch-row${branch.current ? ' current' : ''}`;
    button.disabled = branch.current;
    button.title = branch.current ? 'Current branch' : `Switch to ${branch.name}`;
    button.addEventListener('click', () => switchBranch(branch.name));

    const dot = document.createElement('span');
    dot.className = 'branch-dot';
    dot.textContent = branch.current ? '●' : '○';

    const copy = document.createElement('span');
    copy.className = 'branch-copy';
    const name = document.createElement('strong');
    name.textContent = branch.name;
    const detail = document.createElement('span');
    detail.textContent = [branch.hash, branch.subject].filter(Boolean).join(' · ');
    copy.append(name, detail);
    button.append(dot, copy);
    fragment.append(button);
  }
  target.append(fragment);
}

function renderBranches() {
  elements['branch-count'].textContent = String(state.branches.length);
  elements['current-branch'].textContent = state.status.branch;
  const sync = [];
  if (state.status.ahead) sync.push(`↑ ${state.status.ahead}`);
  if (state.status.behind) sync.push(`↓ ${state.status.behind}`);
  elements['sync-state'].textContent = sync.join('  ') || 'Up to date';
  renderBranchList(elements['branch-list']);
  renderBranchList(elements['branch-list-compact']);
}

function selectFile(path) {
  state.selectedPath = path;
  renderFiles();
  showPanel('diff');
  void loadSelectedDiff(state.refreshToken);
}

function makeFileRow(file) {
  const row = document.createElement('div');
  row.className = `file-row${file.path === state.selectedPath ? ' selected' : ''}`;
  row.tabIndex = 0;
  row.setAttribute('role', 'button');
  row.addEventListener('click', () => selectFile(file.path));
  row.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectFile(file.path);
    }
  });

  const checkbox = document.createElement('input');
  checkbox.className = 'stage-toggle';
  checkbox.type = 'checkbox';
  checkbox.checked = file.staged;
  checkbox.title = file.staged ? `Unstage ${file.path}` : `Stage ${file.path}`;
  checkbox.setAttribute('aria-label', file.staged ? `Unstage ${file.path}` : `Stage ${file.path}`);
  checkbox.addEventListener('click', (event) => event.stopPropagation());
  checkbox.addEventListener('change', () => {
    checkbox.checked = file.staged;
    void updateFileStage(file);
  });

  const code = document.createElement('span');
  code.className = 'status-code';
  code.textContent = statusLabel(file);
  code.title = `Index: ${file.indexStatus || 'clean'}, worktree: ${file.worktreeStatus || 'clean'}`;

  const parts = fileParts(file.path);
  const copy = document.createElement('span');
  copy.className = 'file-copy';
  const name = document.createElement('span');
  name.className = 'file-name';
  name.textContent = parts.name;
  const path = document.createElement('span');
  path.className = 'file-path';
  path.textContent = file.originalPath
    ? `${file.originalPath} → ${file.path}`
    : parts.directory || (file.staged ? 'Staged' : 'Working tree');
  copy.append(name, path);
  row.append(checkbox, code, copy);
  return row;
}

function renderFiles() {
  const files = state.status.files;
  elements['file-count'].textContent = String(files.length);
  elements['file-list'].replaceChildren();

  if (files.length === 0) {
    elements['file-list'].append(emptyState('Working tree clean'));
  } else {
    const fragment = document.createDocumentFragment();
    for (const file of files) fragment.append(makeFileRow(file));
    elements['file-list'].append(fragment);
  }

  elements['commit-button'].disabled = state.operationLocked || !files.some((file) => file.staged);
}

function renderHistory() {
  elements['history-view'].replaceChildren();
  if (state.history.length === 0) {
    elements['history-view'].append(emptyState('No commits to show'));
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const commit of state.history) {
    const row = document.createElement('article');
    row.className = 'history-row';
    const hash = document.createElement('span');
    hash.className = 'history-hash';
    hash.textContent = commit.hash;
    const copy = document.createElement('span');
    copy.className = 'history-copy';
    const subject = document.createElement('span');
    subject.className = 'history-subject';
    subject.textContent = commit.subject;
    const author = document.createElement('span');
    author.className = 'history-author';
    author.textContent = commit.author;
    const date = document.createElement('time');
    date.className = 'history-date';
    date.dateTime = commit.date;
    date.textContent = commit.date;
    copy.append(subject, author);
    row.append(hash, copy, date);
    fragment.append(row);
  }
  elements['history-view'].append(fragment);
}

function showPanel(panel) {
  const history = panel === 'history';
  elements['history-view'].hidden = !history;
  elements['diff-view'].hidden = history;
  elements['diff-summary'].hidden = history;
  elements['history-tab'].classList.toggle('active', history);
  elements['diff-tab'].classList.toggle('active', !history);
  elements['history-tab'].setAttribute('aria-selected', String(history));
  elements['diff-tab'].setAttribute('aria-selected', String(!history));
}

function renderParsedDiff(source) {
  const files = parseUnifiedDiff(source);
  const summary = summarizeDiff(files);
  elements['diff-summary'].replaceChildren();

  for (const [text, className] of [
    [`${summary.files} file${summary.files === 1 ? '' : 's'}`, ''],
    [`+${summary.additions}`, 'additions'],
    [`−${summary.deletions}`, 'deletions'],
  ]) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    elements['diff-summary'].append(span);
  }

  elements['diff-view'].replaceChildren();
  if (files.length === 0) {
    elements['diff-view'].append(emptyState('No textual diff for this change'));
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const file of files) {
    const header = document.createElement('div');
    header.className = 'diff-file-header';
    header.textContent = file.newPath && file.newPath !== '/dev/null' ? file.newPath : file.oldPath || 'Changed file';
    fragment.append(header);

    for (const metadata of file.metadata.filter(Boolean)) {
      if (
        !metadata.startsWith('index ') &&
        !metadata.startsWith('new file mode ') &&
        !metadata.startsWith('deleted file mode ') &&
        !metadata.startsWith('similarity index ') &&
        !metadata.startsWith('rename ')
      ) {
        continue;
      }
      const line = document.createElement('div');
      line.className = 'diff-hunk-header';
      line.textContent = metadata;
      fragment.append(line);
    }

    for (const hunk of file.hunks) {
      const hunkHeader = document.createElement('div');
      hunkHeader.className = 'diff-hunk-header';
      hunkHeader.textContent = hunk.header;
      fragment.append(hunkHeader);

      for (const diffLine of hunk.lines) {
        const row = document.createElement('div');
        row.className = `diff-line ${diffLine.type}`;
        const oldNumber = document.createElement('span');
        oldNumber.className = 'line-number';
        oldNumber.textContent = diffLine.oldNumber ?? '';
        const newNumber = document.createElement('span');
        newNumber.className = 'line-number';
        newNumber.textContent = diffLine.newNumber ?? '';
        const content = document.createElement('span');
        content.className = 'line-content';
        const prefix = diffLine.type === 'addition' ? '+' : diffLine.type === 'deletion' ? '−' : ' ';
        content.textContent = `${prefix}${diffLine.content}`;
        row.append(oldNumber, newNumber, content);
        fragment.append(row);
      }
    }
  }
  elements['diff-view'].append(fragment);
}

async function loadSelectedDiff(refreshToken) {
  const file = state.status.files.find((entry) => entry.path === state.selectedPath);
  if (!file) {
    elements['diff-kicker'].textContent = 'Selected change';
    elements['diff-file'].textContent = 'Choose a file';
    elements['diff-summary'].replaceChildren();
    elements['diff-view'].replaceChildren(emptyState('Select a changed file to inspect its diff'));
    return;
  }

  elements['diff-file'].textContent = file.path;
  elements['diff-view'].replaceChildren(emptyState('Loading diff…'));

  try {
    const quotedPath = shellQuote(file.path);
    const requests = [];
    const labels = [];

    if (file.staged) {
      requests.push(runGit(`git diff --cached --no-color --unified=3 -- ${quotedPath}`));
      labels.push('Staged');
    }
    if (file.worktreeStatus !== ' ' || file.untracked) {
      requests.push(
        file.untracked
          ? runGit(`git diff --no-index --no-color --unified=3 -- /dev/null ${quotedPath}`, [0, 1])
          : runGit(`git diff --no-color --unified=3 -- ${quotedPath}`)
      );
      labels.push(file.untracked ? 'Untracked' : 'Working tree');
    }

    const diffs = await Promise.all(requests);
    if (refreshToken !== state.refreshToken || file.path !== state.selectedPath) return;
    elements['diff-kicker'].textContent = labels.join(' + ') || 'Selected change';
    renderParsedDiff(diffs.filter(Boolean).join('\n'));
  } catch (error) {
    if (refreshToken !== state.refreshToken) return;
    elements['diff-view'].replaceChildren(emptyState(error instanceof Error ? error.message : String(error)));
  }
}

async function refreshRepository(options = {}) {
  const token = ++state.refreshToken;
  setBusy(true);
  showNotice('Reading repository…', 'neutral');

  try {
    const context = options.context ?? (await bridge().context());
    if (token !== state.refreshToken) return;
    applyContext(context);

    const [statusOutput, branchOutput, logOutput] = await Promise.all([
      runGit(STATUS_COMMAND),
      runGit(BRANCH_COMMAND),
      runGit(LOG_COMMAND),
    ]);
    if (token !== state.refreshToken) return;

    state.status = parseStatus(statusOutput);
    state.branches = parseBranches(branchOutput);
    state.history = parseHistory(logOutput);

    if (!state.status.files.some((file) => file.path === state.selectedPath)) {
      state.selectedPath = state.status.files[0]?.path ?? null;
    }

    renderBranches();
    renderFiles();
    renderHistory();
    elements.workspace.hidden = false;
    hideNotice();
    await loadSelectedDiff(token);

    if (options.announce) {
      await bridge().ui.toast('Git repository refreshed.');
    }
  } catch (error) {
    if (token !== state.refreshToken) return;
    elements.workspace.hidden = true;
    showNotice(error instanceof Error ? error.message : String(error));
  } finally {
    if (token === state.refreshToken) setBusy(false);
  }
}

async function mutateRepository(action, successMessage) {
  setOperationLocked(true);
  hideNotice();
  try {
    await action();
    await refreshRepository();
    await bridge().ui.toast(successMessage);
  } catch (error) {
    showNotice(error instanceof Error ? error.message : String(error));
  } finally {
    setOperationLocked(false);
  }
}

async function updateFileStage(file) {
  const command = file.staged
    ? `git restore --staged -- ${shellQuote(file.path)}`
    : `git add -- ${shellQuote(file.path)}`;
  await mutateRepository(() => runGit(command), file.staged ? `Unstaged ${file.path}` : `Staged ${file.path}`);
}

async function commit(amend) {
  const message = elements['commit-message'].value.trim();
  if (!message) {
    showNotice('Enter a commit message first.');
    elements['commit-message'].focus();
    return;
  }

  const command = `git commit ${amend ? '--amend ' : ''}-m ${shellQuote(message)}`;
  await mutateRepository(
    async () => {
      await runGit(command);
      elements['commit-message'].value = '';
    },
    amend ? 'Commit amended.' : 'Changes committed.'
  );
}

async function switchBranch(name) {
  await mutateRepository(() => runGit(`git switch -- ${shellQuote(name)}`), `Switched to ${name}.`);
}

async function createBranch(form) {
  const input = form.elements.namedItem('branch');
  const name = input.value.trim();
  if (!name) {
    showNotice('Enter a branch name first.');
    input.focus();
    return;
  }

  await mutateRepository(async () => {
    await runGit(`git switch -c ${shellQuote(name)}`);
    input.value = '';
  }, `Created and switched to ${name}.`);
}

elements['refresh-button'].addEventListener('click', () => refreshRepository({ announce: true }));
elements['commit-form'].addEventListener('submit', (event) => {
  event.preventDefault();
  void commit(false);
});
elements['amend-button'].addEventListener('click', () => void commit(true));
elements['branch-form'].addEventListener('submit', (event) => {
  event.preventDefault();
  void createBranch(event.currentTarget);
});
elements['branch-form-compact'].addEventListener('submit', (event) => {
  event.preventDefault();
  void createBranch(event.currentTarget);
});
elements['diff-tab'].addEventListener('click', () => showPanel('diff'));
elements['history-tab'].addEventListener('click', () => showPanel('history'));
window.addEventListener('focus', () => void refreshRepository());

let unsubscribeContext = () => {};
try {
  unsubscribeContext = bridge().onContextChange((context) => {
    void refreshRepository({ context });
  });
  void refreshRepository();
} catch (error) {
  showNotice(error instanceof Error ? error.message : String(error));
}

window.addEventListener('beforeunload', () => unsubscribeContext(), { once: true });
