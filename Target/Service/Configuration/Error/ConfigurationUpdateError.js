var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ConfigurationUpdateError_default extends Data.TaggedError("ConfigurationUpdateError") {
  static {
    __name(this, "default");
  }
  constructor(Properties) {
    super(Properties);
    this.message = `Failed to update configuration for key '${this.key}'.`;
  }
  message;
}
export {
  ConfigurationUpdateError_default as default
};
//# sourceMappingURL=ConfigurationUpdateError.js.map
