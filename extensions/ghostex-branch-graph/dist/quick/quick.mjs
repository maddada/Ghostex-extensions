import { readRepository } from './bridge.mjs';
import { RemoteControls } from './remote.mjs';
import { applyTheme } from './theme.mjs';

let path = '', epoch = 0, inFlight = null;
const remote = new RemoteControls(document.getElementById('remote-controls'), () => { epoch++; return refresh(); });
function contextChanged(context) {
  const next = context?.activeSession?.projectPath || context?.project?.path || '';
  document.getElementById('quick-project').textContent = context?.project?.name || '';
  if (next === path) return;
  path = next; epoch++; remote.update(null, path);
  void refresh();
}
async function refresh() {
  if (!path || document.hidden || inFlight === epoch) return;
  const current = epoch, cwd = path;
  inFlight = current;
  try {
    const data = await readRepository({ action: 'status' }, cwd);
    if (current !== epoch) return;
    applyTheme(data.theme, false);
    remote.update(data, cwd);
  } catch (error) {
    if (current !== epoch) return;
    remote.update(null, cwd); remote.message = error.message; remote.error = true; remote.render();
  } finally { if (inFlight === current) inFlight = null; }
}
async function start() {
  for (let i = 0; i < 30 && !window.ghostex; i++) await new Promise(resolve => setTimeout(resolve, 100));
  if (!window.ghostex) throw new Error('Open Git quick actions from the Ghostex titlebar.');
  const unsubscribe = window.ghostex.onContextChange(contextChanged);
  contextChanged(await window.ghostex.context());
  const interval = setInterval(async () => {
    if (document.hidden) return;
    try { contextChanged(await window.ghostex.context()); await refresh(); } catch {}
  }, 5000);
  window.addEventListener('beforeunload', () => { unsubscribe(); clearInterval(interval); }, { once: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') void window.ghostex.ui.close(); });
}
applyTheme({}, false);
remote.render();
void start().catch(error => { remote.message = error.message; remote.error = true; remote.render(); });
