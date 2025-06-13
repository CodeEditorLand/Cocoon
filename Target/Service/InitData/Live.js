var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import { Tag } from "./Service.js";
function Live(InitDataObject) {
  return Layer.succeed(Tag, InitDataObject);
}
__name(Live, "Live");
export {
  Live
};
//# sourceMappingURL=Live.js.map
