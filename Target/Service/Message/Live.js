var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import IPCLive from "../IPC/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";
const Live = /* @__PURE__ */ __name((Config) => {
  return Layer.effect(Service, Definition).pipe(
    Layer.provide(IPCLive(Config))
  );
}, "Live");
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
