# Changelog

## [0.9.4] - {PR_MERGE_DATE}

- Agent `install` and `launch` open the Mobile Pane view beside the agent's chat by themselves (Ghostex 12.3 or newer), so the user sees the phone without the skill having to ask. The `mobile-pane` skill now says so, and tells agents to run apps through these actions instead of `adb install` or `flutter run`.

## [0.9.3] - {PR_MERGE_DATE}

- Emulators and Simulators shut down by themselves when a project is done with them: after the agent's `release`, when a Run ends, or when the device's lock goes stale after 3 minutes without an action. A device another project is waiting for stays on and goes to that project. Real phones (USB or Wi-Fi) are never shut down.
- **Devices** has a switch, "Shut down emulators when a project is done", on by default.

## [0.9.2] - {PR_MERGE_DATE}

- One lock per device, so agents and the Run panel of different projects no longer tap, install or launch over each other. A call from another project waits for the first to finish (up to 10 minutes, then "device … is busy"), the Run panel log shows "Waiting for <project> to finish on <device>", and the lock frees itself after 3 minutes without an action. Agents of the same project share it.
- Agent CLI: new `release` action, and `devices` shows which project holds each device. The `mobile-pane` skill tells agents to call `release` when they finish testing.

## [0.9.1] - {PR_MERGE_DATE}

- The `mobile-pane` skill tells agents to open the Mobile Pane view beside their chat (`ghostex extensions open mobile-pane-plugin --background`, Ghostex 12.3 or newer) before they start testing on a device.

## [0.9.0] - {PR_MERGE_DATE}

- Initial release.
- Mirror and control Android phones and emulators (scrcpy-server 5.0.1, H.264) and iOS Simulators
  (serve-sim 0.1.49), in a device frame that fits the pane and follows rotation.
- Emulators started from **Devices** stream raw frames over the emulator's gRPC (about 60 fps).
- Run panel: pick a Flutter or Android Gradle project, select flavors or `.vscode/launch.json` presets, run on the selected Android device, view live logs, Stop, and Hot reload / restart for Flutter debug builds.
- Touch, drag, wheel, Option+drag pinch, keyboard and input methods, Cmd+A/C/X/Z/V, and the
  device clipboard back to the Mac.
- Devices panel: start and stop Android emulators (headless, Quick Boot) and iOS Simulators.
- One stream per device shared by every viewer; MJPEG or raw-frame fallback without an H.264 decoder.
- Bench: input → screen latency on the device itself.
- Android phones over Wi-Fi from **Devices**: pair with a QR or a 6-digit code, connect paired phones,
  and reconnect dropped ones by themselves, without Android Studio. A **Restart adb** button on the
  "No route to host" hint fixes an adb server started before Local Network was allowed.
- Agent CLI and `mobile-pane` skill: devices, screenshot, ui, tap, swipe, type, key, install, launch.
