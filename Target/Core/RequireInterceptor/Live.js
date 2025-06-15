import { Layer } from "effect";
import LogLive from "../../Service/Log/Live.js";
import APIFactoryLive from "../APIFactory/Live.js";
import ExtensionPathLive from "../ExtensionPath/Live.js";
import NodeModuleShimLive from "../NodeModuleShim/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";
const Live = Layer.effect(Service, Definition).pipe(
  Layer.provide(
    Layer.mergeAll(
      APIFactoryLive,
      ExtensionPathLive,
      NodeModuleShimLive,
      LogLive
    )
  )
);
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
