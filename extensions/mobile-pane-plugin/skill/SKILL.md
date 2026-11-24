---
name: mobile-pane
description: See and drive the Android device/emulator or iOS Simulator shown in Ghostex's Mobile Pane - take a screenshot, read the on-screen elements, tap, swipe, type, press keys, install and launch an app - to check UI changes in a mobile app you are working on.
---

# Mobile Pane: look at and drive a phone from an agent

Mobile Pane is a Ghostex extension. Run its agent CLI from your shell:

    node ~/.local/share/ghostex/extensions/installed/mobile-pane-plugin/dist/agent-cli.mjs <action> '<json>'

It prints a JSON answer. On an error it prints `{"error": "..."}` and exits with status 1.
It works even when the Mobile Pane view is closed, as long as a device or simulator is running.

## Actions

| action | data | answer |
|---|---|---|
| `help` | | the action list |
| `devices` | | `[{device, platform, name, state}]` |
| `screenshot` | `{device?}` | `{path}`: a PNG. Read it to see the screen |
| `ui` | `{device?}` | `{elements: [{role, text, x, y, w, h}]}`, where x/y is the center |
| `tap` | `{device?, x, y}` | `{ok}` |
| `swipe` | `{device?, x1, y1, x2, y2, ms?}` | `{ok}` |
| `type` | `{device?, text}` | `{ok}` (types into the focused field; Android accepts ASCII only) |
| `key` | `{device?, key}` | `{ok}` (`home`, `back` on Android only, `recents`, `enter`, `delete`) |
| `install` | `{device?, path}` | `{ok}` (absolute path to an `.apk`, or to a built `.app` for the iOS Simulator) |
| `launch` | `{device?, app}` | `{ok}` (an Android package name or an iOS bundle id) |

- **Coordinates are 0..1 on both platforms.** `0,0` is the top left and `1,1` is the bottom right of the screen as it is shown now.
- `device` takes an id or part of a name, such as `"emulator-5554"` or `"iPhone 17"`. Leave it out when only one device is ready.
- To start an emulator or simulator, ask the user to use **Devices** in the Mobile Pane view.

## Typical loop

1. `ui` finds the element you want, and gives you its center.
2. `tap` that `x`/`y`. Wait about a second for animations to finish.
3. `screenshot`, then read the PNG to check the result.

Prefer `ui` over guessing coordinates from a screenshot.
