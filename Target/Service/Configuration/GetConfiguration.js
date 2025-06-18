var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import ConfigurationService from "./Service.js";
const GetConfiguration = /* @__PURE__ */ __name((Section, Scope) => {
  return Effect.flatMap(
    ConfigurationService,
    (Service) => Service.GetConfiguration(Section, Scope ?? void 0)
  );
}, "GetConfiguration");
var GetConfiguration_default = GetConfiguration;
export {
  GetConfiguration_default as default
};
//# sourceMappingURL=GetConfiguration.js.map
