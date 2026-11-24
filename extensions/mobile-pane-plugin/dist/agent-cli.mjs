#!/usr/bin/env node
// Agent CLI: node agent-cli.mjs <action> ['<json>']  → prints one JSON answer, exit 1 on error.
// Runs the actions in the caller's process, so it works whether or not the Mobile Pane view is open.
// (`ghostex extensions message` only reaches sidebar extensions; Mobile Pane is a view.)
import { homedir } from "node:os";
import { join } from "node:path";
import { ACTIONS, HELP } from "./agent-actions.mjs";

const DATA_DIR = process.env.GHOSTEX_EXTENSION_DATA_DIR || join(homedir(), ".local/share/ghostex/extensions/data/mobile-pane-plugin");
const [name = "help", raw = "{}"] = process.argv.slice(2);
try {
  if (name === "help" || !ACTIONS[name]) {
    console.log(JSON.stringify({ usage: "node agent-cli.mjs <action> '<json>'", actions: HELP, ...(name !== "help" ? { error: `unknown action ${name}` } : {}) }, null, 2));
    process.exit(name === "help" ? 0 : 1);
  }
  console.log(JSON.stringify(await ACTIONS[name](JSON.parse(raw), DATA_DIR), null, 2));
  process.exit(0);
} catch (error) {
  console.log(JSON.stringify({ error: error.message }));
  process.exit(1);
}
