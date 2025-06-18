var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class DebugProviderRegistrationError extends Data.TaggedError(
  "DebugProviderRegistrationError"
) {
  static {
    __name(this, "DebugProviderRegistrationError");
  }
  constructor(properties) {
    super(properties);
    this.message = `Failed to register debug provider for type '${this.DebugType}'.`;
  }
  message;
}
var DebugProviderRegistrationError_default = DebugProviderRegistrationError;
export {
  DebugProviderRegistrationError,
  DebugProviderRegistrationError_default as default
};
//# sourceMappingURL=DebugProviderRegistrationError.js.map
