var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import ConfigurationLive from "./Configuration/Live.js";
import DocumentLive from "./Document/Live.js";
import FileSystemLive from "./FileSystem/Live.js";
import IPCLive from "./IPC/Live.js";
import Definition from "./WorkSpace/Definition.js";
import Service from "./WorkSpace/Service.js";
import { default as default2 } from "./WorkSpace/Service.js";
const Live = /* @__PURE__ */ __name((Config) => Layer.effect(Service, Definition).pipe(
  Layer.provide(
    Layer.mergeAll(
      IPCLive(Config),
      DocumentLive(Config),
      FileSystemLive(Config),
      ConfigurationLive(Config)
    )
  )
), "Live");
export {
  Live,
  default2 as Service
};
//# sourceMappingURL=WorkSpace.js.map
