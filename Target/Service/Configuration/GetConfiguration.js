var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Configuration } from "./Service.js";
function GetConfiguration(Section, Scope) {
  return Effect.flatMap(
    Configuration.Tag,
    (service) => service.GetConfiguration(Section, Scope ?? void 0)
  );
}
__name(GetConfiguration, "GetConfiguration");
export {
  GetConfiguration
};
//# sourceMappingURL=GetConfiguration.js.map
