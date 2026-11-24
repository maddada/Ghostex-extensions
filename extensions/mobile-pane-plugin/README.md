# Mobile Pane

A Ghostex view that mirrors and controls Android phones, Android emulators and iOS
Simulators: live screen in a device frame, touch, keyboard and input methods, clipboard both
ways, start and stop emulators and simulators, a latency bench, and a CLI plus skill so coding
agents can look at the screen and drive it.

Pick a device in the toolbar, or start one from **Devices**. The HUD shows fps, server → paint
latency (p50/p95) and bitrate. Android phones and emulators stream through scrcpy-server (H.264);
emulators started from **Devices** stream raw frames over the emulator's gRPC (smoother, about
60 fps); iOS Simulators stream through serve-sim.

| Do | How |
|---|---|
| Tap / drag | Click / drag on the screen |
| Scroll | Mouse wheel or trackpad |
| Type | Click the screen, then type; Enter, Backspace, arrows, Tab, Esc work |
| Paste | Cmd+V (puts the text on the device clipboard and pastes it) |
| Copy, cut, select all, undo | Cmd+C / X / A / Z on the device; what the device copies lands on the Mac clipboard |
| Pinch / rotate with two fingers | Option+drag (a second finger mirrors yours around the screen center) |
| Input methods | Japanese, Chinese, the emoji picker and dictation work while the screen has focus |
| Back (Android) | Right click, or ◁ |
| Home / Recents / Rotate | ○ / ▢ / ⟳ (iOS Home is a swipe up from the bottom edge, so it also leaves the App Switcher; Rotate on a phone with auto-rotate on locks the next orientation and turns auto-rotate off) |
| Device frame | **Frame** toggles our bezel. Streams never include an emulator skin or Simulator.app bezel (emulators run without a window and only the screen is captured), so every device gets the same style of frame: iPhone, iPad or Android. |
| Measure latency | **Bench**: opens a test page on the device (Chrome on Android via `adb reverse`, Safari on iOS) and taps it 20 times; the status line shows input → screen p50/p95. On a fresh emulator, dismiss Chrome's first-run screens once. |
| Start / stop an emulator or simulator | **Devices** in the toolbar. Emulators run without a window (`-no-window`) and keep running after the view closes; stop them from the same list. Their output goes to `$GHOSTEX_EXTENSION_DATA_DIR/emulator-<avd>.log`. |
A capability probe (WebCodecs, Worker, WebSocket, adb/emulator/simctl) is at `/probe.html`.

## For coding agents

The bundled `mobile-pane` skill tells agents how to use the CLI. It runs in the agent's own
process, so the view does not need to be open:

    node ~/.local/share/ghostex/extensions/installed/mobile-pane-plugin/dist/agent-cli.mjs help
    … screenshot '{"device":"iPhone 17"}'
    … ui '{"device":"emulator-5554"}'
    … tap '{"device":"emulator-5554","x":0.36,"y":0.26}'

Screenshots go to `~/.local/share/ghostex/extensions/data/mobile-pane-plugin/screenshots/`.
`ghostex extensions message` is not used: Ghostex only delivers it to sidebar extensions.

## Files

- `src/server.mjs`: HTTP + WebSocket server (`/devices`, `/video`, `/stats`, probe endpoints).
- `src/android.mjs`: adb discovery and the scrcpy-server v5.0.1 session.
  `node src/android.mjs [serial]` is a smoke check against a running device.
- `src/ws.mjs`: minimal WebSocket server.
- `src/public/index.html`, `src/public/viewer-worker.js`: the viewer.
- `src/agent-actions.mjs`, `src/agent-cli.mjs`: the agent actions and their CLI; `skill/SKILL.md`: the agent skill.
- `src/emulator-grpc.mjs`: emulator gRPC video (discovery file, minimal protobuf over `node:http2`).
- `src/ios.mjs`: simctl list/boot/shutdown, the serve-sim helper, avcC → Annex-B relay.
  `node src/ios.mjs` self-checks the Annex-B conversion.
- `src/public/control.js`: scrcpy control messages and serve-sim HID messages.
- `src/vendor/scrcpy-server-v5.0.1.jar`: from the official scrcpy v5.0.1 release
  (Apache-2.0), sha256 `764eb6f79811d5211fe9df341120882ba9994c7a61b897d7bf3fb662e53bc536`.

## Build

`dist/` is what Ghostex runs and is committed. `scripts/build.mjs` copies `src/`, adds the
pinned runtime packages (serve-sim's `dist`, `ws`) under `dist/vendor/node_modules/`, checks the
scrcpy-server SHA-256 and refuses symlinks (`.npmrc` turns off npm's bin symlinks, which Ghostex
refuses in local extensions):

    npm ci --ignore-scripts
    npm run build

Checks: `node src/android.mjs` (scrcpy smoke test against a running device) and
`node src/ios.mjs` (avcC → Annex-B self-check).

## Install locally

Settings > Extensions, or in your own terminal:

    ghostex extensions install-local /path/to/mobile-pane-plugin

After reinstalling, quit Ghostex (Cmd+Q) and reopen it if the view says the site
can't be reached.

## Requirements

- `node` on gxserver's PATH.
- Android SDK platform-tools (`adb`) under `ANDROID_HOME`, `ANDROID_SDK_ROOT` or
  `~/Library/Android/sdk`; the `emulator` package and at least one AVD for the
  Devices panel.
- iOS: an Apple Silicon Mac with Xcode (tested with Xcode 27.2, iOS 27.2 runtime).

## Permissions and what runs

No Ghostex bridge permissions. The command server is an unsandboxed Node process started
through `dist/start.sh` (which finds Node on PATH, or in nvm, Herd, fnm, Volta or Homebrew).
It listens on 127.0.0.1 only; WebSocket and POST requests must come from the extension's own
page (other origins get 403). It runs:

- `adb` (devices, `push` of scrcpy-server to `/data/local/tmp`, `forward`, `reverse` for Bench,
  `install`, `shell input`, `uiautomator dump`, `screencap`) and `emulator` (start, `emu kill`,
  `emu rotate`). Emulators started here enable gRPC with token auth on 127.0.0.1.
- `xcrun simctl` (list, boot, shutdown, screenshot, pbcopy, openurl, install, launch) and the
  bundled serve-sim helper, which listens on 127.0.0.1:3100+.

Bundled third-party code (in `dist/vendor/`):

| Component | Version | License | Source |
|---|---|---|---|
| scrcpy-server | 5.0.1 | Apache-2.0 | GitHub release asset, sha256 `764eb6f7…bc536` (checked by the build) |
| serve-sim (dist only) | 0.1.49 | Apache-2.0 | npm, pinned in package-lock.json |
| ws | from serve-sim's lockfile | MIT | npm |

Build: `npm ci --ignore-scripts && npm run build`.
