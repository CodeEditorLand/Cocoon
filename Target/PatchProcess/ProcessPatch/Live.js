var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import Service from "./Service.js";
const Live = /* @__PURE__ */ __name((AllowExit) => {
  return Layer.succeed(Service, {
    NativeExit: process.exit.bind(process),
    NativeCrash: typeof process.crash === "function" ? process.crash.bind(process) : void 0,
    AllowExit
  });
}, "Live");
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
