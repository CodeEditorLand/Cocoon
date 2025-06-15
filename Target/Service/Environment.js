var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import ClipboardLive from "./Clipboard/Live.js";
import Definition from "./Environment/Definition.js";
import Service from "./Environment/Service.js";
import IPCLive from "./IPC/Live.js";
import { default as default2 } from "./Environment/Service.js";
const Live = /* @__PURE__ */ __name((Config) => Layer.effect(Service, Definition).pipe(
  Layer.provide(Layer.merge(IPCLive(Config), ClipboardLive(Config)))
), "Live");
export {
  Live,
  default2 as Service
};
//# sourceMappingURL=Environment.js.map
