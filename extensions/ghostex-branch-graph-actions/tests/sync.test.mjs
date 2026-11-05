import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const helper = readFileSync(new URL('../src/repository.mjs', import.meta.url), 'utf8');
const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
function invoke(cwd, input = {}) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', helper,
    Buffer.from(JSON.stringify(input)).toString('base64')], { cwd, env, encoding: 'utf8' });
  assert.equal(result.signal, null);
  return JSON.parse(result.stdout);
}
const expected = data => ({ branch: data.branch, head: data.head,
  ...Object.fromEntries(['upstreamRef','remote','remoteRef'].map(key => [key, data.sync[key]])) });
const action = (cwd, name, data = invoke(cwd)) => invoke(cwd, { action: name, expected: expected(data) });
function commit(cwd, file, text) {
  writeFileSync(join(cwd, file), text); git(cwd, 'add', file); git(cwd, 'commit', '-m', text);
}

test('remote sync discovers another clone, fast-forwards, pushes one ref and refuses unsafe pulls', () => {
  const root = mkdtempSync(join(tmpdir(), "branch-graph-sync-ä'-$-"));
  const bare = join(root, 'remote.git'), alice = join(root, 'alice'), bob = join(root, 'bob');
  try {
    git(root, 'init', '--bare', '--initial-branch=main', bare);
    for (const cwd of [alice, bob]) {
      git(root, 'clone', bare, cwd);
      git(cwd, 'config', 'user.name', 'Git test'); git(cwd, 'config', 'user.email', 'test@example.test');
      git(cwd, 'config', 'commit.gpgsign', 'false');
    }
    commit(alice, 'base.txt', 'Initial commit'); git(alice, 'push', '-u', 'origin', 'main');
    git(bob, 'pull', '--ff-only');
    assert.equal(invoke(alice).sync.behind, 0);
    commit(bob, 'from-bob.txt', 'Pushed elsewhere'); git(bob, 'push');
    const originalHead = git(alice, 'rev-parse', 'HEAD');
    assert.equal(invoke(alice).sync.behind, 0, 'cached refs do not claim to know new pushes');
    assert.equal(action(alice, 'fetch').kind, 'success');
    const behind = invoke(alice);
    assert.equal(behind.sync.behind, 1); assert.equal(behind.sync.ahead, 0);
    assert.equal(git(alice, 'rev-parse', 'HEAD'), originalHead);
    assert.equal(existsSync(join(alice, 'from-bob.txt')), false, 'fetch leaves the working tree alone');
    assert.ok(behind.sync.lastFetch > 0);
    // Even an autostash/rebase-oriented user config must not change pull behavior.
    git(alice, 'config', 'pull.rebase', 'true'); git(alice, 'config', 'merge.autoStash', 'true');
    assert.equal(action(alice, 'pull', behind).kind, 'success');
    assert.equal(git(alice, 'rev-parse', 'HEAD'), git(bob, 'rev-parse', 'HEAD'));
    commit(alice, 'from-alice.txt', 'Local work');
    git(alice, 'branch', 'never-push-this'); git(alice, 'tag', 'never-push-tag');
    git(alice, 'config', 'push.default', 'matching');
    git(alice, 'config', 'push.followTags', 'true');
    git(alice, 'config', 'remote.origin.push', '+refs/heads/*:refs/heads/*');
    assert.equal(invoke(alice).sync.ahead, 1);
    assert.equal(action(alice, 'push').kind, 'success');
    assert.equal(git(bare, 'rev-parse', 'refs/heads/main'), git(alice, 'rev-parse', 'HEAD'));
    assert.equal(git(bare, 'for-each-ref', '--format=%(refname)'), 'refs/heads/main');
    git(bob, 'pull', '--ff-only');
    commit(alice, 'alice-diverged.txt', 'Alice diverged');
    commit(bob, 'bob-diverged.txt', 'Bob diverged'); git(bob, 'push');
    action(alice, 'fetch');
    const diverged = invoke(alice);
    assert.equal(diverged.sync.ahead, 1); assert.equal(diverged.sync.behind, 1);
    const before = git(alice, 'rev-parse', 'HEAD');
    assert.equal(action(alice, 'pull', diverged).kind, 'error');
    assert.equal(git(alice, 'rev-parse', 'HEAD'), before, 'diverged pull cannot merge/rebase');
    assert.equal(action(alice, 'push', diverged).kind, 'error', 'non-fast-forward push cannot force');
    writeFileSync(join(alice, 'untracked.txt'), 'Keep this');
    assert.match(action(alice, 'pull').message, /Commit or stash/);
    assert.equal(readFileSync(join(alice, 'untracked.txt'), 'utf8'), 'Keep this');
    rmSync(join(alice, 'untracked.txt'));
    const stale = invoke(alice);
    git(alice, 'switch', '-c', 'another-branch');
    assert.match(action(alice, 'push', stale).message, /branch or its upstream changed/);
    git(alice, 'switch', 'main');
    const lock = join(alice, '.git', 'ghostex-branch-graph.lock');
    mkdirSync(lock); writeFileSync(join(lock, 'owner.json'), JSON.stringify({ pid: process.pid }));
    assert.match(action(alice, 'fetch').message, /Another Branch Graph Git action/);
    assert.ok(existsSync(lock), 'does not remove another operation’s lock');
    const worktree = join(root, 'worktree'); git(alice, 'worktree', 'add', '-b', 'linked', worktree);
    assert.match(action(worktree, 'fetch').message, /Another Branch Graph Git action/, 'linked worktrees share the lock');
    rmSync(lock, { recursive: true });
    assert.equal(action(alice, 'fetch').kind, 'success');
    assert.equal(existsSync(lock), false, 'releases its own lock after success and failure');
    git(alice, 'checkout', '--detach');
    assert.match(action(alice, 'push').message, /Check out a branch/);
    assert.equal(action(alice, 'fetch').kind, 'success');
    assert.equal(invoke(alice, { action: 'delete-everything' }).kind, 'error');
    git(alice, 'checkout', 'main'); git(alice, 'reset', '--hard', 'origin/main');
    git(bare, 'update-ref', '-d', 'refs/heads/main');
    const cached = invoke(alice);
    assert.equal(cached.sync.behind, 0);
    assert.match(action(alice, 'pull', cached).message, /couldn't find remote ref/i, 'deleted upstream cannot report a successful stale pull');
    assert.equal(git(alice, 'rev-parse', 'HEAD'), cached.head);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
