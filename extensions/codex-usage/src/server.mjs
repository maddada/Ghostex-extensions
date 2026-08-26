import { readFile, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";

const POLL_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 12_000;
const REFRESH_WINDOW_MS = 5 * 60_000;
const SESSION_WINDOW_SECONDS = 18_000;
const WEEKLY_WINDOW_SECONDS = 604_800;
const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const REFRESH_URL = "https://auth.openai.com/oauth/token";
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";

function parseArguments(argv) {
  let port;
  let once = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--once") {
      once = true;
      continue;
    }
    if (argument === "--port") {
      port = Number.parseInt(argv[index + 1] ?? "", 10);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("A valid --port value is required.");
  }
  return { once, port };
}

function authPaths() {
  const configuredHome = process.env.CODEX_HOME?.trim();
  if (configuredHome) return [join(configuredHome, "auth.json")];
  return [join(homedir(), ".config", "codex", "auth.json"), join(homedir(), ".codex", "auth.json")];
}

function parseAuth(text, path) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return null;
  }
  const accessToken = payload?.tokens?.access_token;
  if (typeof accessToken !== "string" || !accessToken.trim()) {
    return payload?.OPENAI_API_KEY ? { apiKeyOnly: true, path, payload } : null;
  }
  return {
    accessToken: accessToken.trim(),
    accountId: typeof payload.tokens.account_id === "string" ? payload.tokens.account_id.trim() : "",
    apiKeyOnly: false,
    path,
    payload,
    refreshToken:
      typeof payload.tokens.refresh_token === "string" ? payload.tokens.refresh_token.trim() : "",
  };
}

async function loadCredentialAt(path) {
  try {
    return parseAuth(await readFile(path, "utf8"), path);
  } catch {
    return null;
  }
}

async function loadCredential() {
  for (const path of authPaths()) {
    const credential = await loadCredentialAt(path);
    if (credential) return credential;
  }
  return null;
}

function jwtExpiresSoon(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" && payload.exp * 1_000 - Date.now() <= REFRESH_WINDOW_MS;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function oauthErrorMessage(status, payload) {
  const code = payload?.error?.code ?? payload?.error ?? payload?.code;
  if (code === "refresh_token_reused") return "Codex token conflict. Run `codex` to log in again.";
  if (code === "refresh_token_invalidated") return "Codex login was revoked. Run `codex` to log in again.";
  if (code === "refresh_token_expired") return "Codex login expired. Run `codex` to log in again.";
  return `Codex token refresh failed with HTTP ${status}.`;
}

async function refreshCredential(credential) {
  const live = (await loadCredentialAt(credential.path)) ?? credential;
  if (live.apiKeyOnly || !live.refreshToken) {
    throw new Error("Codex login cannot be refreshed. Run `codex` to log in again.");
  }
  if (live.accessToken !== credential.accessToken && !jwtExpiresSoon(live.accessToken)) return live;

  const response = await fetchWithTimeout(REFRESH_URL, {
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: live.refreshToken,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || typeof payload?.access_token !== "string" || !payload.access_token) {
    throw new Error(oauthErrorMessage(response.status, payload));
  }

  const nextPayload = structuredClone(live.payload);
  nextPayload.tokens = { ...nextPayload.tokens, access_token: payload.access_token };
  if (typeof payload.refresh_token === "string" && payload.refresh_token) {
    nextPayload.tokens.refresh_token = payload.refresh_token;
  }
  if (typeof payload.id_token === "string" && payload.id_token) {
    nextPayload.tokens.id_token = payload.id_token;
  }
  nextPayload.last_refresh = new Date().toISOString();
  const temporaryPath = `${live.path}.ghostex-${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(nextPayload, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, live.path);
  const refreshed = parseAuth(JSON.stringify(nextPayload), live.path);
  if (!refreshed || refreshed.apiKeyOnly) {
    throw new Error("Codex returned an invalid refreshed login. Run `codex` to log in again.");
  }
  return refreshed;
}

function numeric(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPercentage(value) {
  const parsed = numeric(value);
  return parsed === null ? null : Math.min(100, Math.max(0, parsed));
}

function resetTime(window) {
  const resetAt = numeric(window?.reset_at);
  if (resetAt !== null) return new Date(resetAt * 1_000).toISOString();
  const after = numeric(window?.reset_after_seconds);
  return after === null ? null : new Date(Date.now() + after * 1_000).toISOString();
}

function classifyWindows(rateLimit, headers) {
  const candidates = [
    {
      fallback: "session",
      percent: clampPercentage(rateLimit?.primary_window?.used_percent ?? headers.get("x-codex-primary-used-percent")),
      window: rateLimit?.primary_window ?? {},
    },
    {
      fallback: "weekly",
      percent: clampPercentage(rateLimit?.secondary_window?.used_percent ?? headers.get("x-codex-secondary-used-percent")),
      window: rateLimit?.secondary_window ?? {},
    },
  ].filter((candidate) => candidate.percent !== null);
  const exactKind = (candidate) => {
    const duration = numeric(candidate.window?.limit_window_seconds);
    if (duration === SESSION_WINDOW_SECONDS) return "session";
    if (duration === WEEKLY_WINDOW_SECONDS) return "weekly";
    return null;
  };
  const pick = (kind, label) => {
    const candidate =
      candidates.find((value) => exactKind(value) === kind) ??
      candidates.find((value) => exactKind(value) === null && value.fallback === kind);
    return candidate
      ? { label, percent: candidate.percent, resetsAt: resetTime(candidate.window) }
      : null;
  };
  return { session: pick("session", "5-hour"), weekly: pick("weekly", "Weekly") };
}

function formatPlan(value) {
  if (typeof value !== "string" || !value.trim()) return "Codex";
  const plan = value.trim().toLowerCase();
  if (plan === "prolite") return "Codex Pro 5x";
  if (plan === "pro") return "Codex Pro 20x";
  return `Codex ${plan.charAt(0).toUpperCase()}${plan.slice(1)}`;
}

function retryAfterMilliseconds(value) {
  if (!value) return POLL_INTERVAL_MS;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(POLL_INTERVAL_MS, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(POLL_INTERVAL_MS, date - Date.now()) : POLL_INTERVAL_MS;
}

async function requestUsage(credential) {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${credential.accessToken}`,
    "User-Agent": "Ghostex Codex Usage",
  };
  if (credential.accountId) headers["ChatGPT-Account-Id"] = credential.accountId;
  const response = await fetchWithTimeout(USAGE_URL, { headers });
  if (response.status === 429) {
    const error = new Error("Codex rate limited usage updates.");
    error.code = "rateLimited";
    error.retryAfterMs = retryAfterMilliseconds(response.headers.get("retry-after"));
    throw error;
  }
  if (response.status === 401 || response.status === 403) {
    const error = new Error("Codex login cannot read usage.");
    error.code = "authExpired";
    throw error;
  }
  if (!response.ok) throw new Error(`Codex usage request failed with HTTP ${response.status}.`);
  const payload = await response.json();
  return { ...classifyWindows(payload?.rate_limit, response.headers), plan: formatPlan(payload?.plan_type) };
}

async function fetchCodexUsage(credential) {
  let active = jwtExpiresSoon(credential.accessToken) ? await refreshCredential(credential) : credential;
  try {
    return await requestUsage(active);
  } catch (error) {
    if (error?.code !== "authExpired" || !active.refreshToken) throw error;
    active = await refreshCredential(active);
    return await requestUsage(active);
  }
}

function pageHtml() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Codex Usage</title>
<style>
:root{color-scheme:dark;font:13px/1.35 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0e0e0e;color:#f5f5f4}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 85% 0%,#1c2831 0,transparent 42%),#0e0e0e}main{min-height:100vh;padding:16px;display:flex;flex-direction:column;gap:13px}header{display:flex;align-items:center;gap:10px}.logo{width:32px;height:32px;display:grid;place-items:center;border:1px solid #343b40;border-radius:9px;background:#182027;color:#fcfcfc}.logo svg{width:22px;height:22px}h1{margin:0;font-size:14px;font-weight:650}.plan{color:#a8a29e;font-size:11px;margin-top:2px}#updated{margin-left:auto;color:#78716c;font-size:10px;text-align:right;white-space:nowrap}.card{border:1px solid #2a2d2f;border-radius:10px;background:rgba(23,24,25,.94);padding:12px}.bars{display:grid;gap:13px}.bar-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}.bar-label{font-weight:580}.bar-meta{color:#a8a29e;font-size:10px}.track{height:7px;overflow:hidden;border-radius:3px;background:#33373a}.fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#8b9eaa,#d7e2e8);transition:width .25s ease}.fill.warning{background:linear-gradient(90deg,#d97706,#f59e0b)}.notice{color:#fbbf24;font-size:11px;min-height:15px}footer{margin-top:auto;display:flex;align-items:center;gap:7px}a{flex:1;height:30px;display:grid;place-items:center;border:1px solid #393d40;border-radius:7px;color:#e7e5e4;text-decoration:none;background:#191b1c}a:hover{background:#24282a;border-color:#596168}
</style></head><body><main>
<header><div class="logo" aria-hidden="true"><svg viewBox="0 0 100 100"><path fill="currentColor" d="M83.8 42.8a20.2 20.2 0 0 0-23.4-26A20.2 20.2 0 0 0 26.1 24a20.2 20.2 0 0 0-10.8 33.3 20.2 20.2 0 0 0 23.4 26A20.2 20.2 0 0 0 72.9 76a20.2 20.2 0 0 0 10.9-33.2ZM53.7 84.8a15 15 0 0 1-9.6-3.4l16.4-9.5a2.6 2.6 0 0 0 1.3-2.3V47.2l6.8 3.9v18.8a15 15 0 0 1-14.9 15ZM21.5 71.1a15 15 0 0 1-1.8-10l16.4 9.4a2.6 2.6 0 0 0 2.6 0l19.5-11.2v7.8L42 76.6a15 15 0 0 1-20.5-5.5Zm-4.2-34.7a15 15 0 0 1 7.9-6.6v18.9a2.6 2.6 0 0 0 1.3 2.3l19.4 11.2-6.8 3.9-16.3-9.3a15 15 0 0 1-5.5-20.4Zm55.3 12.8L53.2 38l6.7-3.9 16.3 9.3A15 15 0 0 1 74 70.4V51.5a2.6 2.6 0 0 0-1.4-2.3Zm6.7-10-16.4-9.6a2.6 2.6 0 0 0-2.6 0L40.9 40.8V33l16.2-9.4a15 15 0 0 1 22.2 15.6ZM37.2 53l-6.7-3.9V30.3a15 15 0 0 1 24.4-11.5l-16.4 9.5a2.6 2.6 0 0 0-1.3 2.3V53Zm3.6-8 8.7-5 8.7 5v10.1l-8.7 5-8.7-5Z"/></svg></div><div><h1>Codex Usage</h1><div class="plan" id="plan">Checking Codex login…</div></div><div id="updated"></div></header>
<section class="card bars" id="bars"></section><div class="notice" id="notice"></div>
<footer><a href="https://status.openai.com/" target="_blank" rel="noopener noreferrer">Status</a><a href="https://chatgpt.com/codex/settings/usage" target="_blank" rel="noopener noreferrer">Dashboard</a></footer>
</main><script>
const byId=id=>document.getElementById(id);function resetText(value){if(!value)return'reset unavailable';const ms=new Date(value).getTime()-Date.now();if(!Number.isFinite(ms))return'reset unavailable';if(ms<=0)return'resets now';const hours=Math.floor(ms/3600000),days=Math.floor(hours/24);return days>0?'resets in '+days+'d '+(hours%24)+'h':'resets in '+hours+'h '+Math.floor(ms%3600000/60000)+'m'}function renderBars(remote){const values=[remote?.session,remote?.weekly],labels=['5-hour','Weekly'],host=byId('bars');host.replaceChildren();values.forEach((bar,index)=>{const row=document.createElement('div'),head=document.createElement('div'),label=document.createElement('span'),meta=document.createElement('span'),track=document.createElement('div'),fill=document.createElement('div');head.className='bar-head';label.className='bar-label';label.textContent=bar?.label||labels[index];meta.className='bar-meta';meta.textContent=bar?Math.round(bar.percent)+'% used · '+resetText(bar.resetsAt):'No live data';head.append(label,meta);track.className='track';fill.className='fill'+(bar?.percent>=80?' warning':'');fill.style.width=(bar?.percent||0)+'%';track.append(fill);row.append(head,track);host.append(row)})}function render(data){renderBars(data.remote);byId('plan').textContent=data.remote?.plan||data.auth.message;byId('notice').textContent=data.auth.status==='ready'?'':data.auth.message;byId('updated').textContent=data.updatedAt?'Updated '+new Date(data.updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}async function refresh(){try{const response=await fetch('/api/usage',{cache:'no-store'});if(!response.ok)throw new Error();render(await response.json())}catch{byId('notice').textContent='Could not read the local usage service.'}}refresh();setInterval(refresh,15000);
</script></body></html>`;
}

let snapshot = {
  auth: { message: "Checking Codex login…", status: "loading" },
  remote: null,
  updatedAt: null,
};

async function postBadge(lines) {
  const apiUrl = process.env.GHOSTEX_API_URL;
  const token = process.env.GHOSTEX_API_TOKEN;
  if (!apiUrl || !token) return;
  const response = await fetch(new URL("/api/extensionBadge", apiUrl), {
    body: JSON.stringify({ params: { lines }, requestId: `codex-usage-${Date.now()}` }),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(`Ghostex badge update failed with HTTP ${response.status}.`);
}

async function refreshSnapshot({ publishBadge = true } = {}) {
  const credential = await loadCredential();
  if (!credential) {
    snapshot = {
      auth: { message: "Codex credentials not found. Run `codex` to log in.", status: "authMissing" },
      remote: null,
      updatedAt: new Date().toISOString(),
    };
    if (publishBadge) await postBadge([]).catch((error) => console.warn(error.message));
    return POLL_INTERVAL_MS;
  }
  if (credential.apiKeyOnly) {
    snapshot = {
      auth: { message: "Subscription usage is unavailable for API-key-only login.", status: "authMissing" },
      remote: null,
      updatedAt: new Date().toISOString(),
    };
    if (publishBadge) await postBadge([]).catch((error) => console.warn(error.message));
    return POLL_INTERVAL_MS;
  }
  try {
    const remote = await fetchCodexUsage(credential);
    snapshot = {
      auth: { message: `Using ${credential.path}.`, status: "ready" },
      remote,
      updatedAt: new Date().toISOString(),
    };
    const badge = [remote.session, remote.weekly]
      .filter(Boolean)
      .map((bar) => `${Math.round(bar.percent)}%`);
    if (publishBadge) await postBadge(badge).catch((error) => console.warn(error.message));
    return POLL_INTERVAL_MS;
  } catch (error) {
    const rateLimited = error?.code === "rateLimited";
    snapshot = {
      auth: {
        message: error instanceof Error ? error.message : "Codex usage update failed.",
        status: rateLimited ? "rateLimited" : "error",
      },
      remote: rateLimited ? snapshot.remote : null,
      updatedAt: new Date().toISOString(),
    };
    if (!rateLimited && publishBadge) {
      await postBadge([]).catch((badgeError) => console.warn(badgeError.message));
    }
    return rateLimited ? error.retryAfterMs : POLL_INTERVAL_MS;
  }
}

function formatOnceOutput() {
  if (!snapshot.remote) return `Codex Usage: ${snapshot.auth.message}`;
  const bars = [snapshot.remote.session, snapshot.remote.weekly]
    .filter(Boolean)
    .map((bar) => `${bar.label}: ${Math.round(bar.percent)}%`)
    .join(" | ");
  return `${snapshot.remote.plan} | ${bars}`;
}

const { once, port } = parseArguments(process.argv.slice(2));
if (once) {
  await refreshSnapshot({ publishBadge: false });
  console.log(formatOnceOutput());
  process.exit(0);
}

const page = pageHtml();
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/") {
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : page);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/usage") {
    response
      .writeHead(200, { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" })
      .end(JSON.stringify(snapshot));
    return;
  }
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Codex Usage listening on http://127.0.0.1:${port}`);
});
let pollTimer;
async function poll() {
  const delay = await refreshSnapshot();
  pollTimer = setTimeout(poll, delay);
}
void poll();
function shutdown() {
  clearTimeout(pollTimer);
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
