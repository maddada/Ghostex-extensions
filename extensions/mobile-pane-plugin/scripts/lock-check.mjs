// node scripts/lock-check.mjs: the device lock's rules, against a temp data dir. Exits non-zero on failure.
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquire, holders, release, sweep } from "../src/device-lock.mjs";

const dir = await mkdtemp(join(tmpdir(), "lock-check-"));
const A = { id: "/repo/a", name: "a" }, A2 = { ...A, session: "other-agent" }, B = { id: "/repo/b", name: "b" };
const fast = { poll: 20 };

// same project shares the lock, any agent of it
assert.equal(await acquire(dir, "emulator-5554", A, fast), true);
assert.equal(await acquire(dir, "emulator-5554", A2, fast), true);
assert.deepEqual(Object.keys(await holders(dir)), ["emulator-5554"]);
assert.equal((await holders(dir))["emulator-5554"].project, "a");

// another project waits (and is told who), then gets the device once the owner releases
let told = null;
const waiting = acquire(dir, "emulator-5554", B, { ...fast, onWait: (l) => (told = l.project.name) });
await new Promise((r) => setTimeout(r, 100));
assert.equal(told, "a");
assert.deepEqual(await release(dir, B, "emulator-5554"), []); // a non-owner cannot release
assert.deepEqual(await release(dir, A), ["emulator-5554"]);
assert.equal(await waiting, true);
assert.equal((await holders(dir))["emulator-5554"].project, "b");

// a stale lock is taken over
const path = join(dir, "locks", "emulator-5554.json");
const lock = JSON.parse(await readFile(path, "utf8"));
await writeFile(path, JSON.stringify({ ...lock, project: B, used: Date.now() - 4 * 60 * 1000 }));
assert.deepEqual(await holders(dir), {}); // stale locks are not shown
assert.equal(await acquire(dir, "emulator-5554", A, fast), true);
assert.equal((await holders(dir))["emulator-5554"].project, "a");

// a busy device times out with the documented error
await assert.rejects(acquire(dir, "emulator-5554", B, { ...fast, wait: 0.1 }), /^Error: device emulator-5554 is busy: in use by project a since \d{4}-/);

// a cancelled wait gives up quietly
assert.equal(await acquire(dir, "emulator-5554", B, { ...fast, cancelled: () => true }), false);

// two different devices do not interfere
assert.equal(await acquire(dir, "192.168.1.20:37123", B, fast), true);

// ---- shutdown when a project is done (the real stop calls are stubbed) ----------------------------
const down = [];
const stub = async (id) => void down.push(id);
const lockPath = (id) => join(dir, "locks", `${id}.json`);
const age = async (id, ms) => writeFile(lockPath(id), JSON.stringify({ ...JSON.parse(await readFile(lockPath(id), "utf8")), used: Date.now() - ms }));

// release with nobody waiting → shutdown
await release(dir, A); // clear the leftovers above
await release(dir, B);
assert.equal(await acquire(dir, "emulator-5554", A, fast), true);
assert.deepEqual(await release(dir, A, "emulator-5554", stub), ["emulator-5554"]);
assert.deepEqual(down.splice(0), ["emulator-5554"]);

// release while another project waits → no shutdown, the waiter takes the device
assert.equal(await acquire(dir, "emulator-5554", A, fast), true);
const next = acquire(dir, "emulator-5554", B, fast);
await new Promise((r) => setTimeout(r, 100));
await release(dir, A, "emulator-5554", stub);
assert.equal(await next, true);
assert.deepEqual(down.splice(0), []);
assert.equal((await holders(dir))["emulator-5554"].project, "b");

// the waiter's marker is gone once it holds the device, so B's own release shuts down
await release(dir, B, "emulator-5554", stub);
assert.deepEqual(down.splice(0), ["emulator-5554"]);

// a real phone is released like any device; the stub sees the id and decides (idle-shutdown.mjs ignores it)
const { shutdownDevice } = await import("../src/idle-shutdown.mjs");
for (const id of ["192.168.1.20:37123", "adb-R5CT123-abc._adb-tls-connect._tcp", "R5CT123ABC"]) assert.equal(await shutdownDevice(id), undefined);

// a stale lock: the sweep shuts the device down once and clears the lock
assert.equal(await acquire(dir, "emulator-5556", A, fast), true);
await age("emulator-5556", 4 * 60 * 1000);
await sweep(dir, stub, (id) => id === "emulator-5558"); // skip() names a device a Run job still uses
assert.deepEqual(down.splice(0), ["emulator-5556"]);
await sweep(dir, stub);
assert.deepEqual(down.splice(0), []); // nothing left to do

// a fresh lock, a skipped device and a waiter all keep a stale device running
assert.equal(await acquire(dir, "emulator-5556", A, fast), true);
await sweep(dir, stub);
assert.deepEqual(down.splice(0), []); // fresh
await age("emulator-5556", 4 * 60 * 1000);
await sweep(dir, stub, (id) => id === "emulator-5556");
assert.deepEqual(down.splice(0), []); // skipped (running job)
await writeFile(join(dir, "locks", "emulator-5556.wait.1.x"), ""); // a waiter marker
await sweep(dir, stub);
assert.deepEqual(down.splice(0), []); // waiter
assert.equal((await readdir(join(dir, "locks"))).includes("emulator-5556.json"), false); // the lock is freed for the waiter

console.log("lock-check: ok");
