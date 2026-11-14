// Thread brief's server. Ghostex starts it while Thread brief is on and gives it GHOSTEX_API_URL,
// GHOSTEX_API_TOKEN (the extension API, /api/ext/v1, for Thread brief only) and
// GHOSTEX_EXTENSION_DATA_DIR (its own folder, kept across updates).
//
// One brief per thread, kept in briefs.json and drawn as that thread's side panel document:
// Objective, Status with how fresh it is, Refresh, Next up (five shown, the rest folded),
// Blocked (with what each waits on), Parked (each opens a new thread with it as the draft) and
// Done (folded, newest first).
//
// - The thread's agent keeps it current through the thread-brief skill:
//   `ghostex extensions message thread-brief read|update`. Ghostex posts those here with the
//   agent's own session attached, so an agent only ever reads or writes its own thread's brief.
// - The user's ticks, renames, adds and deletes in the panel are applied by Ghostex at once; this
//   server reads the panel back after each one, so the user's text wins over the agent's.
// - Turns are counted from the thread's activity (working, then not), for "Updated 2 turns ago".
// - Refresh asks the thread, in one short message, to update its brief.
// - A forked thread starts with a copy of its parent's brief, marked as copied.
import { createServer } from "node:http";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const port = Number.parseInt(process.argv[2] ?? "", 10);
if (!Number.isInteger(port) || port < 1) {
  throw new Error("Ghostex must supply a valid {port} argument");
}
const api = `${process.env.GHOSTEX_API_URL}/api/ext/v1`;
const token = process.env.GHOSTEX_API_TOKEN;
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
const dataDir = process.env.GHOSTEX_EXTENSION_DATA_DIR || join(process.cwd(), ".data");
mkdirSync(dataDir, { recursive: true });
const storePath = join(dataDir, "briefs.json");

// The issue's caps keep a brief scannable (maddada/ghostex#593, requirement 7).
const CAPS = { next: 10, done: 10, parked: 5, blocked: 10 };
const TEXT_MAX = 200;
const OBJECTIVE_MAX = 300;
const STALE_TURNS = 3;
const STATUSES = {
  working: { label: "Working", dot: "yellow" },
  waiting: { label: "Waiting on you", dot: "blue" },
  blocked: { label: "Blocked", dot: "red" },
  done: { label: "Done", dot: "green" },
};

// ---- the store --------------------------------------------------------------------------------

/** { briefs: { "<projectId>:<sessionId>": Brief }, activity: { ref: activity } } */
let store = { briefs: {}, activity: {} };
try {
  store = { briefs: {}, activity: {}, ...JSON.parse(readFileSync(storePath, "utf8")) };
} catch {
  // A first start: nothing kept yet.
}

function save() {
  const temporary = `${storePath}.tmp`;
  writeFileSync(temporary, JSON.stringify(store, null, 2));
  renameSync(temporary, storePath);
}

let nextId = Date.now();
const newId = (prefix) => `${prefix}-${(nextId++).toString(36)}`;

async function call(method, route, body) {
  const response = await fetch(`${api}/${route}`, { method, headers, body: body && JSON.stringify(body) });
  const answer = await response.json().catch(() => ({}));
  if (!response.ok || answer.ok === false) {
    throw new Error(`${method} ${route}: ${answer.message ?? response.status}`);
  }
  return answer;
}

const panelRoute = (ref) => `panel?surface=sidePanel&session=${encodeURIComponent(ref)}`;

// ---- drawing ----------------------------------------------------------------------------------

function clock(iso) {
  const at = new Date(iso);
  return Number.isNaN(at.getTime())
    ? ""
    : at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function freshness(brief) {
  const turns = brief.turnsSinceUpdate ?? 0;
  const when = turns === 0 ? "this turn" : turns === 1 ? "1 turn ago" : `${turns} turns ago`;
  const by = brief.updatedBy === "user" ? "you" : "the agent";
  const text = `Updated by ${by} ${when}, at ${clock(brief.updatedAt)}`;
  return turns >= STALE_TURNS ? `Out of date. ${text}` : text;
}

function documentFor(ref, brief) {
  const projectId = ref.split(":")[0];
  const status = STATUSES[brief.status] ?? STATUSES.working;
  const stale = (brief.turnsSinceUpdate ?? 0) >= STALE_TURNS;
  const objective = [brief.objective || "No objective yet."];
  if (brief.previousObjective) objective.push("", `*Was: ${brief.previousObjective}*`);
  if (brief.forkedFrom) objective.push("", "*Copied from the thread this one was forked from.*");
  const blocks = [
    { id: "objective", type: "text", title: "Objective", text: objective.join("\n") },
    {
      id: "status",
      type: "rows",
      title: "Status",
      items: [{ id: "status", dot: stale ? "gray" : status.dot, title: status.label, subtitle: freshness(brief) }],
    },
    {
      id: "actions",
      type: "buttons",
      items: [
        {
          id: "refresh",
          title: stale ? "Refresh, it's out of date" : "Refresh",
          icon: "refresh",
          style: stale ? "primary" : "default",
          action: { extension: "refresh" },
        },
      ],
    },
    {
      id: "next",
      type: "checklist",
      title: "Next up",
      editable: true,
      show: 5,
      items: brief.next.map((item) => ({ id: item.id, text: item.text, done: false })),
    },
  ];
  if (brief.blocked.length) {
    blocks.push({
      id: "blocked",
      type: "rows",
      title: "Blocked",
      items: brief.blocked.map((item) => ({
        id: item.id,
        dot: "red",
        title: item.text,
        subtitle: item.waitingOn ? `Waits on ${item.waitingOn}` : undefined,
      })),
    });
  }
  if (brief.parked.length) {
    blocks.push({
      id: "parked",
      type: "rows",
      title: "Parked",
      items: brief.parked.map((item) => ({
        id: item.id,
        icon: "message-plus",
        title: item.text,
        trailing: "Make a thread",
        action: { newAgent: { project: projectId, draft: item.text } },
      })),
    });
  }
  if (brief.done.length) {
    blocks.push({
      id: "done",
      type: "checklist",
      title: "Done",
      editable: true,
      folded: true,
      items: brief.done.map((item) => ({ id: item.id, text: item.text, done: true })),
    });
  }
  return { schema: 1, blocks };
}

async function draw(ref) {
  const brief = store.briefs[ref];
  if (!brief) return;
  await call("PUT", panelRoute(ref), { document: documentFor(ref, brief) });
}

// ---- the user's edits -------------------------------------------------------------------------

/** Reads the thread's panel back after a tick, rename, add or delete, so the user's edits win. */
async function takeUserEdits(ref) {
  const brief = store.briefs[ref];
  if (!brief) return;
  const { document } = await call("GET", panelRoute(ref));
  const lists = document.blocks.filter((block) => block.type === "checklist");
  const items = lists.flatMap((block) => block.items ?? []);
  const known = new Map([...brief.next, ...brief.done].map((item) => [item.id, item]));
  const next = [];
  const done = [];
  for (const item of items) {
    const before = known.get(item.id);
    const kept = {
      ...(before ?? { id: item.id, source: "user" }),
      text: item.text,
      ...(before && before.text !== item.text ? { userEdited: true } : {}),
    };
    if (item.done) done.push({ ...kept, doneAt: before?.doneAt ?? new Date().toISOString() });
    else next.push({ ...kept, doneAt: undefined });
  }
  done.sort((left, right) => String(right.doneAt).localeCompare(String(left.doneAt)));
  brief.next = next;
  brief.done = done.slice(0, CAPS.done);
  brief.revision += 1;
  brief.updatedBy = "user";
  brief.updatedAt = new Date().toISOString();
  save();
  await draw(ref);
}

// ---- the agent's messages ---------------------------------------------------------------------

function publicBrief(ref, brief) {
  if (!brief) {
    return {
      session: ref,
      revision: 0,
      exists: false,
      note: "No brief yet. Draft one from the thread's first message and send it with update.",
    };
  }
  const item = ({ id, text, source, userEdited, evidence, waitingOn }) => ({
    id,
    text,
    ...(source ? { source } : {}),
    ...(userEdited ? { userEdited } : {}),
    ...(evidence ? { evidence } : {}),
    ...(waitingOn ? { waitingOn } : {}),
  });
  return {
    session: ref,
    exists: true,
    revision: brief.revision,
    objective: brief.objective,
    status: brief.status,
    next: brief.next.map(item),
    done: brief.done.map(item),
    blocked: brief.blocked.map(item),
    parked: brief.parked.map(item),
    updatedAt: brief.updatedAt,
    updatedBy: brief.updatedBy,
    turnsSinceUpdate: brief.turnsSinceUpdate ?? 0,
    caps: CAPS,
  };
}

class Refusal extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function cleanText(value, max, what) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!text) throw new Refusal(400, `${what} needs text.`);
  if (text.length > max) throw new Refusal(400, `${what} is longer than ${max} characters: shorten it.`);
  return text;
}

/**
 * The agent's list, merged with what is there: an item the agent sends back with its `id` keeps
 * that id, and an item the user wrote or renamed keeps the user's text. Returns the list and the
 * ids whose user text was kept.
 */
function mergeList(previous, incoming, cap, what, kept) {
  if (incoming === undefined) return previous;
  if (!Array.isArray(incoming)) throw new Refusal(400, `${what} is a list.`);
  if (incoming.length > cap) throw new Refusal(400, `${what} holds at most ${cap} items: keep the ones that matter.`);
  const byId = new Map(previous.map((item) => [item.id, item]));
  return incoming.map((entry, index) => {
    const value = typeof entry === "string" ? { text: entry } : entry ?? {};
    const before = value.id ? byId.get(value.id) : undefined;
    const text = cleanText(value.text, TEXT_MAX, `${what} item ${index + 1}`);
    if (before?.userEdited && before.text !== text) {
      kept.push(before.id);
      return before;
    }
    return {
      id: before?.id ?? newId(what),
      text,
      source: before?.source ?? "agent",
      ...(before?.userEdited ? { userEdited: true } : {}),
      ...(typeof value.evidence === "string" ? { evidence: value.evidence.slice(0, TEXT_MAX) } : {}),
      ...(what === "blocked" && typeof value.waitingOn === "string"
        ? { waitingOn: value.waitingOn.trim().slice(0, TEXT_MAX) }
        : {}),
      ...(what === "done" ? { doneAt: before?.doneAt ?? new Date().toISOString() } : {}),
    };
  });
}

async function update(ref, data) {
  const brief = store.briefs[ref];
  const revision = Number(data?.revision ?? -1);
  // The agent rereads before it writes: a brief that moved on (the user edited it) is refused.
  if ((brief?.revision ?? 0) !== revision) {
    throw new Refusal(
      409,
      `The brief changed since you read it (now at revision ${brief?.revision ?? 0}). Read it again, keep the user's changes, and send your update with that revision.`,
    );
  }
  const kept = [];
  const next = {
    objective: brief?.objective ?? "",
    previousObjective: brief?.previousObjective,
    status: brief?.status ?? "working",
    next: brief?.next ?? [],
    done: brief?.done ?? [],
    blocked: brief?.blocked ?? [],
    parked: brief?.parked ?? [],
    forkedFrom: brief?.forkedFrom,
  };
  if (data.objective !== undefined) {
    const objective = cleanText(data.objective, OBJECTIVE_MAX, "objective");
    if (next.objective && objective !== next.objective) next.previousObjective = next.objective;
    next.objective = objective;
  }
  if (data.status !== undefined) {
    if (!STATUSES[data.status]) throw new Refusal(400, "status is working, waiting, blocked or done.");
    next.status = data.status;
  }
  next.next = mergeList(next.next, data.next, CAPS.next, "next", kept);
  next.done = mergeList(next.done, data.done, CAPS.done, "done", kept);
  next.blocked = mergeList(next.blocked, data.blocked, CAPS.blocked, "blocked", kept);
  next.parked = mergeList(next.parked, data.parked, CAPS.parked, "parked", kept);
  if (!next.objective) throw new Refusal(400, "A new brief needs its objective: one sentence on what this thread is for.");
  store.briefs[ref] = {
    ...next,
    revision: (brief?.revision ?? 0) + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: "agent",
    turnsSinceUpdate: 0,
    // Written during a turn: that turn's end doesn't make the brief a turn old.
    updatedThisTurn: store.activity[ref] === "working",
  };
  save();
  await draw(ref);
  return {
    saved: true,
    revision: store.briefs[ref].revision,
    ...(kept.length ? { keptUserText: kept, note: "The user changed these items; their text was kept." } : {}),
  };
}

async function agentMessage(event) {
  const ref = event.session;
  if (event.name === "read") return publicBrief(ref, store.briefs[ref]);
  if (event.name === "update") return update(ref, event.data ?? {});
  throw new Refusal(400, `Unknown message ${event.name}: send read or update.`);
}

// ---- turns, forks and Refresh -----------------------------------------------------------------

/** A turn ends when the thread stops working; each one ages its brief. */
async function noteActivity() {
  const { sessions } = await call("GET", "sessions");
  let changed = false;
  for (const session of sessions) {
    const ref = session.session;
    const was = store.activity[ref];
    const now = session.activity ?? "";
    if (was === now) continue;
    store.activity[ref] = now;
    changed = true;
    const brief = store.briefs[ref];
    if (brief && was === "working" && now !== "working") {
      if (brief.updatedThisTurn) brief.updatedThisTurn = false;
      else {
        brief.turnsSinceUpdate = (brief.turnsSinceUpdate ?? 0) + 1;
        await draw(ref).catch((error) => console.error(error.message));
      }
    }
    // A fork starts with its parent's brief, marked as copied.
    const parent = session.forkedFrom;
    if (parent && !store.briefs[ref] && store.briefs[parent]) {
      store.briefs[ref] = { ...structuredClone(store.briefs[parent]), forkedFrom: parent, revision: 1, turnsSinceUpdate: 0 };
      await draw(ref).catch((error) => console.error(error.message));
    }
  }
  if (changed) save();
}

const REFRESH = "Please update your thread brief with the thread-brief skill: read it, then send what changed.";
const DRAFT = "Please write your thread brief with the thread-brief skill, starting from my first message in this thread.";

async function refresh(ref) {
  await call("POST", "sessionMessage", { session: ref, text: store.briefs[ref] ? REFRESH : DRAFT });
}

async function followEvents() {
  const response = await fetch(`${api}/events`, { headers });
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let end;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const data = buffer
        .slice(0, end)
        .split("\n")
        .find((line) => line.startsWith("data: "));
      buffer = buffer.slice(end + 2);
      if (!data) continue;
      const event = JSON.parse(data.slice(6));
      if (event.type === "sessionsChanged") await noteActivity().catch((error) => console.error(error.message));
      if (event.type === "checklistEdited" && event.session) {
        await takeUserEdits(event.session).catch((error) => console.error(error.message));
      }
    }
  }
}

// ---- the server -------------------------------------------------------------------------------

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(body));
  });
}

function reply(response, status, value) {
  response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(value));
}

createServer(async (request, response) => {
  if (request.url === "/health") {
    response.writeHead(200).end();
    return;
  }
  // Only Ghostex, with this extension's own token, posts here.
  if (request.method === "POST" && request.headers.authorization !== `Bearer ${token}`) {
    response.writeHead(401).end();
    return;
  }
  if (request.method === "POST" && request.url === "/ghostex/agent-message") {
    try {
      reply(response, 200, await agentMessage(JSON.parse((await readBody(request)) || "{}")));
    } catch (error) {
      reply(response, error.status ?? 500, { ok: false, message: error.message });
    }
    return;
  }
  // A tap on a panel's extension action (Refresh, Ask for a brief).
  if (request.method === "POST" && request.url === "/ghostex/panel-action") {
    const event = JSON.parse((await readBody(request)) || "{}");
    response.writeHead(204).end();
    if (event.name === "refresh" && event.session) {
      refresh(event.session).catch((error) => console.error(error.message));
    }
    return;
  }
  response.writeHead(404).end();
}).listen(port, "127.0.0.1", () => {
  // Redraw every kept brief: the panel store and this store agree after a restart or an update.
  for (const ref of Object.keys(store.briefs)) draw(ref).catch(() => {});
  noteActivity().catch(() => {});
  const follow = () =>
    followEvents()
      .catch((error) => console.error(error.message))
      .finally(() => setTimeout(follow, 2000));
  follow();
});
