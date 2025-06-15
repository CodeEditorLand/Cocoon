var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import IPCLive from "./IPC/Live.js";
import Definition from "./Message/Definition.js";
import Service from "./Message/Service.js";
import { default as default2 } from "./Message/Service.js";
const Live = /* @__PURE__ */ __name((Config) => Layer.effect(Service, Definition).pipe(Layer.provide(IPCLive(Config))), "Live");
export {
  Live,
  default2 as Service
};
//# sourceMappingURL=Message.js.map
