var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import IPCLive from "./IPC/Live.js";
import Definition from "./QuickInput/Definition.js";
import Service from "./QuickInput/Service.js";
import { default as default2 } from "./QuickInput/Service.js";
const Live = /* @__PURE__ */ __name((Config) => Layer.effect(Service, Definition).pipe(Layer.provide(IPCLive(Config))), "Live");
export {
  Live,
  default2 as Service
};
//# sourceMappingURL=QuickInput.js.map
