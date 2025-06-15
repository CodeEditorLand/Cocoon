var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import { Live as ClientLive } from "./Client.js";
import ConfigurationService from "./Configuration.js";
import Definition from "./Definition.js";
import { Live as DispatcherLive } from "./Dispatcher.js";
import { Live as ProtocolAdapterLive } from "./ProtocolAdapter.js";
import { Live as ServerLive } from "./Server.js";
import Service from "./Service.js";
const Live = /* @__PURE__ */ __name((Config) => {
  const ConfigLayer = Layer.succeed(ConfigurationService, Config);
  const DependenciesLayer = Layer.mergeAll(
    ClientLive,
    ServerLive,
    DispatcherLive,
    ProtocolAdapterLive
  ).pipe(Layer.provide(ConfigLayer));
  return Layer.effect(Service, Definition).pipe(
    Layer.provide(DependenciesLayer)
  );
}, "Live");
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
