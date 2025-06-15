var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import { Live as IPCLive } from "../IPC.js";
import LogLive from "../Log/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";
const Live = /* @__PURE__ */ __name((Config) => Layer.effect(Service, Definition).pipe(
  Layer.provide(Layer.merge(IPCLive(Config), LogLive))
), "Live");
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
