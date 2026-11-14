// Workbench's server. Ghostex starts it while Workbench is on and gives it GHOSTEX_API_URL and
// GHOSTEX_API_TOKEN, which reach the extension API (/api/ext/v1) for Workbench only.
//
// - The map: this computer's projects, grouped by the folder they sit in (~/dev/products/app is
//   in "Products"). Ghostex fills in each project's name and live status, and a click opens it.
// - Today: an editable checklist. Ghostex applies the user's ticks, adds, renames and deletes
//   itself; this server only counts what is done for the progress bar.
// - Refresh: an extension action. Ghostex posts it to /ghostex/panel-action on this server (and
//   to the event stream); either is enough, this server uses the post.
import { createServer } from "node:http";
import { homedir } from "node:os";
import { basename, dirname } from "node:path";

const port = Number.parseInt(process.argv[2] ?? "", 10);
if (!Number.isInteger(port) || port < 1) {
  throw new Error("Ghostex must supply a valid {port} argument");
}
const api = `${process.env.GHOSTEX_API_URL}/api/ext/v1`;
const token = process.env.GHOSTEX_API_TOKEN;
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };

async function call(method, route, body) {
  const response = await fetch(`${api}/${route}`, { method, headers, body: body && JSON.stringify(body) });
  const answer = await response.json();
  if (!answer.ok) throw new Error(`${method} ${route}: ${answer.message}`);
  return answer;
}

/** "products" for ~/dev/products/app; the projects right in the home folder are "Home". */
function groupName(path) {
  if (!path) return "Other";
  const parent = dirname(path);
  if (parent === homedir() || parent === "/") return "Home";
  const name = basename(parent).replace(/[-_]+/g, " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function mapBlock(projects) {
  const groups = new Map();
  for (const project of projects) {
    const name = groupName(project.path);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push({ project: project.projectId });
  }
  return {
    id: "projects",
    type: "map",
    tab: "map",
    root: { title: "Projects", subtitle: `${projects.length} on this computer`, icon: "code" },
    groups: [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, 40)
      .map(([title, items]) => ({ title, icon: "folder", items: items.slice(0, 50) })),
  };
}

async function showProjects() {
  const { projects } = await call("GET", "projects");
  const blocks = projects.length
    ? [mapBlock(projects)]
    : [{ id: "projects", type: "empty", tab: "map", title: "No projects yet", subtitle: "Add a project in Ghostex and it shows here.", icon: "folder" }];
  await call("PATCH", "panel", { blocks });
  await call("PATCH", "panel?surface=sidePanel", { blocks });
}

/** Keeps the progress bar in step with Today. */
async function countToday(surface) {
  const query = surface === "sidePanel" ? "?surface=sidePanel" : "";
  const { document } = await call("GET", `panel${query}`);
  const today = document.blocks.find((block) => block.id === "today");
  if (!today) return;
  const done = today.items.filter((item) => item.done).length;
  const week = {
    id: "week",
    type: "progress",
    tab: "focus",
    title: "Today's progress",
    value: done,
    max: Math.max(today.items.length, 1),
    label: today.items.length ? `${done} of ${today.items.length} done` : "Nothing planned yet",
  };
  await call("PATCH", `panel${query}`, { blocks: [week] });
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
      if (event.type === "projectsChanged") await showProjects();
      if (event.type === "checklistEdited" && event.blockId === "today") await countToday(event.surface);
    }
  }
}

createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200).end();
    return;
  }
  // gxserver's copy of a tap on an extension action, signed with this extension's own token.
  if (request.method === "POST" && request.url === "/ghostex/panel-action") {
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401).end();
      return;
    }
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      response.writeHead(204).end();
      const event = JSON.parse(body || "{}");
      if (event.name === "refresh") showProjects().catch((error) => console.error(error.message));
    });
    return;
  }
  response.writeHead(404).end();
}).listen(port, "127.0.0.1", () => {
  showProjects().catch((error) => console.error(error.message));
  countToday("sidebar").catch(() => {});
  countToday("sidePanel").catch(() => {});
  const follow = () =>
    followEvents()
      .catch((error) => console.error(error.message))
      .finally(() => setTimeout(follow, 2000));
  follow();
});
