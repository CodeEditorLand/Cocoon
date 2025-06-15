var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import IPCLive from "./IPC/Live.js";
import Definition from "./Window/Definition.js";
import Service from "./Window/Service.js";
import WorkSpaceLive from "./WorkSpace/Live.js";
import { default as default2 } from "./Window/Service.js";
const Live = /* @__PURE__ */ __name((Config) => Layer.effect(Service, Definition).pipe(
  Layer.provide(Layer.merge(IPCLive(Config), WorkSpaceLive(Config)))
), "Live");
export {
  Live,
  default2 as Service
};
//# sourceMappingURL=Window.js.map
