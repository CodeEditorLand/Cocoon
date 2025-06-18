import { Layer } from "effect";
import CancellationLive from "../Cancellation/Live.js";
import ClientLive from "./Client/Live.js";
import Definition from "./Definition.js";
import DispatcherLive from "./Dispatcher/Live.js";
import ProtocolAdapterLive from "./ProtocolAdapter/Live.js";
import ServerLive from "./Server/Live.js";
import Service from "./Service.js";
const IPCInternalComponents = Layer.mergeAll(
  ClientLive,
  ServerLive,
  DispatcherLive,
  ProtocolAdapterLive,
  // The Dispatcher requires the CancellationService, so we include it here.
  CancellationLive
);
const IPCInternalDepsLive = IPCInternalComponents.pipe(
  Layer.provide(IPCInternalComponents)
);
const IPCServiceLive = Layer.effect(Service, Definition);
const IPCLive = IPCServiceLive.pipe(Layer.provide(IPCInternalDepsLive), Layer.orDie);
var Live_default = IPCLive;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
