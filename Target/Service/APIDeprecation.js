import { Layer } from "effect";
import Definition from "./APIDeprecation/Definition.js";
import Service from "./APIDeprecation/Service.js";
import LogLive from "./Log/Live.js";
import { default as default2 } from "./APIDeprecation/Service.js";
const APIDeprecationLive = Layer.effect(Service, Definition).pipe(
  Layer.provide(LogLive)
);
export {
  APIDeprecationLive,
  default2 as Service
};
//# sourceMappingURL=APIDeprecation.js.map
