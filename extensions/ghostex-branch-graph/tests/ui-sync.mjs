// End-to-end actions through the actual helper, using only disposable local Git remotes.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'branch-graph-ui-'));
const alice = join(temporary, 'alice'), bob = join(temporary, 'bob'), other = join(temporary, 'other');
const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
const run = promisify(execFile);
const calls = [], errors = [];
let browser, server, held, holdNextFetch = false;
async function commit(cwd, name) {
  await writeFile(join(cwd, `${name}.txt`), name); git(cwd, 'add', '.'); git(cwd, 'commit', '-m', name);
}
async function configure(cwd) {
  git(cwd, 'config', 'user.name', 'UI test'); git(cwd, 'config', 'user.email', 'ui@example.test');
  git(cwd, 'config', 'commit.gpgsign', 'false');
}
try {
  git(temporary, 'init', '--bare', '--initial-branch=main', 'remote.git');
  git(temporary, 'clone', 'remote.git', alice); await configure(alice);
  await commit(alice, 'base'); git(alice, 'push', '-u', 'origin', 'main');
  git(temporary, 'clone', 'remote.git', bob); await configure(bob);
  await mkdir(other); git(other, 'init', '-b', 'other'); await configure(other); await commit(other, 'other');
  server = createServer(async (request, response) => {
    try {
      let relative = request.url.split('?')[0];
      if (relative.endsWith('/')) relative += 'index.html';
      const file = resolve(root, 'dist', relative.slice(1));
      if (!file.startsWith(join(root, 'dist') + '/')) throw new Error('Invalid path');
      response.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript');
      response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true });
  async function pageFor(route = '/') {
    const page = await browser.newPage({ viewport: { width: route === '/' ? 700 : 238, height: route === '/' ? 700 : 182 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.exposeFunction('fixtureExec', async (command, options) => {
      const input = JSON.parse(Buffer.from(command.match(/'([A-Za-z0-9+/=]+)'$/)[1], 'base64').toString());
      calls.push({ action: input.action || 'graph', cwd: options.cwd });
      if (input.action === 'fetch' && holdNextFetch) {
        holdNextFetch = false;
        await new Promise(resolve => { held = resolve; });
      }
      try { return { ...(await run('/bin/sh', ['-c', command], { cwd: options.cwd, env, maxBuffer: 4 * 1024 * 1024 })), exitCode: 0 }; }
      catch (error) { return { stdout: error.stdout || '', stderr: error.stderr || '', exitCode: error.code }; }
    });
    await page.addInitScript(path => {
      const callbacks = [];
      window.context = { project: { name: 'Alice', path } };
      window.switchProject = path => { window.context = { project: { name: 'Other', path } }; callbacks.forEach(callback => callback(window.context)); };
      const preferences = { autoRefresh: false, autoFetch: false, transparent: true };
      const storage = new Map();
      window.ghostex = {
        context: async () => window.context, onContextChange: callback => { callbacks.push(callback); return () => {}; },
        exec: (command, options) => window.fixtureExec(command, options),
        settings: { get: async () => ({ ...preferences }), set: async patch => Object.assign(preferences, patch) },
        storage: { get: async key => storage.get(key), set: async (key, value) => storage.set(key, value) },
        ui: { close: async () => {} },
      };
    }, alice);
    await page.goto(`http://127.0.0.1:${server.address().port}${route}`);
    await page.waitForFunction(() => document.querySelector('[data-sync-status]').textContent === 'Up to date');
    return page;
  }
  const graph = await pageFor();
  await commit(bob, 'remote-one'); git(bob, 'push');
  await graph.locator('[data-git-action="fetch"]').click();
  await graph.waitForFunction(() => document.querySelector('[data-sync-status]').textContent.includes('1 behind'));
  assert.equal(existsSync(join(alice, 'remote-one.txt')), false);
  await graph.locator('[data-git-action="pull"]').click();
  await graph.waitForFunction(() => document.querySelector('[data-sync-status]').textContent === 'Up to date');
  assert.ok(existsSync(join(alice, 'remote-one.txt')));
  await commit(alice, 'local-one');
  await graph.locator('#refresh').click();
  await graph.waitForFunction(() => document.querySelector('[data-sync-status]').textContent.includes('1 ahead'));
  await graph.locator('[data-git-action="push"]').click();
  await graph.waitForFunction(() => document.querySelector('[data-sync-status]').textContent === 'Up to date');
  assert.equal(git(alice, 'rev-parse', 'HEAD'), git(temporary, '--git-dir=remote.git', 'rev-parse', 'main'));
  const quick = await pageFor('/quick/');
  git(bob, 'pull', '--ff-only'); await commit(bob, 'remote-two'); git(bob, 'push');
  await quick.locator('[data-git-action="fetch"]').click();
  await quick.waitForFunction(() => document.querySelector('[data-sync-status]').textContent.includes('1 behind'));
  await quick.locator('[data-git-action="pull"]').click();
  await quick.waitForFunction(() => document.querySelector('[data-sync-status]').textContent === 'Up to date');
  assert.ok(existsSync(join(alice, 'remote-two.txt')));
  await graph.locator('#refresh').click();
  await graph.waitForFunction(() => document.querySelector('[data-sync-status]').textContent === 'Up to date');
  await commit(bob, 'automatic'); git(bob, 'push');
  await graph.locator('#settings-menu summary').click(); await graph.locator('#auto-fetch').check();
  await graph.evaluate(() => { const now = Date.now; Date.now = () => now() + 61000; window.dispatchEvent(new Event('focus')); });
  await graph.waitForFunction(() => document.querySelector('[data-sync-result]').textContent.includes('automatic') && document.querySelector('[data-sync-status]').textContent.includes('1 behind'));
  assert.equal(existsSync(join(alice, 'automatic.txt')), false, 'automatic fetch never pulls');
  await graph.locator('#settings-menu summary').click();
  holdNextFetch = true;
  await graph.locator('[data-git-action="fetch"]').click();
  await graph.waitForFunction(() => document.querySelector('[data-sync-result]').textContent === 'Fetching remotes…');
  await graph.evaluate(path => window.switchProject(path), other);
  await graph.waitForFunction(() => document.querySelector('[data-sync-status]').textContent === 'No remote');
  assert.equal(await graph.locator('[data-git-action="push"]').isDisabled(), true);
  while (!held) await new Promise(resolve => setTimeout(resolve, 10));
  held();
  await graph.waitForTimeout(300);
  assert.equal(await graph.locator('[data-sync-status]').textContent(), 'No remote');
  assert.equal(git(other, 'rev-parse', '--abbrev-ref', 'HEAD'), 'other');
  assert.equal(calls.filter(call => ['fetch','pull','push'].includes(call.action) && call.cwd !== alice).length, 0);
  assert.deepEqual(errors, []);
  console.log('Graph + popup actions, ahead/behind, automatic fetch, and in-flight project switch passed.');
} finally {
  held?.(); await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
