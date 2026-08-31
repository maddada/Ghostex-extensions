import { mountCanvas } from './app.js';
import { waitForBridge } from './bridge.js';

const root = document.getElementById('root');
// The host installs the bridge after this script runs, so the board waits for
// it rather than deciding at startup that there is no storage.
if (root) void waitForBridge().then((bridge) => mountCanvas(root, bridge));
