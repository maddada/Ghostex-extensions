// Shared by the graph and the native titlebar popup. Every action captures the
// project + branch it was clicked on; a later context change cannot retarget it.
import { readRepository } from './bridge.mjs';

const labels = { fetch: 'Fetch', pull: 'Pull', push: 'Push' };
const running = { fetch: 'Fetching remotes…', pull: 'Pulling upstream…', push: 'Pushing branch…' };
export class RemoteControls {
  constructor(root, afterOperation) {
    this.root = root;
    this.afterOperation = afterOperation;
    this.path = '';
    this.data = null;
    this.pending = new Set();
    this.attempts = new Map();
    this.message = '';
    this.error = false;
    root.querySelectorAll('[data-git-action]').forEach(button => {
      button.addEventListener('click', () => void this.run(button.dataset.gitAction));
    });
  }
  update(data, path) {
    if (path !== this.path) { this.message = ''; this.error = false; }
    this.path = path;
    this.data = data;
    this.render();
  }
  render() {
    const sync = this.data?.sync;
    const busy = this.pending.has(this.path);
    const status = this.root.querySelector('[data-sync-status]');
    const target = this.root.querySelector('[data-sync-target]');
    const fetched = this.root.querySelector('[data-sync-fetched]');
    const result = this.root.querySelector('[data-sync-result]');
    if (target) {
      target.textContent = sync ? `${this.data.branch || 'Detached HEAD'}${sync.upstream ? ` → ${sync.upstream}` : ''}` : 'No repository';
      target.title = target.textContent;
    }
    const counts = sync?.ahead !== null && sync?.ahead !== undefined;
    status.textContent = !sync ? 'Open a Git project' : !sync.remotes.length ? 'No remote'
      : !this.data.head ? 'No commits yet' : !this.data.branch ? 'Detached HEAD'
      : !sync.upstreamRef ? 'No upstream' : !counts ? 'Upstream unavailable'
      : sync.ahead || sync.behind ? `↑ ${sync.ahead} ahead · ↓ ${sync.behind} behind` : 'Up to date';
    status.dataset.changed = String(!!(sync?.ahead || sync?.behind));
    status.title = sync?.lastFetch ? `Remote refs last fetched ${new Date(sync.lastFetch).toLocaleString()}. Local changes: ${sync.dirty ? 'yes' : 'no'}.`
      : 'Remote refs have not been fetched here yet.';
    if (fetched) {
      const minutes = Math.max(0, Math.floor((Date.now() - (sync?.lastFetch || 0)) / 60000));
      fetched.textContent = !sync?.remotes.length ? '' : !sync.lastFetch ? 'Not fetched yet'
        : `Fetched ${minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`}`;
      fetched.title = status.title;
    }
    for (const button of this.root.querySelectorAll('[data-git-action]')) {
      const action = button.dataset.gitAction;
      const reason = busy ? 'A Git action is running.' : !sync?.remotes.length ? 'Add a remote in Git first.'
        : action === 'fetch' ? '' : !this.data.branch || !this.data.head ? 'Check out a branch with a commit first.'
        : !sync.upstreamRef || !sync.remote || sync.remote === '.' ? 'Set a remote upstream for this branch first.'
        : sync.busy ? 'Finish the current Git operation first.'
        : action === 'pull' && sync.dirty ? 'Commit or stash local changes before pulling.' : '';
      button.disabled = !!reason;
      button.title = reason || (action === 'fetch' ? 'Update all remote refs without changing your files.'
        : action === 'pull' ? `Fast-forward ${this.data.branch} from ${sync.upstream}.`
        : `Push only ${this.data.branch} to ${sync.upstream}.`);
    }
    result.textContent = this.message;
    result.hidden = !this.message;
    result.classList.toggle('error', this.error);
    this.root.setAttribute('aria-busy', String(busy));
  }
  async run(action, automatic = false) {
    if (!labels[action] || !this.path || !this.data?.sync || this.pending.has(this.path)) return;
    if (this.root.querySelector(`[data-git-action="${action}"]`).disabled) return;
    const path = this.path;
    const data = this.data;
    const expected = { branch: data.branch, head: data.head,
      ...Object.fromEntries(['upstreamRef', 'remote', 'remoteRef'].map(key => [key, data.sync[key]])) };
    this.pending.add(path);
    this.attempts.set(path, Date.now());
    this.message = running[action]; this.error = false; this.render();
    try {
      await readRepository({ action, expected }, path);
      if (this.path === path) this.message = `${labels[action]} complete${automatic ? ' · automatic' : ''}.`;
    } catch (error) {
      if (this.path === path) { this.message = `${labels[action]} failed. ${error.message || error}`; this.error = true; }
    } finally {
      this.pending.delete(path);
      if (this.path === path) { this.render(); await this.afterOperation(); }
    }
  }
  maybeFetch(enabled) {
    if (!enabled || document.hidden || !this.data?.sync?.remotes.length || this.pending.has(this.path)) return;
    const last = Math.max(this.data.sync.lastFetch || 0, this.attempts.get(this.path) || 0);
    if (Date.now() - last >= 60000) void this.run('fetch', true);
  }
}
