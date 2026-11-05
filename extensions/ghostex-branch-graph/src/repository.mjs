// Executed through the official exec bridge. Network writes are limited to the
// explicit fetch/pull/push allowlist; history reads never contact a remote.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
const run = promisify(execFile);
const input = JSON.parse(Buffer.from(process.argv[1], 'base64').toString('utf8'));
// Some host versions decode each stdout chunk separately. ASCII JSON avoids
// corrupting a multi-byte author/subject character split across chunk boundaries.
const serialize = value => JSON.stringify(value).replace(/[\u007f-\uffff]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
const options = {
  cwd: process.cwd(), timeout: 15000, maxBuffer: 3 * 1024 * 1024,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_PAGER: 'cat' },
};
const git = async (...args) => (await run('git', ['--no-pager', '-c', 'color.ui=false', ...args], options)).stdout;
const networkGit = async (...args) => (await run('git', ['--no-pager', '-c', 'color.ui=false', ...args], {
  ...options, timeout: 45000,
  env: { ...options.env, GIT_ASKPASS: '/bin/false', SSH_ASKPASS: '/bin/false',
    GCM_INTERACTIVE: 'never', GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || 'ssh -o BatchMode=yes -o ConnectTimeout=15' },
})).stdout;
const hashPattern = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const themeKeys = [
  'sidebarTheme', 'darkThemePreset', 'lightThemePreset', 'themeContrast',
  'themeSidebarContrast', 'themeWorkAreaContrast',
  'customSidebarTitlebarBackgroundDarknessPercent', 'customSidebarTitlebarBackgroundTintColor',
  'customSidebarTitlebarLightBackgroundLightnessPercent', 'customSidebarTitlebarLightBackgroundTintColor',
  'windowGlass', 'windowGlassWorkAreaTintDark', 'windowGlassWorkAreaTintLight',
];
async function themeSettings() {
  try {
    const file = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'ghostex', 'native-sidebar-settings.json');
    const saved = JSON.parse(await readFile(file, 'utf8'));
    return Object.fromEntries(themeKeys.filter(key => key in saved).map(key => [key, saved[key]]));
  } catch { return {}; }
}
async function syncStatus(branch, head) {
  const [remotesText, trackingText, changes, gitDir] = await Promise.all([
    git('remote'),
    branch ? git('for-each-ref', '--format=%(upstream)%09%(upstream:short)%09%(upstream:remotename)%09%(upstream:remoteref)', `refs/heads/${branch}`) : '',
    git('status', '--porcelain=v1', '-z', '--untracked-files=normal'),
    git('rev-parse', '--absolute-git-dir').then(s => s.trim()),
  ]);
  const remotes = remotesText.trim().split('\n').filter(Boolean);
  const [upstreamRef = '', upstream = '', remote = '', remoteRef = ''] = trackingText.trimEnd().split('\t');
  let ahead = null, behind = null;
  if (head && upstreamRef) {
    const counts = await git('rev-list', '--left-right', '--count', `HEAD...${upstreamRef}`, '--').catch(() => '');
    if (counts.trim()) [ahead, behind] = counts.trim().split(/\s+/).map(Number);
  }
  let lastFetch = null;
  try { lastFetch = (await stat(join(gitDir, 'FETCH_HEAD'))).mtimeMs; } catch {}
  const busy = (await Promise.all(['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'BISECT_LOG'].map(async name => {
    try { await stat(join(gitDir, name)); return true; } catch { return false; }
  }))).some(Boolean);
  return { remotes, remote, remoteRef, upstreamRef, upstream, ahead, behind, dirty: !!changes, busy, lastFetch };
}
async function snapshot() {
  const [branch, head] = await Promise.all([
    git('symbolic-ref', '--quiet', '--short', 'HEAD').then(s => s.trim(), () => ''),
    git('rev-parse', '--verify', 'HEAD').then(s => s.trim(), () => ''),
  ]);
  return { branch, head, sync: await syncStatus(branch, head) };
}
function verifyExpected(current) {
  const expected = input.expected;
  if (!expected || !['branch', 'head', 'upstreamRef', 'remote', 'remoteRef'].every(key =>
    expected[key] === (key in current ? current[key] : current.sync[key]))) {
    throw new Error('The branch or its upstream changed. Refresh and try again.');
  }
}
async function operation() {
  const commonDir = (await git('rev-parse', '--path-format=absolute', '--git-common-dir')).trim();
  const lock = join(commonDir, 'ghostex-branch-graph.lock');
  // One operation across graph + popup and all linked worktrees. Never remove
  // another process's active lock, including one left behind by a stopped app.
  try { await mkdir(lock, { mode: 0o700 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let owner;
    try { owner = JSON.parse(await readFile(join(lock, 'owner.json'), 'utf8')); } catch {}
    let alive = true;
    if (Number.isInteger(owner?.pid) && owner.pid > 0) {
      try { process.kill(owner.pid, 0); } catch (e) { if (e.code === 'ESRCH') alive = false; }
    } else {
      alive = Date.now() - (await stat(lock)).mtimeMs < 120000;
    }
    if (alive) throw new Error('Another Branch Graph Git action is still running. Try again shortly.');
    await rm(lock, { recursive: true });
    await mkdir(lock, { mode: 0o700 });
  }
  try {
    await writeFile(join(lock, 'owner.json'), JSON.stringify({ pid: process.pid }));
    let current = await snapshot();
    const { sync } = current;
    if (input.action === 'fetch') {
      if (!sync.remotes.length) throw new Error('This repository has no remote.');
      await networkGit('fetch', '--all', '--no-recurse-submodules');
    } else {
      verifyExpected(current);
      if (!current.branch || !current.head) throw new Error('Check out a branch with a commit first.');
      if (!sync.upstreamRef || !sync.remote || sync.remote === '.' || !sync.remotes.includes(sync.remote) || !sync.remoteRef.startsWith('refs/heads/')) {
        throw new Error('Set a remote upstream for this branch in Git first.');
      }
      if (sync.busy) throw new Error('Finish the current merge, rebase or other Git operation first.');
      if (input.action === 'pull') {
        if (sync.dirty) throw new Error('Commit or stash your local changes before pulling.');
        // Name the remote branch explicitly: a deleted upstream must fail,
        // rather than merging its stale cached tracking ref after a broad fetch.
        await networkGit('fetch', '--no-recurse-submodules', '--', sync.remote, sync.remoteRef);
        current = await snapshot();
        verifyExpected(current);
        if (current.sync.dirty || current.sync.busy) throw new Error('The working tree changed while fetching. Refresh and try again.');
        // An explicit merge avoids pull.rebase/autostash settings and updates
        // only the already-configured upstream through a fast-forward.
        await git('-c', 'merge.autoStash=false', 'merge', '--ff-only', '--no-edit', current.sync.upstreamRef);
      } else {
        // Full source/destination refs ignore push.default, remote push refspecs,
        // push.autoSetupRemote and push.followTags. Never force or push other refs.
        await networkGit('-c', 'push.followTags=false', 'push', '--no-follow-tags', '--', sync.remote, `${current.head}:${sync.remoteRef}`);
      }
    }
    return { kind: 'success', action: input.action, ...(await snapshot()) };
  } finally { await rm(lock, { recursive: true, force: true }); }
}
async function graph() {
  const theme = await themeSettings();
  let root;
  try { root = (await git('rev-parse', '--show-toplevel')).trim(); }
  catch (error) {
    if (error.code === 'ENOENT') return { kind: 'missing-git', theme };
    if (/not a git repository/i.test(error.stderr || '')) return { kind: 'not-repository', theme };
    throw error;
  }
  const [branch, head, refsText, shallow] = await Promise.all([
    git('symbolic-ref', '--quiet', '--short', 'HEAD').then(s => s.trim(), () => ''),
    git('rev-parse', '--verify', 'HEAD').then(s => s.trim(), () => ''),
    git('for-each-ref', '--format=%(objectname)%09%(refname)%09%(*objectname)', 'refs/heads', 'refs/remotes', 'refs/tags'),
    git('rev-parse', '--is-shallow-repository').then(s => s.trim() === 'true', () => false),
  ]);
  const refs = refsText.trim().split('\n').filter(Boolean).map(line => {
    const [hash, fullName, peeled] = line.split('\t');
    const type = fullName.startsWith('refs/heads/') ? 'branch' : fullName.startsWith('refs/remotes/') ? 'remote' : 'tag';
    return { hash: peeled || hash, name: fullName.replace(/^refs\/(heads|remotes|tags)\//, ''), type };
  }).filter(ref => !ref.name.endsWith('/HEAD'));
  const sync = await syncStatus(branch, head);
  if (!head) return { kind: 'empty', root, branch, head, refs, commits: [], theme, shallow, sync };
  const limit = Math.min(5000, Math.max(100, Number(input.limit) || 250));
  const revisions = input.scope === 'all' ? ['--all', 'HEAD'] : ['HEAD'];
  // Fields end in NUL; Git metadata is never interpreted as HTML or shell source.
  const log = await git('log', '--topo-order', '--no-show-signature', `--max-count=${limit + 1}`,
    '--format=%H%x00%P%x00%an%x00%aI%x00%s%x00', ...revisions, '--');
  const fields = log.split('\0');
  const commits = [];
  for (let i = 0; i + 4 < fields.length; i += 5) {
    const hash = fields[i].trim();
    if (!hashPattern.test(hash)) continue;
    commits.push({ hash, parents: fields[i + 1].split(' ').filter(Boolean), author: fields[i + 2], date: fields[i + 3], subject: fields[i + 4] });
  }
  return { kind: 'ready', root, branch, head, refs, commits: commits.slice(0, limit), hasMore: commits.length > limit, shallow, theme, sync };
}
async function details() {
  if (!hashPattern.test(input.hash || '')) throw new Error('Invalid commit id.');
  const text = await git('show', '--no-patch', '--no-show-signature', '--format=%H%x00%an%x00%ae%x00%aI%x00%B', input.hash, '--');
  const [hash, author, email, date, ...message] = text.split('\0');
  const filesText = await git('diff-tree', '--root', '--no-commit-id', '--no-renames', '--name-status', '-r', '-m', '-z', input.hash, '--');
  const parts = filesText.split('\0');
  const seen = new Set();
  const files = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const status = parts[i], path = parts[i + 1];
    if (!path || seen.has(path)) continue;
    seen.add(path); files.push({ status, path });
  }
  return { hash, author, email, date, message: message.join('\0').trimEnd(), files };
}
try {
  if (input.action && !['graph', 'status', 'details', 'fetch', 'pull', 'push'].includes(input.action)) throw new Error('Unsupported Git action.');
  const result = input.action === 'details' ? await details() : input.action === 'status'
    ? { kind: 'ready', ...(await snapshot()), theme: await themeSettings() }
    : ['fetch', 'pull', 'push'].includes(input.action) ? await operation() : await graph();
  process.stdout.write(serialize(result));
} catch (error) {
  process.stdout.write(serialize({ kind: 'error', message: (error.stderr || error.message || 'Could not read Git history.').slice(0, 1500) }));
  process.exitCode = 1;
}
