var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import { CancellationLive } from "../Cancellation.js";
import { Live as CommandLive } from "../Command.js";
import { Live as DocumentLive } from "../Document.js";
import { Live as IPCLive } from "../IPC.js";
import Definition from "./Definition.js";
import Service from "./Service.js";
const Live = /* @__PURE__ */ __name((Config) => Layer.effect(Service, Definition).pipe(
  Layer.provide(
    Layer.mergeAll(
      IPCLive(Config),
      DocumentLive(Config),
      CancellationLive,
      CommandLive(Config)
    )
  )
), "Live");
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
