# Changelog

## [0.9.0] - {PR_MERGE_DATE}

- Initial release.
- Mirror and control Android phones and emulators (scrcpy-server 5.0.1, H.264) and iOS Simulators
  (serve-sim 0.1.49), in a device frame that fits the pane and follows rotation.
- Emulators started from **Devices** stream raw frames over the emulator's gRPC (about 60 fps).
- Touch, drag, wheel, Option+drag pinch, keyboard and input methods, Cmd+A/C/X/Z/V, and the
  device clipboard back to the Mac.
- Devices panel: start and stop Android emulators (headless, Quick Boot) and iOS Simulators.
- One stream per device shared by every viewer; MJPEG or raw-frame fallback without an H.264 decoder.
- Bench: input → screen latency on the device itself.
- Agent CLI and `mobile-pane` skill: devices, screenshot, ui, tap, swipe, type, key, install, launch.
