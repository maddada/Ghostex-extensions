// scrcpy v5.0.1 control messages (client → device). Shared by the viewer and the Node smoke checks.
// Layouts from server/.../control/ControlMessageReader.java at tag v5.0.1. All integers big-endian.
export const TYPE = { KEYCODE: 0, TEXT: 1, TOUCH: 2, SCROLL: 3, SET_CLIPBOARD: 9, ROTATE: 11, RESET_VIDEO: 17 };
export const ACTION = { DOWN: 0, UP: 1, MOVE: 2 };
export const KEY = {
  HOME: 3, BACK: 4, DPAD_UP: 19, DPAD_DOWN: 20, DPAD_LEFT: 21, DPAD_RIGHT: 22, VOLUME_UP: 24, VOLUME_DOWN: 25,
  POWER: 26, A: 29, TAB: 61, ENTER: 66, DEL: 67, PAGE_UP: 92, PAGE_DOWN: 93, ESCAPE: 111, FORWARD_DEL: 112,
  MOVE_HOME: 122, MOVE_END: 123, APP_SWITCH: 187,
};
export const META_CTRL_ON = 0x1000;
// Any id other than -1 (mouse) is injected as a finger on the touchscreen.
const POINTER_GENERIC_FINGER = -2n;
export const POINTER_VIRTUAL_FINGER = -3n; // second finger for pinch, as scrcpy's client uses
const utf8 = new TextEncoder();

/** Touch at (x, y) in video-frame pixels; w/h must be the current frame size or the device drops it. */
export function touch(action, x, y, w, h, pointerId = POINTER_GENERIC_FINGER) {
  const v = new DataView(new ArrayBuffer(32));
  v.setUint8(0, TYPE.TOUCH);
  v.setUint8(1, action);
  v.setBigInt64(2, BigInt(pointerId));
  v.setInt32(10, Math.round(x));
  v.setInt32(14, Math.round(y));
  v.setUint16(18, w);
  v.setUint16(20, h);
  v.setUint16(22, action === ACTION.UP ? 0 : 0xffff); // pressure, u16 fixed point
  v.setInt32(24, 0); // action button
  v.setInt32(28, 0); // buttons (ignored for fingers)
  return v.buffer;
}

/** Scroll amounts in Android axis units (one wheel notch ≈ 1), range [-16, 16]. */
export function scroll(x, y, w, h, hScroll, vScroll) {
  const fixed = (f) => Math.round(Math.max(-1, Math.min(1, f / 16)) * 0x7fff);
  const v = new DataView(new ArrayBuffer(21));
  v.setUint8(0, TYPE.SCROLL);
  v.setInt32(1, Math.round(x));
  v.setInt32(5, Math.round(y));
  v.setUint16(9, w);
  v.setUint16(11, h);
  v.setInt16(13, fixed(hScroll));
  v.setInt16(15, fixed(vScroll));
  v.setInt32(17, 0);
  return v.buffer;
}

export function key(action, keycode, repeat = 0, metaState = 0) {
  const v = new DataView(new ArrayBuffer(14));
  v.setUint8(0, TYPE.KEYCODE);
  v.setUint8(1, action);
  v.setInt32(2, keycode);
  v.setInt32(6, repeat);
  v.setInt32(10, metaState);
  return v.buffer;
}

export function text(str) {
  const bytes = utf8.encode(str);
  const v = new DataView(new ArrayBuffer(5 + bytes.length));
  v.setUint8(0, TYPE.TEXT);
  v.setUint32(1, bytes.length);
  new Uint8Array(v.buffer, 5).set(bytes);
  return v.buffer;
}

/** Puts text on the device clipboard and, with paste, pastes it into the focused field. */
export function setClipboard(str, paste = true) {
  const bytes = utf8.encode(str);
  const v = new DataView(new ArrayBuffer(14 + bytes.length));
  v.setUint8(0, TYPE.SET_CLIPBOARD);
  v.setBigInt64(1, 0n); // sequence 0: no acknowledgement wanted
  v.setUint8(9, paste ? 1 : 0);
  v.setUint32(10, bytes.length);
  new Uint8Array(v.buffer, 14).set(bytes);
  return v.buffer;
}

// ---- iOS Simulator (serve-sim HID WebSocket: [tag][JSON]) ------------------------------
// From serve-sim 0.1.49 src/device-session.ts handleHidMessage.
const IOS_TAG = { TOUCH: 0x03, BUTTON: 0x04, MULTI_TOUCH: 0x05, KEY: 0x06, SCROLL: 0x0b };

function iosFrame(tag, obj) {
  const body = utf8.encode(JSON.stringify(obj));
  const out = new Uint8Array(1 + body.length);
  out[0] = tag;
  out.set(body, 1);
  return out.buffer;
}

/** phase: "begin" | "move" | "end"; x, y normalized 0..1 in the native portrait frame.
 *  edge: 0 none, 1 left, 2 top, 3 bottom (swipe home on Face ID devices), 4 right. */
export const iosTouch = (phase, x, y, edge = 0) => iosFrame(IOS_TAG.TOUCH, edge ? { type: phase, x, y, edge } : { type: phase, x, y });

/** Swipe up from the bottom edge: goes home from an app and from the App Switcher, where the Home
 *  button does nothing. Frames with pauses (ms) in between, for a sender that honors them. */
export const iosSwipeHome = () => {
  const out = [iosTouch("begin", 0.5, 0.995, 3)];
  for (let i = 1; i <= 12; i++) out.push(16, iosTouch("move", 0.5, 0.995 - (0.45 * i) / 12, 3));
  out.push(16, iosTouch("end", 0.5, 0.545, 3));
  return out;
};
/** Two fingers (pinch / rotate), all coordinates normalized 0..1. */
export const iosTouch2 = (phase, x1, y1, x2, y2) => iosFrame(IOS_TAG.MULTI_TOUCH, { type: phase, x1, y1, x2, y2 });
/** name: "home" | "app_switcher" | "lock" | "siri" | "side_button" | "swipe_home" */
export const iosButton = (name) => iosFrame(IOS_TAG.BUTTON, { button: name });
/** USB HID keyboard usage (page 0x07), see HID_USAGE. */
export const iosKey = (phase, usage) => iosFrame(IOS_TAG.KEY, { type: phase, usage });
/** Deltas as a fraction of the screen. */
export const iosScroll = (dx, dy, x, y) => iosFrame(IOS_TAG.SCROLL, { dx, dy, x, y });

// KeyboardEvent.code → USB HID usage (Keyboard/Keypad page), as in serve-sim's client/utils/hid.ts.
export const HID_USAGE = {
  Enter: 0x28, Escape: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c, Minus: 0x2d, Equal: 0x2e,
  BracketLeft: 0x2f, BracketRight: 0x30, Backslash: 0x31, Semicolon: 0x33, Quote: 0x34, Backquote: 0x35,
  Comma: 0x36, Period: 0x37, Slash: 0x38, CapsLock: 0x39, Home: 0x4a, PageUp: 0x4b, Delete: 0x4c,
  End: 0x4d, PageDown: 0x4e, ArrowRight: 0x4f, ArrowLeft: 0x50, ArrowDown: 0x51, ArrowUp: 0x52,
  ControlLeft: 0xe0, ShiftLeft: 0xe1, AltLeft: 0xe2, MetaLeft: 0xe3, ControlRight: 0xe4, ShiftRight: 0xe5,
  AltRight: 0xe6, MetaRight: 0xe7,
};
for (let i = 0; i < 26; i++) HID_USAGE[`Key${String.fromCharCode(65 + i)}`] = 0x04 + i;
for (let i = 1; i <= 9; i++) HID_USAGE[`Digit${i}`] = 0x1e + i - 1;
HID_USAGE.Digit0 = 0x27;
for (let i = 1; i <= 12; i++) HID_USAGE[`F${i}`] = 0x3a + i - 1;
