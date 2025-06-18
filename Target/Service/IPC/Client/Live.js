import { Layer } from "effect";
import Acquire from "./Acquire.js";
import Service from "./Service.js";
const Live = Layer.scoped(Service, Acquire);
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
