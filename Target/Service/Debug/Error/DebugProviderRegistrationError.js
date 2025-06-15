var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class DebugProviderRegistrationError_default extends Data.TaggedError(
  "DebugProviderRegistrationError"
) {
  static {
    __name(this, "default");
  }
  constructor(Properties) {
    super(Properties);
    this.message = `Failed to register debug provider for type '${this.DebugType}'.`;
  }
  message;
}
export {
  DebugProviderRegistrationError_default as default
};
//# sourceMappingURL=DebugProviderRegistrationError.js.map
