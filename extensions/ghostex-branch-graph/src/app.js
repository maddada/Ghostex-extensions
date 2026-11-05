import { readRepository as executeRepository } from './bridge.mjs';
import { RemoteControls } from './remote.mjs';
import { layoutGraph, edgePath, ROW_HEIGHT, LANE_WIDTH } from './graph.mjs';
import { applyTheme } from './theme.mjs';

const $ = id => document.getElementById(id);
const svgNS = 'http://www.w3.org/2000/svg';
const state = {
  context: null, path: '', data: null, layout: { rows: [], width: 36 },
  refs: new Map(), selected: '', selectedDetails: null, scope: 'current', limit: 250,
  generation: 0, detailsGeneration: 0, inFlight: null, preferences: { autoRefresh: true, autoFetch: true, transparent: true },
  matches: [], query: '', renderFrame: 0, fingerprint: '',
  detailsHeight: 245, resizeDrag: null,
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function svgElement(tag, attributes) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}
const readRepository = (input, path = state.path) => executeRepository(input, path);
const remote = new RemoteControls($('remote-controls'), () => { state.generation++; return refresh(); });
function showEmpty(title, message, retry = false) {
  $('empty-title').textContent = title;
  $('empty-description').textContent = message;
  $('empty').hidden = false;
  $('timeline').hidden = true;
  $('load-area').hidden = true;
  $('retry').hidden = !retry;
}
function notice(message = '') {
  $('notice').textContent = message;
  $('notice').hidden = !message;
  applyDetailsHeight();
}
function errorMessage(error) {
  if (error?.code === 'permissionDenied') return 'Enable command access for Branch Graph in Ghostex’s extension settings to read local Git history.';
  return error instanceof Error ? error.message : String(error);
}
function updatePreferenceControls() {
  $('auto-refresh').checked = state.preferences.autoRefresh;
  $('auto-fetch').checked = state.preferences.autoFetch;
  $('transparent').checked = state.preferences.transparent;
}
async function updatePreferences() {
  const fresh = await window.ghostex.settings.get();
  state.preferences = { autoRefresh: fresh.autoRefresh !== false, autoFetch: fresh.autoFetch !== false, transparent: fresh.transparent !== false };
  updatePreferenceControls();
}
function updateContext(context) {
  const previous = state.context;
  state.context = context;
  // Ghostex reports worktrees as their own active projects. The active session's
  // projectPath is more specific when the host supplies one for a session.
  const path = context?.activeSession?.projectPath || context?.project?.path || '';
  if (path === state.path && previous) return;
  state.path = path;
  state.generation++;
  state.fingerprint = '';
  state.data = null;
  remote.update(null, path);
  state.layout = { rows: [], width: 36 };
  state.selected = '';
  state.limit = 250;
  closeDetails();
  $('refresh').classList.remove('busy');
  $('timeline').replaceChildren();
  $('viewport').scrollTop = 0;
  $('current-scope').textContent = 'Current branch';
  $('project').textContent = context?.project?.name || 'No project';
  $('project').title = path;
  notice();
  showEmpty(path ? 'Reading branch history' : 'Open a local project', path ? 'Following your current branch…' : 'Choose a Git project in Ghostex to see its commit graph.');
  void refresh();
}
async function refresh() {
  if (!state.path || document.hidden) return;
  const generation = state.generation;
  if (state.inFlight === generation) return;
  state.inFlight = generation;
  $('refresh').classList.add('busy');
  try {
    const data = await readRepository({ scope: state.scope, limit: state.limit });
    if (generation !== state.generation) return;
    applyTheme(data.theme, state.preferences.transparent);
    state.data = data;
    remote.update(data, state.path);
    remote.maybeFetch(state.preferences.autoFetch);
    $('current-scope').textContent = data.branch || (data.head ? 'Detached HEAD' : 'Current branch');
    $('scope').title = data.branch ? `Current branch: ${data.branch}. Choose current or all branch history.` : 'Choose which history to show';
    $('project').textContent = state.context?.project?.name || data.root?.split('/').pop() || 'Repository';
    $('project').title = data.root || state.path;
    $('summary').textContent = 'Local history';
    if (data.kind === 'not-repository') {
      state.fingerprint = '';
      closeDetails();
      showEmpty('No Git repository', 'This project is not inside a Git repository. Choose another project in Ghostex.');
      notice(); return;
    }
    if (data.kind === 'missing-git') {
      showEmpty('Git is unavailable', 'Install Git on this computer, then refresh the graph.', true); return;
    }
    if (data.kind === 'empty') {
      state.fingerprint = '';
      closeDetails();
      showEmpty('No commits yet', `The ${data.branch || 'current'} branch has no commits. History will appear after the first commit.`);
      notice(); return;
    }
    notice(data.shallow ? 'Shallow clone — only history already on this computer is shown.' : '');
    const fingerprint = JSON.stringify([data.head, data.branch, data.refs, data.commits]);
    if (fingerprint !== state.fingerprint) {
      state.fingerprint = fingerprint;
      state.layout = layoutGraph(data.commits);
      state.refs = new Map();
      for (const ref of data.refs) {
        const items = state.refs.get(ref.hash) || [];
        items.push(ref); state.refs.set(ref.hash, items);
      }
      if (state.selected && !data.commits.some(commit => commit.hash === state.selected)) closeDetails();
      $('timeline').style.height = `${state.layout.rows.length * ROW_HEIGHT}px`;
      $('timeline').style.setProperty('--graph-width', `${state.layout.width}px`);
      updateSearch(false);
    }
    $('empty').hidden = true;
    $('timeline').hidden = false;
    $('load-area').hidden = !data.hasMore;
    $('load-more').textContent = state.limit >= 5000 ? 'Showing the newest 5,000 commits' : 'Load older commits';
    $('load-more').disabled = state.limit >= 5000;
    $('summary').textContent = `${data.commits.length}${data.hasMore ? '+' : ''} commits`;
    scheduleRender();
  } catch (error) {
    if (generation !== state.generation) return;
    if (state.data?.kind === 'ready') notice(`Refresh failed. ${errorMessage(error)}`);
    else showEmpty('Could not load graph', errorMessage(error), true);
  } finally {
    if (state.inFlight === generation) state.inFlight = null;
    if (generation === state.generation) $('refresh').classList.remove('busy');
  }
}
function scheduleRender() {
  if (!state.renderFrame) state.renderFrame = requestAnimationFrame(() => { state.renderFrame = 0; renderRows(); });
}
function renderRows() {
  const rows = state.layout.rows;
  const viewport = $('viewport');
  const start = Math.max(0, Math.floor(viewport.scrollTop / ROW_HEIGHT) - 8);
  const end = Math.min(rows.length, Math.ceil((viewport.scrollTop + viewport.clientHeight) / ROW_HEIGHT) + 9);
  const fragment = document.createDocumentFragment();
  for (let index = start; index < end; index++) {
    const row = rows[index], commit = row.commit, isHead = commit.hash === state.data?.head;
    const selected = state.selected === commit.hash;
    const match = !state.query || matchesQuery(commit);
    const node = element('div', `commit${isHead ? ' head' : ''}${selected ? ' selected' : ''}${state.query ? match ? ' match' : ' dim' : ''}`);
    node.style.top = `${index * ROW_HEIGHT}px`;
    node.dataset.hash = commit.hash;
    node.id = `commit-${commit.hash}`;
    node.setAttribute('role', 'option');
    node.setAttribute('aria-selected', String(selected));
    node.setAttribute('aria-label', `${isHead ? 'HEAD. ' : ''}${commit.subject}. ${commit.author}. ${commit.hash.slice(0, 8)}`);
    const svg = svgElement('svg', { class: 'graph', width: state.layout.width, height: ROW_HEIGHT, 'aria-hidden': true });
    for (const edge of row.edges) svg.append(svgElement('path', { d: edgePath(edge), stroke: edge.color }));
    const x = 13 + row.column * LANE_WIDTH;
    svg.append(svgElement('circle', { class: 'node-halo', cx: x, cy: 14, r: 8, fill: row.color, stroke: 'none' }));
    if (isHead) svg.append(svgElement('circle', { class: 'node-ring', cx: x, cy: 14, r: 6, fill: 'none', stroke: row.color, 'stroke-width': 1.1 }));
    svg.append(svgElement('circle', { class: 'commit-node', cx: x, cy: 14, r: 3.2, fill: row.color, stroke: 'none' }));
    if (commit.parents.length > 1) svg.append(svgElement('circle', { cx: x, cy: 14, r: 1.6, fill: 'var(--panel)', stroke: 'none' }));
    node.append(svg);
    const refs = [...(state.refs.get(commit.hash) || [])].sort((a, b) => Number(b.type === 'branch' && b.name === state.data.branch) - Number(a.type === 'branch' && a.name === state.data.branch));
    if (isHead || refs.length) {
      const labels = element('span', 'refs');
      if (isHead && !refs.some(ref => ref.type === 'branch' && ref.name === state.data.branch)) labels.append(element('span', 'ref current', 'HEAD'));
      for (const ref of refs.slice(0, 3)) {
        const label = element('span', `ref ${ref.type}${ref.type === 'branch' && ref.name === state.data.branch ? ' current' : ''}`);
        const current = isHead && ref.type === 'branch' && ref.name === state.data.branch;
        label.append(element('span', '', current ? `HEAD · ${ref.name}` : `${ref.type === 'tag' ? '◇ ' : ref.type === 'remote' ? '☁ ' : '⑂ '}${ref.name}`));
        label.title = current ? `Current branch ${ref.name} points to this commit` : `${ref.type}: ${ref.name}`;
        labels.append(label);
      }
      if (refs.length > 3) labels.append(element('span', 'ref', `+${refs.length - 3}`));
      node.append(labels);
    }
    const copy = element('span', 'commit-copy');
    copy.append(element('span', 'subject', commit.subject), element('span', 'author', commit.author));
    node.append(copy);
    node.title = `${commit.subject}\n${commit.author} · ${new Date(commit.date).toLocaleString()}\n${commit.hash}`;
    fragment.append(node);
  }
  $('timeline').replaceChildren(fragment);
}
function matchesQuery(commit) {
  const refs = state.refs.get(commit.hash) || [];
  return [commit.subject, commit.author, commit.hash, ...refs.map(ref => ref.name)].join('\n').toLocaleLowerCase().includes(state.query);
}
function updateSearch(jump = true) {
  state.query = $('search').value.trim().toLocaleLowerCase();
  state.matches = state.query ? state.layout.rows.flatMap((row, index) => matchesQuery(row.commit) ? [index] : []) : [];
  $('search-count').textContent = state.query ? `${state.matches.length} found` : '';
  for (const id of ['previous-match', 'next-match']) $(id).hidden = !state.matches.length;
  if (jump && state.matches.length) scrollToRow(state.matches[0]);
  scheduleRender();
}
function scrollToRow(index) {
  const viewport = $('viewport'), top = index * ROW_HEIGHT;
  if (top < viewport.scrollTop || top + ROW_HEIGHT > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = Math.max(0, top - viewport.clientHeight / 3);
  scheduleRender();
}
function nextMatch(direction) {
  if (!state.matches.length) return;
  const selected = state.layout.rows.findIndex(row => row.commit.hash === state.selected);
  const visible = Math.floor($('viewport').scrollTop / ROW_HEIGHT);
  const from = selected >= 0 ? selected : visible;
  const list = direction > 0 ? state.matches : [...state.matches].reverse();
  const index = list.find(index => direction > 0 ? index > from : index < from) ?? list[0];
  scrollToRow(index);
  void selectCommit(state.layout.rows[index].commit.hash);
}
async function selectCommit(hash) {
  state.selected = hash;
  state.selectedDetails = null;
  const token = ++state.detailsGeneration;
  $('details').hidden = false;
  $('details-resizer').hidden = false;
  applyDetailsHeight();
  $('detail-hash').textContent = hash.slice(0, 8);
  $('copy-hash').textContent = 'Copy hash';
  $('detail-subject').textContent = 'Loading commit…';
  for (const id of ['detail-meta', 'detail-body', 'file-heading']) $(id).textContent = '';
  $('detail-files').replaceChildren();
  scheduleRender();
  try {
    const detail = await readRepository({ action: 'details', hash });
    if (token !== state.detailsGeneration) return;
    state.selectedDetails = detail;
    const [subject, ...body] = detail.message.split('\n');
    $('detail-subject').textContent = subject;
    $('detail-meta').textContent = `${detail.author} <${detail.email}>\n${new Date(detail.date).toLocaleString()}`;
    $('detail-body').textContent = body.join('\n').trim();
    $('detail-body').hidden = !$('detail-body').textContent;
    $('file-heading').textContent = `${detail.files.length} changed file${detail.files.length === 1 ? '' : 's'}${state.layout.rows.find(row => row.commit.hash === hash)?.commit.parents.length > 1 ? ' · compared with merge parents' : ''}`;
    const files = detail.files.map(file => {
      const node = element('li');
      node.append(element('span', `file-status${file.status === 'D' ? ' deleted' : ''}`, file.status), element('span', 'file-path', file.path));
      node.title = file.path;
      return node;
    });
    $('detail-files').replaceChildren(...files);
  } catch (error) {
    if (token === state.detailsGeneration) $('detail-subject').textContent = errorMessage(error);
  }
}
function closeDetails() {
  finishDetailsResize();
  state.detailsGeneration++;
  state.selected = '';
  state.selectedDetails = null;
  $('details').hidden = true;
  $('details-resizer').hidden = true;
  scheduleRender();
}
function detailsHeightBounds() {
  const available = Math.max(0, document.body.clientHeight
    - document.querySelector('header').offsetHeight
    - $('notice').offsetHeight
    - document.querySelector('footer').offsetHeight
    - $('details-resizer').offsetHeight);
  const minimum = Math.min(100, available / 2);
  const maximum = Math.max(minimum, available - Math.min(112, available / 2));
  return { minimum, maximum };
}
function applyDetailsHeight() {
  if ($('details').hidden) return;
  const { minimum, maximum } = detailsHeightBounds();
  const height = Math.round(Math.min(maximum, Math.max(minimum, state.detailsHeight)));
  $('details').style.height = `${height}px`;
  $('details-resizer').setAttribute('aria-valuemin', String(Math.round(minimum)));
  $('details-resizer').setAttribute('aria-valuemax', String(Math.round(maximum)));
  $('details-resizer').setAttribute('aria-valuenow', String(height));
  $('details-resizer').setAttribute('aria-valuetext', `${height} pixels of commit details`);
  scheduleRender();
}
function setDetailsHeight(height) {
  const { minimum, maximum } = detailsHeightBounds();
  state.detailsHeight = Math.round(Math.min(maximum, Math.max(minimum, height)));
  applyDetailsHeight();
}
function saveDetailsHeight() {
  window.ghostex?.storage.set('detailsHeight', state.detailsHeight).catch(() => {});
}
function finishDetailsResize() {
  const drag = state.resizeDrag;
  if (!drag) return;
  state.resizeDrag = null;
  document.body.classList.remove('resizing-details');
  if ($('details-resizer').hasPointerCapture(drag.pointerId)) $('details-resizer').releasePointerCapture(drag.pointerId);
  saveDetailsHeight();
}
async function copyHash() {
  if (!state.selected) return;
  // Chromium's normal copy event writes exactly the selected hash; no clipboard
  // reading and no additional Ghostex clipboard permission are required.
  const listener = event => { event.clipboardData.setData('text/plain', state.selected); event.preventDefault(); };
  document.addEventListener('copy', listener, { once: true });
  const copied = document.execCommand('copy');
  document.removeEventListener('copy', listener);
  $('copy-hash').textContent = copied ? 'Copied' : state.selected.slice(0, 8);
}

$('viewport').addEventListener('scroll', scheduleRender, { passive: true });
new ResizeObserver(scheduleRender).observe($('viewport'));
new ResizeObserver(applyDetailsHeight).observe(document.querySelector('header'));
$('timeline').addEventListener('click', event => { const node = event.target.closest('.commit'); if (node) void selectCommit(node.dataset.hash); });
$('search').addEventListener('input', () => updateSearch());
$('search').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); nextMatch(event.shiftKey ? -1 : 1); } });
$('previous-match').addEventListener('click', () => nextMatch(-1));
$('next-match').addEventListener('click', () => nextMatch(1));
for (const id of ['refresh', 'retry']) $(id).addEventListener('click', () => void refresh());
$('scope').addEventListener('change', () => {
  state.scope = $('scope').value; state.limit = 250; state.generation++; state.fingerprint = '';
  $('viewport').scrollTop = 0;
  window.ghostex.storage.set('scope', state.scope).catch(() => {});
  void refresh();
});
$('load-more').addEventListener('click', () => { state.limit = Math.min(5000, state.limit + 250); state.generation++; void refresh(); });
$('close-details').addEventListener('click', closeDetails);
$('details-resizer').addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary) return;
  event.preventDefault();
  $('details-resizer').focus({ preventScroll: true });
  state.resizeDrag = { pointerId: event.pointerId, startY: event.clientY, startHeight: $('details').getBoundingClientRect().height };
  $('details-resizer').setPointerCapture(event.pointerId);
  document.body.classList.add('resizing-details');
});
$('details-resizer').addEventListener('pointermove', event => {
  const drag = state.resizeDrag;
  if (drag?.pointerId === event.pointerId) setDetailsHeight(drag.startHeight + drag.startY - event.clientY);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  $('details-resizer').addEventListener(type, event => {
    if (state.resizeDrag?.pointerId === event.pointerId) finishDetailsResize();
  });
}
$('details-resizer').addEventListener('dblclick', () => {
  state.detailsHeight = 245;
  applyDetailsHeight();
  saveDetailsHeight();
});
$('details-resizer').addEventListener('keydown', event => {
  const { minimum, maximum } = detailsHeightBounds();
  const height = $('details').getBoundingClientRect().height;
  const step = event.shiftKey ? 64 : 16;
  const requested = { ArrowUp: height + step, ArrowDown: height - step, Home: minimum, End: maximum }[event.key];
  if (requested === undefined) return;
  event.preventDefault();
  event.stopPropagation();
  setDetailsHeight(requested);
  saveDetailsHeight();
});
window.addEventListener('resize', applyDetailsHeight);
window.addEventListener('blur', finishDetailsResize);
$('copy-hash').addEventListener('click', () => void copyHash());
for (const [id, key] of [['auto-refresh', 'autoRefresh'], ['auto-fetch', 'autoFetch'], ['transparent', 'transparent']]) {
  $(id).addEventListener('change', async () => {
    state.preferences[key] = $(id).checked; updatePreferenceControls();
    applyTheme(state.data?.theme, state.preferences.transparent);
    try { await window.ghostex.settings.set({ [key]: state.preferences[key] }); }
    catch (error) { notice(errorMessage(error)); }
  });
}
document.addEventListener('click', event => { if (!$('settings-menu').contains(event.target)) $('settings-menu').open = false; });
document.addEventListener('keydown', event => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(event.target.tagName);
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' || (!typing && event.key === '/')) {
    event.preventDefault(); $('search').focus(); return;
  }
  if (event.key === 'Escape') {
    $('settings-menu').open = false;
    if ($('search').value) { $('search').value = ''; updateSearch(false); }
    else closeDetails();
  }
  if (typing) return;
  if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey) void refresh();
  if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && state.layout.rows.length) {
    event.preventDefault();
    const current = state.layout.rows.findIndex(row => row.commit.hash === state.selected);
    const index = Math.min(state.layout.rows.length - 1, Math.max(0, current + (event.key === 'ArrowDown' ? 1 : -1)));
    scrollToRow(index); void selectCommit(state.layout.rows[index].commit.hash);
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) void tick(true); });
window.addEventListener('focus', () => void tick(true));
let lastSettingsRead = 0;
async function tick(force = false) {
  if (!window.ghostex || document.hidden) return;
  try {
    // Re-read context too: this recovers if a host drops a context-change event.
    updateContext(await window.ghostex.context());
    if (Date.now() - lastSettingsRead > 15000) { lastSettingsRead = Date.now(); await updatePreferences(); }
    if (force || state.preferences.autoRefresh) await refresh();
    remote.maybeFetch(state.preferences.autoFetch);
  } catch (error) { notice(errorMessage(error)); }
}
async function start() {
  for (let i = 0; i < 30 && !window.ghostex; i++) await new Promise(resolve => setTimeout(resolve, 100));
  if (!window.ghostex) {
    showEmpty('Open in Ghostex', 'Enable Branch Graph in Settings → Extensions → Store, then open it from the view panel.'); return;
  }
  await updatePreferences();
  const [scope, detailsHeight] = await Promise.all([
    window.ghostex.storage.get('scope'), window.ghostex.storage.get('detailsHeight'),
  ]);
  state.scope = scope === 'all' ? 'all' : 'current';
  if (Number.isFinite(detailsHeight) && detailsHeight >= 80 && detailsHeight <= 10000) state.detailsHeight = detailsHeight;
  $('scope').value = state.scope;
  const unsubscribe = window.ghostex.onContextChange(updateContext);
  updateContext(await window.ghostex.context());
  const interval = setInterval(() => void tick(), 5000);
  window.addEventListener('beforeunload', () => { unsubscribe(); clearInterval(interval); }, { once: true });
}
applyTheme({}, true);
void start().catch(error => showEmpty('Could not connect', errorMessage(error), true));
