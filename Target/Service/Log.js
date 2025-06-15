import { Layer } from "effect";
import Definition from "./Log/Definition.js";
import Service from "./Log/Service.js";
import { default as default2 } from "./Log/Service.js";
const Live = Layer.effect(Service, Definition);
export {
  Live,
  default2 as Service
};
//# sourceMappingURL=Log.js.map
