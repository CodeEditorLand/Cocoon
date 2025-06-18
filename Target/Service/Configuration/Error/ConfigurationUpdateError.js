var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ConfigurationUpdateError extends Data.TaggedError(
  "ConfigurationUpdateError"
) {
  static {
    __name(this, "ConfigurationUpdateError");
  }
  constructor(properties) {
    super(properties);
    this.message = `Failed to update configuration for key '${this.key}'.`;
  }
  message;
}
var ConfigurationUpdateError_default = ConfigurationUpdateError;
export {
  ConfigurationUpdateError,
  ConfigurationUpdateError_default as default
};
//# sourceMappingURL=ConfigurationUpdateError.js.map
