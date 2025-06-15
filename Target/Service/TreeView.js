var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Live as CommandLive } from "./Command.js";
import { Live as IPCLive } from "./IPC.js";
import Service from "./TreeView/Service.js";
import { Layer } from "effect";
const Live = /* @__PURE__ */ __name((Config) => Layer.effect(Service, Live).pipe(
  Layer.provide(Layer.merge(IPCLive(Config), CommandLive(Config)))
), "Live");
export {
  Live,
  Service
};
//# sourceMappingURL=TreeView.js.map
