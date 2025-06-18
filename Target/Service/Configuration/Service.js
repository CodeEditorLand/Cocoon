var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context } from "effect";
class ConfigurationService extends Context.Tag(
  "Service/Configuration"
)() {
  static {
    __name(this, "ConfigurationService");
  }
}
export {
  ConfigurationService as default
};
//# sourceMappingURL=Service.js.map
