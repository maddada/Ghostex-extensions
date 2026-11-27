// "Shut down emulators when a project is done": the setting, and what a shutdown means for each device kind.
// The setting lives in the data dir (not the view's localStorage) because the agent CLI and the server both read it.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stopAvd } from "./android.mjs";
import { shutdownSim } from "./ios.mjs";

const file = (dataDir) => join(dataDir, "settings.json");

export async function getSettings(dataDir) {
  return { shutdownIdle: true, ...JSON.parse(await readFile(file(dataDir), "utf8").catch(() => "{}")) };
}

export async function saveSettings(dataDir, { shutdownIdle }) {
  if (typeof shutdownIdle !== "boolean") throw new Error("shutdownIdle must be true or false");
  const next = { ...(await getSettings(dataDir)), shutdownIdle };
  await mkdir(dataDir, { recursive: true });
  await writeFile(file(dataDir), JSON.stringify(next));
  return next;
}

/** Android emulators (`emulator-5554`) and iOS Simulators (a UUID) only. Real phones, USB or Wi-Fi, are never touched. */
export async function shutdownDevice(id) {
  if (/^emulator-\d+$/.test(id)) return stopAvd(id);
  if (/^[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}$/i.test(id)) return shutdownSim(id);
}

/** `shutdownDevice` when the setting is on, else undefined (what `release` takes). */
export async function shutdownIfOn(dataDir) {
  return (await getSettings(dataDir)).shutdownIdle ? shutdownDevice : undefined;
}
