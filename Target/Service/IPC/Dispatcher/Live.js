import { Layer } from "effect";
import { CancellationLive } from "../../Cancellation.js";
import ProtocolAdapterLive from "../ProtocolAdapter/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";
const Live = Layer.effect(Service, Definition).pipe(
  Layer.provide(Layer.merge(ProtocolAdapterLive, CancellationLive))
);
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
