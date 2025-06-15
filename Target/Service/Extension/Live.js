import { Layer } from "effect";
import ExtensionHostLive from "../../Core/ExtensionHost/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";
const Live = Layer.effect(Service, Definition).pipe(
  Layer.provide(ExtensionHostLive)
);
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
