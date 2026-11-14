// A sidebar extension's server: Ghostex starts it while the extension is on and gives it
// GHOSTEX_API_URL and GHOSTEX_API_TOKEN, which reach the extension API (/api/ext/v1) for this
// extension only. It fills the "projects" block from /projects and refreshes it when projects
// change or the Refresh button is tapped. The Today checklist needs no code: Ghostex applies the
// user's ticks, adds, renames and deletes itself and tells this server (checklistEdited).
import { createServer } from "node:http";

const port = Number.parseInt(process.argv[2] ?? "", 10);
if (!Number.isInteger(port) || port < 1) {
  throw new Error("Ghostex must supply a valid {port} argument");
}
const api = `${process.env.GHOSTEX_API_URL}/api/ext/v1`;
const headers = { authorization: `Bearer ${process.env.GHOSTEX_API_TOKEN}`, "content-type": "application/json" };

async function call(method, route, body) {
  const response = await fetch(`${api}/${route}`, { method, headers, body: body && JSON.stringify(body) });
  const answer = await response.json();
  if (!answer.ok) throw new Error(`${method} ${route}: ${answer.message}`);
  return answer;
}

/** Replaces the projects block with a map of this computer's projects (needs projects.read). */
async function showProjects() {
  const { projects } = await call("GET", "projects");
  const block = {
    id: "projects",
    type: "map",
    tab: "map",
    root: { title: "Projects", subtitle: `${projects.length} on this computer`, icon: "code" },
    groups: [
      {
        title: "All projects",
        icon: "folder",
        // A project item gets its name, live status and menu from Ghostex, and a click opens it.
        items: projects.slice(0, 50).map((project) => ({ project: project.projectId })),
      },
    ],
  };
  await call("PATCH", "panel", { blocks: [block] });
}

/** Follows the extension's events (server-sent events) and reacts to them. */
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
      if (event.type === "panelAction" && event.name === "refresh") await showProjects();
      if (event.type === "checklistEdited") console.log("The user edited Today:", event.edit);
    }
  }
}

createServer((request, response) => {
  response.writeHead(request.url === "/health" ? 200 : 404).end();
}).listen(port, "127.0.0.1", () => {
  showProjects().catch((error) => console.error(error.message));
  // Reconnect when gxserver restarts.
  const follow = () =>
    followEvents()
      .catch((error) => console.error(error.message))
      .finally(() => setTimeout(follow, 2000));
  follow();
});
