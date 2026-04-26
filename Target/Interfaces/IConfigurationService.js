// Source/Interfaces/IConfigurationService.ts
import { Context } from "effect";
var ConfigurationScope = /* @__PURE__ */ ((ConfigurationScope2) => {
  ConfigurationScope2["APPLICATION"] = "APPLICATION";
  ConfigurationScope2["WORKSPACE"] = "WORKSPACE";
  ConfigurationScope2["PROFILE"] = "PROFILE";
  return ConfigurationScope2;
})(ConfigurationScope || {});
var IConfigurationService = Context.Tag(
  "IConfigurationService"
);
export {
  ConfigurationScope,
  IConfigurationService
};
//# sourceMappingURL=IConfigurationService.js.map
