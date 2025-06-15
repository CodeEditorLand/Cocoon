var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import Service from "./Service.js";
function Live_default(InitDataObject) {
  return Layer.succeed(Service, InitDataObject);
}
__name(Live_default, "default");
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
