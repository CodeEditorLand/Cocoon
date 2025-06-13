var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ConfigurationUpdateError extends Data.TaggedError(
  "ConfigurationUpdateError"
) {
  static {
    __name(this, "ConfigurationUpdateError");
  }
  get message() {
    return `Failed to update configuration for key '${this.key}'.`;
  }
}
export {
  ConfigurationUpdateError
};
//# sourceMappingURL=Error.js.map
