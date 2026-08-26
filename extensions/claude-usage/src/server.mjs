import { execFileSync } from "node:child_process";
import { open, readFile, readdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";

const POLL_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 12_000;
const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const KEYCHAIN_SERVICE = "Claude Code-credentials";
const EMPTY_LOCAL_USAGE = {
  today: { tokens: 0, costUSD: null },
  yesterday: { tokens: 0, costUSD: null },
  thirtyDays: { tokens: 0, costUSD: null },
  dailyTokens: [],
};

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

function parseCredentialPayload(text, source) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const oauth = parsed?.claudeAiOauth;
  const accessToken = typeof oauth?.accessToken === "string" ? oauth.accessToken.trim() : "";
  if (!accessToken) return null;
  return {
    accessToken,
    expiresAt: oauth.expiresAt,
    rateLimitTier: oauth.rateLimitTier,
    source,
    subscriptionType: oauth.subscriptionType,
  };
}

async function loadCredentials() {
  if (process.platform === "darwin") {
    try {
      const value = execFileSync(
        "/usr/bin/security",
        ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5_000 },
      );
      const credential = parseCredentialPayload(value, "macOS Keychain");
      if (credential) return credential;
    } catch {
      // A missing or inaccessible Keychain item continues to Claude Code's credentials file.
    }
  }

  const credentialPath = join(homedir(), ".claude", ".credentials.json");
  try {
    const value = await readFile(credentialPath, "utf8");
    return parseCredentialPayload(value, "Claude Code credentials file");
  } catch {
    return null;
  }
}

function credentialExpired(expiresAt) {
  if (typeof expiresAt === "number") return expiresAt <= Date.now();
  if (typeof expiresAt === "string") {
    const parsed = Date.parse(expiresAt);
    return Number.isFinite(parsed) && parsed <= Date.now();
  }
  return false;
}

function clampPercentage(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : null;
}

function mapWindow(value, label) {
  const percent = clampPercentage(value?.utilization);
  if (percent === null) return null;
  return {
    label,
    percent,
    resetsAt: typeof value?.resets_at === "string" ? value.resets_at : null,
  };
}

function modelName(limit) {
  const name = limit?.scope?.model?.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function formatPlan(subscriptionType, rateLimitTier) {
  const subscription = typeof subscriptionType === "string" ? subscriptionType.toLowerCase() : "";
  const tier = typeof rateLimitTier === "string" ? rateLimitTier.toLowerCase() : "";
  const multiplier = tier.match(/(?:^|[_-])(\d+)x(?:$|[_-])/)?.[1];
  if (subscription.includes("max") || tier.includes("max")) {
    return `Claude Max${multiplier ? ` ${multiplier}x` : ""}`;
  }
  if (subscription.includes("pro") || tier.includes("pro")) return "Claude Pro";
  return "Claude";
}

function mapUsageResponse(payload, credential) {
  const session = mapWindow(payload?.five_hour, "Session");
  const weekly = mapWindow(payload?.seven_day, "Weekly");
  const models = Array.isArray(payload?.limits)
    ? payload.limits
        .filter((limit) => limit?.kind === "weekly_scoped")
        .map((limit) => {
          const label = modelName(limit);
          const percent = clampPercentage(limit?.percent);
          if (!label || percent === null) return null;
          return {
            label,
            percent,
            resetsAt: typeof limit?.resets_at === "string" ? limit.resets_at : null,
          };
        })
        .filter(Boolean)
        .sort((left, right) => right.percent - left.percent || left.label.localeCompare(right.label))
    : [];
  const usedCredits = payload?.extra_usage?.used_credits;
  const monthlyLimit = payload?.extra_usage?.monthly_limit;
  return {
    extraUsage: {
      usedUSD: typeof usedCredits === "number" && Number.isFinite(usedCredits) ? usedCredits / 100 : null,
      limitUSD:
        typeof monthlyLimit === "number" && Number.isFinite(monthlyLimit)
          ? monthlyLimit / 100
          : null,
    },
    models,
    plan: formatPlan(credential.subscriptionType, credential.rateLimitTier),
    session,
    weekly,
  };
}

function retryAfterMilliseconds(value) {
  if (!value) return POLL_INTERVAL_MS;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(POLL_INTERVAL_MS, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(POLL_INTERVAL_MS, date - Date.now()) : POLL_INTERVAL_MS;
}

async function fetchClaudeUsage(credential) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(USAGE_URL, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${credential.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "claude-code/2.1.69",
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: controller.signal,
    });
    if (response.status === 429) {
      const error = new Error("Anthropic rate limited usage updates.");
      error.code = "rateLimited";
      error.retryAfterMs = retryAfterMilliseconds(response.headers.get("retry-after"));
      throw error;
    }
    if (response.status === 401 || response.status === 403) {
      const error = new Error("Claude Code login cannot read usage. Re-login in Claude Code.");
      error.code = "authExpired";
      throw error;
    }
    if (!response.ok) throw new Error(`Anthropic usage request failed with HTTP ${response.status}.`);
    return mapUsageResponse(await response.json(), credential);
  } finally {
    clearTimeout(timeout);
  }
}

function numericTokenCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function parseLogLine(line) {
  if (!line.includes('"usage"')) return null;
  let value;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  const usage = value?.message?.usage;
  if (!usage || typeof usage !== "object") return null;
  const timestamp = Date.parse(value.timestamp);
  if (!Number.isFinite(timestamp)) return null;
  const nestedCache = usage.cache_creation;
  const cacheCreation =
    nestedCache && typeof nestedCache === "object"
      ? numericTokenCount(nestedCache.ephemeral_5m_input_tokens) +
        numericTokenCount(nestedCache.ephemeral_1h_input_tokens)
      : numericTokenCount(usage.cache_creation_input_tokens);
  const tokens =
    numericTokenCount(usage.input_tokens) +
    numericTokenCount(usage.output_tokens) +
    numericTokenCount(usage.cache_read_input_tokens) +
    cacheCreation;
  const cost = value.costUSD;
  return {
    costUSD: typeof cost === "number" && Number.isFinite(cost) && cost >= 0 ? cost : null,
    messageId: typeof value.message?.id === "string" ? value.message.id : null,
    requestId: typeof value.requestId === "string" ? value.requestId : null,
    timestamp,
    tokens,
  };
}

async function discoverJsonlFiles(directory) {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await discoverJsonlFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(path);
  }
  return files;
}

async function readRange(path, start, length) {
  if (length <= 0) return Buffer.alloc(0);
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, start);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function parseLogBuffer(buffer) {
  const entries = [];
  let lineStart = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0x0a) continue;
    const parsed = parseLogLine(buffer.subarray(lineStart, index).toString("utf8"));
    if (parsed) entries.push(parsed);
    lineStart = index + 1;
  }
  const tail = buffer.subarray(lineStart);
  const parsedTail = parseLogLine(tail.toString("utf8"));
  if (parsedTail) {
    entries.push(parsedTail);
    return { entries, remainder: Buffer.alloc(0) };
  }
  return { entries, remainder: Buffer.from(tail) };
}

function startOfLocalDay(time = Date.now()) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function localDayKey(time) {
  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function summarizeEntries(entries) {
  const todayStart = startOfLocalDay();
  const yesterdayStart = startOfLocalDay(todayStart - 1);
  const thirtyDayStart = startOfLocalDay(todayStart - 29 * 86_400_000);
  const chartStart = startOfLocalDay(todayStart - 13 * 86_400_000);
  const buckets = new Map();
  const seen = new Set();
  const uniqueEntries = [];
  for (const entry of entries) {
    if (entry.messageId && entry.requestId) {
      const dedupKey = `${entry.messageId}\u0000${entry.requestId}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
    }
    uniqueEntries.push(entry);
    const key = localDayKey(entry.timestamp);
    const bucket = buckets.get(key) ?? { tokens: 0 };
    bucket.tokens += entry.tokens;
    buckets.set(key, bucket);
  }

  function rangeSummary(start, end = Number.POSITIVE_INFINITY) {
    let costUSD = 0;
    let hasCost = false;
    let tokens = 0;
    for (const entry of uniqueEntries) {
      if (entry.timestamp < start || entry.timestamp >= end) continue;
      tokens += entry.tokens;
      if (entry.costUSD !== null) {
        costUSD += entry.costUSD;
        hasCost = true;
      }
    }
    return { costUSD: hasCost ? costUSD : null, tokens };
  }

  const dailyTokens = [];
  for (let day = chartStart; day <= todayStart; day = startOfLocalDay(day + 26 * 60 * 60 * 1_000)) {
    const key = localDayKey(day);
    dailyTokens.push({ date: key, tokens: buckets.get(key)?.tokens ?? 0 });
  }
  return {
    dailyTokens,
    thirtyDays: rangeSummary(thirtyDayStart),
    today: rangeSummary(todayStart),
    yesterday: rangeSummary(yesterdayStart, todayStart),
  };
}

class ClaudeLogScanner {
  constructor() {
    this.files = new Map();
  }

  async scan() {
    const paths = await discoverJsonlFiles(join(homedir(), ".claude", "projects"));
    const currentPaths = new Set(paths);
    for (const cachedPath of this.files.keys()) {
      if (!currentPaths.has(cachedPath)) this.files.delete(cachedPath);
    }
    for (const path of paths) {
      let fileStat;
      try {
        fileStat = await stat(path);
      } catch {
        continue;
      }
      const previous = this.files.get(path);
      if (previous && previous.size === fileStat.size && previous.mtimeMs === fileStat.mtimeMs) {
        continue;
      }
      const canAppend = previous && previous.ino === fileStat.ino && fileStat.size > previous.size;
      const start = canAppend ? previous.size : 0;
      const prefix = canAppend ? previous.remainder : Buffer.alloc(0);
      const parsed = parseLogBuffer(
        Buffer.concat([prefix, await readRange(path, start, fileStat.size - start)]),
      );
      this.files.set(path, {
        entries: canAppend ? [...previous.entries, ...parsed.entries] : parsed.entries,
        ino: fileStat.ino,
        mtimeMs: fileStat.mtimeMs,
        remainder: parsed.remainder,
        size: fileStat.size,
      });
    }
    return summarizeEntries(paths.flatMap((path) => this.files.get(path)?.entries ?? []));
  }
}

function pageHtml() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Claude Usage</title>
<style>
:root{color-scheme:dark;font:13px/1.35 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0e0e0e;color:#f5f5f4}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 85% 0%,#2a1b14 0,transparent 38%),#0e0e0e}main{min-height:100vh;padding:16px;display:flex;flex-direction:column;gap:12px}header{display:flex;align-items:center;gap:10px}.logo{width:32px;height:32px;display:grid;place-items:center;border:1px solid #40342d;border-radius:9px;background:#211914;color:#d97757}.logo svg{width:21px;height:21px}h1{margin:0;font-size:14px;font-weight:650}.plan{color:#a8a29e;font-size:11px;margin-top:2px}#updated{margin-left:auto;color:#78716c;font-size:10px;text-align:right;white-space:nowrap}.card{border:1px solid #2a2928;border-radius:10px;background:rgba(23,23,22,.92);padding:12px}.bars{display:grid;gap:11px}.bar-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}.bar-label{font-weight:580}.bar-meta{color:#a8a29e;font-size:10px}.track{height:7px;overflow:hidden;border-radius:3px;background:#343230}.fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#c86143,#e08a68);transition:width .25s ease}.fill.warning{background:linear-gradient(90deg,#d97706,#f59e0b)}.trend-head,.extra{display:flex;justify-content:space-between;align-items:center}.section-label{color:#a8a29e;font-size:10px;letter-spacing:.08em;text-transform:uppercase}#sparkline{width:100%;height:54px;margin-top:5px;overflow:visible}#sparkline polyline{fill:none;stroke:#d97757;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.extra strong{font-size:12px}.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.tile{min-width:0;border:1px solid #292827;border-radius:8px;background:#151514;padding:9px 8px}.tile-label{color:#a8a29e;font-size:9px;text-transform:uppercase;letter-spacing:.06em}.tile-cost{height:18px;margin-top:5px;font-weight:650}.tile-tokens{color:#d6d3d1;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.notice{color:#fbbf24;font-size:11px;min-height:15px}footer{margin-top:auto;display:flex;align-items:center;gap:7px}a{flex:1;height:30px;display:grid;place-items:center;border:1px solid #393735;border-radius:7px;color:#e7e5e4;text-decoration:none;background:#191918}a:hover{background:#242321;border-color:#57534e}
</style></head><body><main>
<header><div class="logo" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9"/><circle cx="12" cy="12" r="4.3" fill="currentColor" stroke="none"/></svg></div><div><h1>Claude Usage</h1><div class="plan" id="plan">Checking Claude Code login…</div></div><div id="updated"></div></header>
<section class="card bars" id="bars"></section>
<section class="card"><div class="trend-head"><span class="section-label">Usage trend</span><span id="trendTotal">0 tokens</span></div><svg id="sparkline" viewBox="0 0 330 54" preserveAspectRatio="none" role="img" aria-label="Daily token usage"><polyline points=""></polyline></svg><div class="extra"><span class="section-label">Extra Usage</span><strong id="extra">Not enabled</strong></div></section>
<section class="tiles"><div class="tile"><div class="tile-label">Today</div><div class="tile-cost" id="todayCost"></div><div class="tile-tokens" id="todayTokens"></div></div><div class="tile"><div class="tile-label">Yesterday</div><div class="tile-cost" id="yesterdayCost"></div><div class="tile-tokens" id="yesterdayTokens"></div></div><div class="tile"><div class="tile-label">Last 30 days</div><div class="tile-cost" id="thirtyCost"></div><div class="tile-tokens" id="thirtyTokens"></div></div></section>
<div class="notice" id="notice"></div><footer><a href="https://status.anthropic.com" target="_blank" rel="noopener noreferrer">Status</a><a href="https://claude.ai/settings/usage" target="_blank" rel="noopener noreferrer">Dashboard</a></footer>
</main><script>
const compact=new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1});const dollars=new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2});const byId=id=>document.getElementById(id);
function resetText(value){if(!value)return'reset unavailable';const ms=new Date(value).getTime()-Date.now();if(!Number.isFinite(ms))return'reset unavailable';if(ms<=0)return'resets now';const hours=Math.floor(ms/3600000),days=Math.floor(hours/24);return days>0?'resets in '+days+'d '+(hours%24)+'h':'resets in '+hours+'h '+Math.floor(ms%3600000/60000)+'m'}
function renderBars(remote){const values=[remote?.session,remote?.weekly,remote?.models?.[0]],labels=['Session','Weekly','Top model'],host=byId('bars');host.replaceChildren();values.forEach((bar,index)=>{const row=document.createElement('div'),head=document.createElement('div'),label=document.createElement('span'),meta=document.createElement('span'),track=document.createElement('div'),fill=document.createElement('div');head.className='bar-head';label.className='bar-label';label.textContent=bar?.label||labels[index];meta.className='bar-meta';meta.textContent=bar?Math.round(bar.percent)+'% used · '+resetText(bar.resetsAt):'No live data';head.append(label,meta);track.className='track';fill.className='fill'+(bar?.percent>=80?' warning':'');fill.style.width=(bar?.percent||0)+'%';track.append(fill);row.append(head,track);host.append(row)})}
function renderTile(prefix,value){byId(prefix+'Cost').textContent=value.costUSD===null?'':dollars.format(value.costUSD);byId(prefix+'Tokens').textContent=compact.format(value.tokens)+' tokens'}
function renderSparkline(points){const values=points.map(point=>point.tokens),max=Math.max(1,...values),coords=values.map((value,index)=>((index/Math.max(1,values.length-1))*330).toFixed(1)+','+(51-(value/max)*46).toFixed(1));document.querySelector('#sparkline polyline').setAttribute('points',coords.join(' '));byId('trendTotal').textContent=compact.format(values.reduce((sum,value)=>sum+value,0))+' tokens'}
function render(data){renderBars(data.remote);byId('plan').textContent=data.remote?.plan||data.auth.message;byId('notice').textContent=data.auth.status==='ready'?'':data.auth.message;const extra=data.remote?.extraUsage;byId('extra').textContent=extra&&extra.usedUSD!==null&&extra.limitUSD!==null?dollars.format(extra.usedUSD)+' / '+dollars.format(extra.limitUSD):'Not enabled';renderTile('today',data.localUsage.today);renderTile('yesterday',data.localUsage.yesterday);renderTile('thirty',data.localUsage.thirtyDays);renderSparkline(data.localUsage.dailyTokens);byId('updated').textContent=data.updatedAt?'Updated '+new Date(data.updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}
async function refresh(){try{const response=await fetch('/api/usage',{cache:'no-store'});if(!response.ok)throw new Error();render(await response.json())}catch{byId('notice').textContent='Could not read the local usage service.'}}refresh();setInterval(refresh,15000);
</script></body></html>`;
}

const scanner = new ClaudeLogScanner();
let snapshot = {
  auth: { message: "Checking Claude Code login…", status: "loading" },
  localUsage: EMPTY_LOCAL_USAGE,
  remote: null,
  updatedAt: null,
};

async function postBadge(lines) {
  const apiUrl = process.env.GHOSTEX_API_URL;
  const token = process.env.GHOSTEX_API_TOKEN;
  if (!apiUrl || !token) return;
  const response = await fetch(new URL("/api/extensionBadge", apiUrl), {
    body: JSON.stringify({ params: { lines }, requestId: `claude-usage-${Date.now()}` }),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(`Ghostex badge update failed with HTTP ${response.status}.`);
}

async function refreshSnapshot({ publishBadge = true } = {}) {
  let localUsage = EMPTY_LOCAL_USAGE;
  try {
    localUsage = await scanner.scan();
  } catch (error) {
    console.warn(`Claude log scan failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const credential = await loadCredentials();
  if (!credential) {
    snapshot = {
      auth: { message: "Claude Code credentials not found. Re-login in Claude Code.", status: "authMissing" },
      localUsage,
      remote: null,
      updatedAt: new Date().toISOString(),
    };
    if (publishBadge) await postBadge([]).catch((error) => console.warn(error.message));
    return POLL_INTERVAL_MS;
  }
  if (credentialExpired(credential.expiresAt)) {
    snapshot = {
      auth: { message: "Claude Code login expired. Re-login in Claude Code.", status: "authExpired" },
      localUsage,
      remote: null,
      updatedAt: new Date().toISOString(),
    };
    if (publishBadge) await postBadge([]).catch((error) => console.warn(error.message));
    return POLL_INTERVAL_MS;
  }
  try {
    const remote = await fetchClaudeUsage(credential);
    snapshot = {
      auth: { message: `Using ${credential.source}.`, status: "ready" },
      localUsage,
      remote,
      updatedAt: new Date().toISOString(),
    };
    const badge = [remote.weekly, remote.models[0]]
      .filter(Boolean)
      .map((bar) => `${Math.round(bar.percent)}%`);
    if (publishBadge) await postBadge(badge).catch((error) => console.warn(error.message));
    return POLL_INTERVAL_MS;
  } catch (error) {
    const rateLimited = error?.code === "rateLimited";
    snapshot = {
      auth: {
        message: error instanceof Error ? error.message : "Claude usage update failed.",
        status: rateLimited ? "rateLimited" : error?.code === "authExpired" ? "authExpired" : "error",
      },
      localUsage,
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
  if (!snapshot.remote) return `Claude Usage: ${snapshot.auth.message}`;
  const bars = [snapshot.remote.session, snapshot.remote.weekly, ...snapshot.remote.models]
    .filter(Boolean)
    .map((bar) => `${bar.label}: ${Math.round(bar.percent)}%`)
    .join(" | ");
  const cost = snapshot.localUsage.today.costUSD;
  const today = `Today: ${Math.round(snapshot.localUsage.today.tokens)} tokens${cost === null ? "" : `, $${cost.toFixed(2)}`}`;
  return `${snapshot.remote.plan} | ${bars}\n${today}`;
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
  console.log(`Claude Usage listening on http://127.0.0.1:${port}`);
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
