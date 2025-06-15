var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import Definition from "./Command/Definition.js";
import Service from "./Command/Service.js";
import IPCLive from "./IPC/Live.js";
import TelemetryLive from "./Telemetry/Live.js";
import WorkSpaceLive from "./WorkSpace/Live.js";
import { default as default2 } from "./Command/Service.js";
const Live = /* @__PURE__ */ __name((Config) => Layer.effect(Service, Definition).pipe(
  Layer.provide(
    Layer.mergeAll(
      IPCLive(Config),
      TelemetryLive(Config),
      WorkSpaceLive(Config)
    )
  )
), "Live");
export {
  Live,
  default2 as Service
};
//# sourceMappingURL=Command.js.map
