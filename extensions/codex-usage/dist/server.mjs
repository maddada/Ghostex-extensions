import { readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";

const POLL_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 12_000;
const REFRESH_WINDOW_MS = 5 * 60_000;
const SESSION_WINDOW_SECONDS = 18_000;
const WEEKLY_WINDOW_SECONDS = 604_800;
const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const RESET_CREDITS_URL = "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits";
const REFRESH_URL = "https://auth.openai.com/oauth/token";
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const DAY_MS = 86_400_000;
// OpenUsage defines this window as today plus the previous 30 calendar days.
const LOCAL_USAGE_DAYS = 31;
const CREDIT_USD_RATE = 0.04;
const EMPTY_LOCAL_USAGE = {
  dailyTokens: [],
  thirtyDays: { costUSD: null, tokens: 0 },
  today: { costUSD: null, tokens: 0 },
  yesterday: { costUSD: null, tokens: 0 },
};

// USD per million tokens. This is the Codex-relevant subset of the MIT-licensed
// OpenUsage pricing snapshots and supplement recorded in THIRD_PARTY_NOTICES.md.
const MODEL_RATES = {
  "gpt-5": { cacheRead: 0.125, input: 1.25, output: 10, fast: 2 },
  "gpt-5-mini": { cacheRead: 0.025, input: 0.25, output: 2, fast: 2 },
  "gpt-5.1-codex": { cacheRead: 0.125, input: 1.25, output: 10, fast: 2 },
  "gpt-5.1-codex-max": { cacheRead: 0.125, input: 1.25, output: 10, fast: 2 },
  "gpt-5.1-codex-mini": { cacheRead: 0.025, input: 0.25, output: 2, fast: 2 },
  "gpt-5.2": { cacheRead: 0.175, input: 1.75, output: 14, fast: 2 },
  "gpt-5.2-codex": { cacheRead: 0.175, input: 1.75, output: 14, fast: 2 },
  "gpt-5.3-codex": { cacheRead: 0.175, input: 1.75, output: 14, fast: 2 },
  "gpt-5.3-codex-spark": { cacheRead: 0.175, input: 1.75, output: 14, fast: 2 },
  "gpt-5.4": { cacheRead: 0.25, input: 2.5, output: 15, fast: 2, long: [0.5, 5, 22.5] },
  "gpt-5.4-mini": { cacheRead: 0.075, input: 0.75, output: 4.5, fast: 2 },
  "gpt-5.4-nano": { cacheRead: 0.02, input: 0.2, output: 1.25, fast: 2 },
  "gpt-5.5": { cacheRead: 0.5, input: 5, output: 30, fast: 2.5, long: [1, 10, 45] },
  "gpt-5.6-sol": { cacheRead: 0.5, input: 5, output: 30, fast: 2, long: [1, 10, 45] },
  "gpt-5.6-terra": { cacheRead: 0.2, input: 2, output: 12, fast: 2, long: [0.4, 4, 18] },
  "gpt-5.6-luna": { cacheRead: 0.02, input: 0.2, output: 1.2, fast: 2, long: [0.04, 0.4, 1.8] },
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

function classifyWindows(rateLimit, headers = new Headers(), labels = ["5-hour", "Weekly"]) {
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
      ? {
          label,
          percent: candidate.percent,
          periodSeconds: numeric(candidate.window?.limit_window_seconds),
          resetsAt: resetTime(candidate.window),
        }
      : null;
  };
  return { session: pick("session", labels[0]), weekly: pick("weekly", labels[1]) };
}

function mapResetCredits(usagePayload, resetPayload) {
  const dedicatedCount = numeric(resetPayload?.available_count);
  const source = dedicatedCount === null ? usagePayload?.rate_limit_reset_credits : resetPayload;
  const availableCount = numeric(source?.available_count);
  if (availableCount === null || availableCount < 0) return null;
  const expiries = Array.isArray(source?.credits)
    ? source.credits
        .filter((credit) => !credit?.status || credit.status === "available")
        .map((credit) => {
          const seconds = numeric(credit?.expires_at);
          if (seconds !== null) return new Date(seconds * 1_000).toISOString();
          const parsed = Date.parse(credit?.expires_at);
          return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
        })
        .filter(Boolean)
        .sort()
    : [];
  return { count: Math.floor(availableCount), expiries };
}

function mapCredits(payload, headers) {
  let remaining = numeric(payload?.credits?.balance);
  if (remaining === null && payload?.credits?.has_credits === false) remaining = 0;
  if (remaining === null) remaining = numeric(headers.get("x-codex-credits-balance"));
  if (remaining === null) return null;
  const count = Math.max(0, Math.floor(remaining));
  return { count, usd: count * CREDIT_USD_RATE };
}

function mapUsageResponse(payload, headers, resetPayload) {
  const core = classifyWindows(payload?.rate_limit, headers);
  const sparkEntry = Array.isArray(payload?.additional_rate_limits)
    ? payload.additional_rate_limits.find((entry) =>
        [entry?.limit_name, entry?.metered_feature]
          .filter((value) => typeof value === "string")
          .some((value) => value.toLowerCase().includes("spark")),
      )
    : null;
  const spark = classifyWindows(sparkEntry?.rate_limit, new Headers(), ["Spark", "Spark Weekly"]);
  return {
    credits: mapCredits(payload, headers),
    plan: formatPlan(payload?.plan_type),
    resetCredits: mapResetCredits(payload, resetPayload),
    session: core.session,
    spark: spark.session,
    sparkWeekly: spark.weekly,
    weekly: core.weekly,
  };
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
  let resetPayload = null;
  try {
    const resetResponse = await fetchWithTimeout(RESET_CREDITS_URL, {
      headers: {
        ...headers,
        "OpenAI-Beta": "codex-1",
        originator: "Codex Desktop",
      },
    });
    if (resetResponse.ok) resetPayload = await resetResponse.json();
  } catch {
    // Reset-credit expiries are supplementary; the usage response still carries the balance.
  }
  return mapUsageResponse(payload, response.headers, resetPayload);
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

function startOfLocalDay(time = Date.now()) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function localDayKey(time) {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function codexHomes() {
  const configured = process.env.CODEX_HOME?.trim();
  return configured
    ? configured.split(",").map((value) => value.trim()).filter(Boolean)
    : [join(homedir(), ".codex")];
}

async function discoverJsonlFiles(directory, files = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await discoverJsonlFiles(path, files);
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(path);
  }
  return files;
}

async function discoverCodexLogs() {
  const files = [];
  const seen = new Set();
  for (const home of codexHomes()) {
    let foundSource = false;
    for (const name of ["sessions", "archived_sessions"]) {
      const source = join(home, name);
      const discovered = await discoverJsonlFiles(source);
      if (discovered.length > 0) foundSource = true;
      for (const path of discovered) {
        if (seen.has(path)) continue;
        seen.add(path);
        files.push(path);
      }
    }
    if (!foundSource) {
      for (const path of await discoverJsonlFiles(home)) {
        if (seen.has(path)) continue;
        seen.add(path);
        files.push(path);
      }
    }
  }
  return files;
}

function numberToken(json, keys) {
  for (const key of keys) {
    const value = numeric(json?.[key]);
    if (value !== null) return Math.max(0, Math.floor(value));
  }
  return 0;
}

function rawUsage(json) {
  const input = numberToken(json, ["input_tokens", "prompt_tokens", "input"]);
  const cached = numberToken(json, ["cached_input_tokens", "cache_read_input_tokens", "cached_tokens"]);
  const output = numberToken(json, ["output_tokens", "completion_tokens", "output"]);
  const reasoning = numberToken(json, ["reasoning_output_tokens", "reasoning_tokens"]);
  const reported = numberToken(json, ["total_tokens"]);
  const recomputed = input + output + reasoning;
  return { cached, input, output, reasoning, total: reported > 0 || recomputed === 0 ? reported : recomputed };
}

function equalUsage(left, right) {
  return left.input === right.input && left.cached === right.cached && left.output === right.output &&
    left.reasoning === right.reasoning && left.total === right.total;
}

function subtractUsage(current, previous) {
  return {
    cached: Math.max(0, current.cached - (previous?.cached ?? 0)),
    input: Math.max(0, current.input - (previous?.input ?? 0)),
    output: Math.max(0, current.output - (previous?.output ?? 0)),
    reasoning: Math.max(0, current.reasoning - (previous?.reasoning ?? 0)),
    total: Math.max(0, current.total - (previous?.total ?? 0)),
  };
}

function modelName(json) {
  for (const value of [json?.model, json?.model_name, json?.metadata?.model]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function hasNonNullValue(value) {
  return value !== null && value !== undefined && (typeof value !== "string" || value.trim() !== "");
}

function childSession(payload) {
  return hasNonNullValue(payload?.forked_from_id) || hasNonNullValue(payload?.parent_thread_id) ||
    payload?.thread_source === "subagent" || hasNonNullValue(payload?.source?.subagent);
}

function autoReviewFallback(timestamp) {
  const date = timestamp.slice(0, 10);
  const releases = [
    ["2026-07-09", "gpt-5.6-luna"], ["2026-04-23", "gpt-5.5"],
    ["2026-03-05", "gpt-5.4"], ["2026-02-05", "gpt-5.3-codex"],
    ["2025-12-11", "gpt-5.2-codex"], ["2025-11-13", "gpt-5.1-codex"],
    ["2025-09-15", "gpt-5-codex"], ["2025-08-07", "gpt-5"],
  ];
  return releases.find(([released]) => date >= released)?.[1] ?? "gpt-5";
}

function parseCodexLog(text) {
  const events = [];
  let currentModel = null;
  let currentTierIsFast = false;
  let previousTotals = null;
  let replayGate = null;
  let sawSessionMeta = false;
  for (const line of text.split("\n")) {
    if (!line || (!line.includes('"token_count"') && !line.includes('"turn_context"') &&
      !line.includes('"session_meta"') && !line.includes('"task_started"') &&
      !line.includes('"thread_settings_applied"'))) continue;
    let object;
    try {
      object = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = object?.payload;
    if (object?.type === "turn_context") {
      currentModel = modelName(payload) ?? currentModel;
      continue;
    }
    if (object?.type === "session_meta" && !sawSessionMeta) {
      sawSessionMeta = true;
      if (childSession(payload)) {
        const created = Date.parse(object.timestamp);
        replayGate = Number.isFinite(created) ? { created: Math.floor(created / 1_000) } : { created: null };
      }
      continue;
    }
    if (object?.type !== "event_msg" || !payload) continue;
    if (payload.type === "thread_settings_applied") {
      const tier = payload.thread_settings?.service_tier ?? payload.service_tier;
      if (typeof tier === "string" && tier.trim()) {
        currentTierIsFast = tier === "fast" || tier === "priority";
      }
      continue;
    }
    if (payload.type === "task_started") {
      const startedAt = numeric(payload.started_at);
      const lineTime = Date.parse(object.timestamp) / 1_000;
      if (replayGate && startedAt !== null &&
        (replayGate.created === null ? startedAt >= Math.floor(lineTime) : startedAt >= replayGate.created)) {
        replayGate = null;
      }
      continue;
    }
    if (payload.type !== "token_count") continue;
    const timestamp = Date.parse(object.timestamp);
    if (!Number.isFinite(timestamp)) continue;
    const info = payload.info;
    const totals = info?.total_token_usage ? rawUsage(info.total_token_usage) : null;
    if (replayGate) {
      if (totals) previousTotals = totals;
      continue;
    }
    if (totals && previousTotals && equalUsage(totals, previousTotals)) continue;
    const usage = info?.last_token_usage ? rawUsage(info.last_token_usage) : totals ? subtractUsage(totals, previousTotals) : null;
    if (totals) previousTotals = totals;
    if (!usage || (usage.input <= 0 && usage.cached <= 0 && usage.output <= 0 && usage.reasoning <= 0)) continue;
    const parsedModel = modelName(payload) ?? modelName(info);
    if (parsedModel) currentModel = parsedModel;
    const model = parsedModel ?? currentModel ?? "gpt-5";
    if (!currentModel) currentModel = model;
    events.push({
      ...usage,
      cached: Math.min(usage.cached, usage.input),
      isFast: currentTierIsFast,
      model,
      pricingModel: model === "codex-auto-review" ? autoReviewFallback(object.timestamp) : null,
      timestamp,
    });
  }
  return events;
}

function canonicalModelName(value) {
  let model = value.toLowerCase().trim().replace(/-\d{4}-\d{2}-\d{2}$/, "").replace(/-\d{8}$/, "");
  const fastAlias = model.endsWith("-fast");
  if (fastAlias) model = model.slice(0, -5);
  model = model
    .replace(/^agent_review$/, "gpt-5.4")
    .replace(/^gpt-5\.(4|5)(?:-(?:none|low|medium|high|xhigh|extra-high))$/, "gpt-5.$1")
    .replace(/^(gpt-5\.6-(?:sol|terra|luna))(?:-(?:none|low|medium|high|xhigh|max|ultra))$/, "$1")
    .replace(/^(gpt-5\.[123]-codex(?:-max|-mini)?)(?:-(?:low|medium|high|xhigh))$/, "$1")
    .replace(/^gpt-5\.3-spark$/, "gpt-5.3-codex-spark")
    .replace(/^gpt-5\.3-codex-spark-preview(?:-(?:low|high|xhigh))?$/, "gpt-5.3-codex-spark");
  return { fastAlias, model };
}

function eventCost(event) {
  const canonical = canonicalModelName(event.pricingModel ?? event.model);
  const rates = MODEL_RATES[canonical.model];
  if (!rates) return null;
  const [cacheRead, input, output] = rates.long && event.input > 272_000
    ? rates.long
    : [rates.cacheRead, rates.input, rates.output];
  const multiplier = event.isFast || canonical.fastAlias ? rates.fast : 1;
  const nonCached = Math.max(0, event.input - event.cached);
  return ((nonCached * input + event.cached * cacheRead + event.output * output) / 1_000_000) * multiplier;
}

function summarizeCodexEvents(events) {
  const todayStart = startOfLocalDay();
  const cutoff = todayStart - (LOCAL_USAGE_DAYS - 1) * DAY_MS;
  const yesterdayStart = todayStart - DAY_MS;
  const buckets = new Map();
  const seen = new Set();
  for (const event of events) {
    if (event.timestamp < cutoff) continue;
    const key = [event.timestamp, event.model, event.pricingModel, event.input, event.cached,
      event.output, event.reasoning, event.total].join("\u0000");
    if (seen.has(key)) continue;
    seen.add(key);
    const costUSD = eventCost(event);
    if (costUSD === null) continue;
    const day = localDayKey(event.timestamp);
    const bucket = buckets.get(day) ?? { costUSD: 0, tokens: 0 };
    bucket.costUSD += costUSD;
    bucket.tokens += event.total;
    buckets.set(day, bucket);
  }
  const range = (start, end = Number.POSITIVE_INFINITY) => {
    let costUSD = 0;
    let tokens = 0;
    for (const [day, value] of buckets) {
      const time = new Date(`${day}T00:00:00`).getTime();
      if (time < start || time >= end) continue;
      costUSD += value.costUSD;
      tokens += value.tokens;
    }
    return { costUSD: tokens > 0 || costUSD > 0 ? costUSD : null, tokens };
  };
  const dailyTokens = [];
  for (let offset = LOCAL_USAGE_DAYS - 1; offset >= 0; offset -= 1) {
    const time = startOfLocalDay(todayStart - offset * DAY_MS);
    const value = buckets.get(localDayKey(time));
    dailyTokens.push({ date: localDayKey(time), tokens: value?.tokens ?? 0 });
  }
  return {
    dailyTokens,
    thirtyDays: range(cutoff),
    today: range(todayStart),
    yesterday: range(yesterdayStart, todayStart),
  };
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

class CodexLogScanner {
  constructor() {
    this.files = new Map();
  }

  async scan() {
    const cutoff = startOfLocalDay() - (LOCAL_USAGE_DAYS - 1) * DAY_MS;
    const paths = await discoverCodexLogs();
    const eligible = (await mapLimit(paths, 24, async (path) => {
      try {
        const fileStat = await stat(path);
        return fileStat.mtimeMs >= cutoff ? { fileStat, path } : null;
      } catch {
        return null;
      }
    })).filter(Boolean);
    const currentPaths = new Set(eligible.map((value) => value.path));
    for (const path of this.files.keys()) {
      if (!currentPaths.has(path)) this.files.delete(path);
    }
    await mapLimit(eligible, 8, async ({ fileStat, path }) => {
      const previous = this.files.get(path);
      if (previous?.size === fileStat.size && previous?.mtimeMs === fileStat.mtimeMs) return;
      try {
        this.files.set(path, {
          events: parseCodexLog(await readFile(path, "utf8")),
          mtimeMs: fileStat.mtimeMs,
          size: fileStat.size,
        });
      } catch {
        this.files.delete(path);
      }
    });
    return summarizeCodexEvents([...this.files.values()].flatMap((value) => value.events));
  }
}

function pageHtml() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Codex Usage</title>
<style>
:root{color-scheme:dark;font:13px/1.35 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#111;color:#f5f5f4}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 85% 0%,#1c2831 0,transparent 42%),#0e0e0e}main{min-height:100vh;padding:15px;display:flex;flex-direction:column;gap:10px}header{display:flex;align-items:center;gap:10px}.logo{width:32px;height:32px;display:grid;place-items:center;border:1px solid #343b40;border-radius:9px;background:#182027;color:#fcfcfc}.logo svg{width:22px;height:22px}h1{margin:0;font-size:14px;font-weight:650}.plan{color:#a8a29e;font-size:11px;margin-top:2px}#updated{margin-left:auto;color:#78716c;font-size:10px;text-align:right;white-space:nowrap}.card{border:1px solid #2a2d2f;border-radius:11px;background:rgba(28,29,30,.94);padding:13px;display:grid;gap:12px}#coreBars,#sparkBars{display:grid;gap:11px}.bar-head,.bar-foot{display:flex;justify-content:space-between;align-items:baseline}.bar-head{margin-bottom:5px}.bar-foot{margin-top:4px;color:#aaa6a2;font-size:10px}.bar-label{font-weight:620}.bar-meta{color:#ff6574;font-size:10px}.track{height:6px;overflow:hidden;border-radius:3px;background:#3a3d3f}.fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#92a8b5,#d7e2e8);transition:width .25s ease}.fill.warning{background:linear-gradient(90deg,#ff4056,#ff5969)}.trend{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:10px}.trend-label{font-weight:620}.trend-bars{height:32px;display:flex;align-items:flex-end;gap:2px}.trend-bars span{flex:1;min-width:2px;border-radius:2px 2px 0 0;background:#1997f3}.section-divider{height:1px;background:#303234}.metrics{display:grid;gap:8px}.metric{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.metric-label{font-weight:600}.metric-value{text-align:right;color:#dedbd8;font-variant-numeric:tabular-nums}.reset-dot{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:#1b9cf5}.notice{color:#fbbf24;font-size:11px;min-height:14px}footer{display:flex;align-items:center;gap:7px}a{flex:1;height:30px;display:grid;place-items:center;border:1px solid #393d40;border-radius:7px;color:#e7e5e4;text-decoration:none;background:#191b1c}a:hover{background:#24282a;border-color:#596168}
</style></head><body><main>
<header><div class="logo" aria-hidden="true"><svg viewBox="0 0 100 100"><path fill="currentColor" d="M83.8 42.8a20.2 20.2 0 0 0-23.4-26A20.2 20.2 0 0 0 26.1 24a20.2 20.2 0 0 0-10.8 33.3 20.2 20.2 0 0 0 23.4 26A20.2 20.2 0 0 0 72.9 76a20.2 20.2 0 0 0 10.9-33.2ZM53.7 84.8a15 15 0 0 1-9.6-3.4l16.4-9.5a2.6 2.6 0 0 0 1.3-2.3V47.2l6.8 3.9v18.8a15 15 0 0 1-14.9 15ZM21.5 71.1a15 15 0 0 1-1.8-10l16.4 9.4a2.6 2.6 0 0 0 2.6 0l19.5-11.2v7.8L42 76.6a15 15 0 0 1-20.5-5.5Zm-4.2-34.7a15 15 0 0 1 7.9-6.6v18.9a2.6 2.6 0 0 0 1.3 2.3l19.4 11.2-6.8 3.9-16.3-9.3a15 15 0 0 1-5.5-20.4Zm55.3 12.8L53.2 38l6.7-3.9 16.3 9.3A15 15 0 0 1 74 70.4V51.5a2.6 2.6 0 0 0-1.4-2.3Zm6.7-10-16.4-9.6a2.6 2.6 0 0 0-2.6 0L40.9 40.8V33l16.2-9.4a15 15 0 0 1 22.2 15.6ZM37.2 53l-6.7-3.9V30.3a15 15 0 0 1 24.4-11.5l-16.4 9.5a2.6 2.6 0 0 0-1.3 2.3V53Zm3.6-8 8.7-5 8.7 5v10.1l-8.7 5-8.7-5Z"/></svg></div><div><h1>Codex Usage</h1><div class="plan" id="plan">Checking Codex login…</div></div><div id="updated"></div></header>
<section class="card"><div id="coreBars"></div><div class="trend"><span class="trend-label">Usage Trend</span><div class="trend-bars" id="trend"></div></div><div class="section-divider"></div><div id="sparkBars"></div><div class="metrics"><div class="metric"><span class="metric-label">Extra Usage</span><span class="metric-value" id="credits">No data</span></div><div class="metric"><span class="metric-label">Rate Limit Resets</span><span class="metric-value" id="resets">No data</span></div><div class="metric"><span class="metric-label">Today</span><span class="metric-value" id="today">No data</span></div><div class="metric"><span class="metric-label">Yesterday</span><span class="metric-value" id="yesterday">No data</span></div><div class="metric"><span class="metric-label">Last 30 Days</span><span class="metric-value" id="thirtyDays">No data</span></div></div></section><div class="notice" id="notice"></div>
<footer><a href="https://status.openai.com/" target="_blank" rel="noopener noreferrer">Status</a><a href="https://chatgpt.com/codex/settings/usage" target="_blank" rel="noopener noreferrer">Dashboard</a></footer>
</main><script>
const byId=id=>document.getElementById(id),compact=new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1});function duration(ms){if(ms<=0)return'now';const hours=Math.floor(ms/36e5),days=Math.floor(hours/24);return days>0?days+'d '+hours%24+'h':hours>0?hours+'h '+Math.floor(ms%36e5/6e4)+'m':Math.max(1,Math.floor(ms/6e4))+'m'}function resetText(value){const ms=new Date(value).getTime()-Date.now();return value&&Number.isFinite(ms)?ms<=0?'resets now':'resets in '+duration(ms):'reset unavailable'}function paceWarning(bar){if(!bar?.resetsAt||!bar.periodSeconds||bar.percent<5)return'';const reset=new Date(bar.resetsAt).getTime(),period=bar.periodSeconds*1e3,elapsed=Date.now()-(reset-period);if(elapsed<Math.max(6e4,period*.01)||Date.now()>=reset)return'';const projected=bar.percent/elapsed*period;if(projected<=100)return'';const eta=(100-bar.percent)/(projected/period);return eta>0&&eta<reset-Date.now()?'🔥 Limit in '+duration(eta):''}function renderBars(hostId,values,labels){const host=byId(hostId);host.replaceChildren();values.forEach((bar,index)=>{const row=document.createElement('div'),head=document.createElement('div'),foot=document.createElement('div'),label=document.createElement('span'),meta=document.createElement('span'),used=document.createElement('span'),reset=document.createElement('span'),track=document.createElement('div'),fill=document.createElement('div'),warning=paceWarning(bar);head.className='bar-head';foot.className='bar-foot';label.className='bar-label';label.textContent=bar?.label||labels[index];meta.className='bar-meta';meta.textContent=warning;head.append(label,meta);track.className='track';fill.className='fill'+(warning?' warning':'');fill.style.width=(bar?.percent||0)+'%';track.append(fill);used.textContent=bar?Math.round(bar.percent)+'% used':'—';reset.textContent=bar?resetText(bar.resetsAt):'No data';foot.append(used,reset);row.append(head,track,foot);host.append(row)})}function renderTrend(points){const host=byId('trend'),values=(points||[]).map(point=>point.tokens),max=Math.max(1,...values);host.replaceChildren();for(const value of values){const bar=document.createElement('span');bar.style.height=Math.max(2,value/max*30)+'px';bar.title=compact.format(value)+' tokens';host.append(bar)}}function money(value){if(value===null||value===undefined)return null;if(value>=1000)return'$'+(value/1000).toFixed(1).replace(/\\.0$/,'')+'K';return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value)}function spend(value){if(!value||(!value.tokens&&value.costUSD===null))return'No data';const cost=money(value.costUSD);return(cost?cost+' · ':'')+compact.format(value.tokens)+' tokens'}function render(data){const remote=data.remote,local=data.localUsage||{};renderBars('coreBars',[remote?.session,remote?.weekly],['5-hour','Weekly']);renderBars('sparkBars',[remote?.spark,remote?.sparkWeekly],['Spark','Spark Weekly']);renderTrend(local.dailyTokens);byId('plan').textContent=remote?.plan||data.auth.message;byId('credits').textContent=remote?.credits?money(remote.credits.usd)+' · '+compact.format(remote.credits.count)+' credits':'No data';byId('resets').replaceChildren();if(remote?.resetCredits){const dot=document.createElement('span');dot.className='reset-dot';byId('resets').append(dot,document.createTextNode(compact.format(remote.resetCredits.count)+' available'))}else byId('resets').textContent='No data';byId('today').textContent=spend(local.today);byId('yesterday').textContent=spend(local.yesterday);byId('thirtyDays').textContent=spend(local.thirtyDays);byId('notice').textContent=data.auth.status==='ready'?'':data.auth.message;byId('updated').textContent=data.updatedAt?'Updated '+new Date(data.updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}async function refresh(){try{const response=await fetch('/api/usage',{cache:'no-store'});if(!response.ok)throw new Error();render(await response.json())}catch{byId('notice').textContent='Could not read the local usage service.'}}refresh();setInterval(refresh,5000);
</script></body></html>`;
}

const scanner = new CodexLogScanner();
let snapshot = {
  auth: { message: "Checking Codex login…", status: "loading" },
  localUsage: EMPTY_LOCAL_USAGE,
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
      localUsage: snapshot.localUsage,
      remote: null,
      updatedAt: new Date().toISOString(),
    };
    if (publishBadge) await postBadge([]).catch((error) => console.warn(error.message));
    return POLL_INTERVAL_MS;
  }
  if (credential.apiKeyOnly) {
    snapshot = {
      auth: { message: "Subscription usage is unavailable for API-key-only login.", status: "authMissing" },
      localUsage: snapshot.localUsage,
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
      localUsage: snapshot.localUsage,
      remote,
      updatedAt: new Date().toISOString(),
    };
    const usage = [remote.session, remote.weekly]
      .filter(Boolean)
      .map((bar) => Math.round(bar.percent));
    const badge = [
      usage.length > 0 ? `${usage.join("/")}%` : null,
      remote.resetCredits ? `${Math.floor(remote.resetCredits.count)}rs` : null,
    ].filter(Boolean);
    if (publishBadge) await postBadge(badge).catch((error) => console.warn(error.message));
    try {
      snapshot = { ...snapshot, localUsage: await scanner.scan(), updatedAt: new Date().toISOString() };
    } catch (error) {
      console.warn(`Codex log scan failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return POLL_INTERVAL_MS;
  } catch (error) {
    const rateLimited = error?.code === "rateLimited";
    snapshot = {
      auth: {
        message: error instanceof Error ? error.message : "Codex usage update failed.",
        status: rateLimited ? "rateLimited" : "error",
      },
      localUsage: snapshot.localUsage,
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
  const bars = [snapshot.remote.session, snapshot.remote.weekly, snapshot.remote.spark, snapshot.remote.sparkWeekly]
    .filter(Boolean)
    .map((bar) => `${bar.label}: ${Math.round(bar.percent)}%`)
    .join(" | ");
  const today = snapshot.localUsage.today;
  return `${snapshot.remote.plan} | ${bars}\nToday: ${Math.round(today.tokens)} tokens${today.costUSD === null ? "" : `, $${today.costUSD.toFixed(2)}`}`;
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
