import {
  CB,
  NQ
} from "./chunk-NZ4VF6TQ.js";
import "./chunk-4JKWZG2U.js";
import "./chunk-LGZAP2FY.js";
import "./chunk-PIRHQTI4.js";

// node_modules/@excalidraw/excalidraw/dist/prod/subset-worker.chunk.js
var s = import.meta.url ? new URL(import.meta.url) : void 0;
typeof window > "u" && typeof self < "u" && (self.onmessage = async (e) => {
  switch (e.data.command) {
    case CB.Subset:
      let a = await NQ(e.data.arrayBuffer, e.data.codePoints);
      self.postMessage(a, { transfer: [a] });
      break;
  }
});
export {
  s as WorkerUrl
};
