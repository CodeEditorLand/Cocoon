import { Layer } from "effect";
import DispatcherLive from "../Dispatcher/Live.js";
import Acquire from "./Acquire.js";
import Service from "./Service.js";
const Live = Layer.scoped(Service, Acquire).pipe(Layer.provide(DispatcherLive));
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
