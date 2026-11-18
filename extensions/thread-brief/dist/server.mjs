// Work items' server. Ghostex starts it while Work items is on and gives it GHOSTEX_API_URL and
// GHOSTEX_API_TOKEN (the extension API, /api/ext/v1, for this extension only).
//
// The work items themselves are Ghostex's: each ordinary session keeps its own with
// `ghostex work item …` (the work-items skill), in the same Work panel, dock rows and store as a
// coordinator's. This server only draws the Work sidebar list: every session with work items,
// its Topic, how many are open, and how many wait on you, from the sessions the extension API
// lists (each with its `work` in short), redrawn when Ghostex says sessions changed (a session's
// work changing counts). A click opens the session. A Ghostex too old to list `work` gets "Update
// Ghostex to use Work items".
//
// Before 0.3.0 this was Thread brief, which kept a brief per session in its own store and side
// panel. Ghostex converts those briefs into work items once when this version is installed and on
// (server/src/coordinators/brief_import.rs in Ghostex), and keeps the old file as
// briefs.converted.json.
import { createServer } from "node:http";

const port = Number.parseInt(process.argv[2] ?? "", 10);
if (!Number.isInteger(port) || port < 1) {
  throw new Error("Ghostex must supply a valid {port} argument");
}
const api = `${process.env.GHOSTEX_API_URL}/api/ext/v1`;
const token = process.env.GHOSTEX_API_TOKEN;
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
/** The list shows this many sessions before "N more". */
const SHOWN = 20;

async function call(method, route, body) {
  const response = await fetch(`${api}/${route}`, { method, headers, body: body && JSON.stringify(body) });
  const answer = await response.json().catch(() => ({}));
  if (!response.ok || answer.ok === false) {
    throw new Error(`${method} ${route}: ${answer.message ?? response.status}`);
  }
  return answer;
}

/** A Ghostex from before work items for any session lists sessions without `work`. */
const UPDATE_GHOSTEX = {
  schema: 1,
  blocks: [
    {
      id: "update",
      type: "empty",
      title: "Update Ghostex to use Work items",
      subtitle: "This Ghostex keeps no work items for ordinary sessions yet. Update it, and sessions show their work items here.",
      icon: "list-check",
    },
  ],
};

function workDocument(sessions) {
  if (sessions.length && sessions.every((session) => !("work" in session))) return UPDATE_GHOSTEX;
  const rows = sessions
    .filter((session) => session.role === "session" && session.work && (session.work.open > 0 || session.work.topic))
    .sort((left, right) => String(right.lastActiveAt).localeCompare(String(left.lastActiveAt)));
  if (!rows.length) {
    return {
      schema: 1,
      blocks: [
        {
          id: "none",
          type: "empty",
          title: "No work items yet",
          subtitle: "Sessions add theirs as they work. Open a session's Work panel from the Work button in the window's header.",
          icon: "list-check",
        },
      ],
    };
  }
  return {
    schema: 1,
    blocks: [
      {
        id: "work",
        type: "rows",
        title: "Sessions with work items",
        show: Math.min(SHOWN, rows.length),
        items: rows.map((session) => {
          const { topic, open, forYou: waiting } = session.work;
          const forYou = waiting ? ` ${waiting} for you.` : "";
          return {
            id: session.session.replace(/[^A-Za-z0-9_-]/g, "-"),
            session: session.session,
            subtitle: `${topic || "No topic yet."}${forYou}`.slice(0, 200),
            trailing: open ? `${open} open` : undefined,
          };
        }),
      },
    ],
  };
}

let drawn = "";
let timer;
/** Redraws the list a moment after something changed, once. */
function drawSoon() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const { sessions } = await call("GET", "sessions");
      const document = workDocument(sessions ?? []);
      const text = JSON.stringify(document);
      if (text === drawn) return;
      await call("PUT", "panel?surface=sidebar", { document });
      drawn = text;
    } catch (error) {
      console.error(error.message);
    }
  }, 500);
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
      if (JSON.parse(data.slice(6)).type === "sessionsChanged") drawSoon();
    }
  }
}

createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200).end();
    return;
  }
  response.writeHead(404).end();
}).listen(port, "127.0.0.1", () => {
  // Ghostex sends sessionsChanged when a session's work changes too, so nothing polls.
  drawSoon();
  const follow = () =>
    followEvents()
      .catch((error) => console.error(error.message))
      .finally(() => setTimeout(follow, 2000));
  follow();
});
