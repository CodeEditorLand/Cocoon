import { Layer } from "effect";
import Definition from "./ProposedAPI/Definition.js";
import Service from "./ProposedAPI/Service.js";
import LogLive from "./Log/Live.js";
import { default as default2 } from "./ProposedAPI/Service.js";
const Live = Layer.effect(Service, Definition).pipe(
  Layer.provide(LogLive)
);
export {
  Live,
  default2 as Service
};
//# sourceMappingURL=ProposedAPI.js.map
