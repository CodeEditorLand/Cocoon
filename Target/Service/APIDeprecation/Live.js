import { Layer } from "effect";
import LogLive from "../Log/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";
const Live = Layer.effect(Service, Definition).pipe(Layer.provide(LogLive));
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
