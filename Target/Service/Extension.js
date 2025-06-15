import { Layer } from "effect";
import ExtensionHostLive from "../Core/ExtensionHost/Live.js";
import Definition from "./Extension/Definition.js";
import Service from "./Extension/Service.js";
import { default as default2 } from "./Extension/Service.js";
const Live = Layer.effect(Service, Definition).pipe(
  Layer.provide(ExtensionHostLive)
);
export {
  Live,
  default2 as Service
};
//# sourceMappingURL=Extension.js.map
