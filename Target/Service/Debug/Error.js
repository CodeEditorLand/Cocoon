var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class DebugProviderRegistrationError extends Data.TaggedError(
  "DebugProviderRegistrationError"
) {
  static {
    __name(this, "DebugProviderRegistrationError");
  }
  get message() {
    return `Failed to register debug provider for type '${this.DebugType}'.`;
  }
}
class StartDebuggingError extends Data.TaggedError(
  "StartDebuggingError"
) {
  static {
    __name(this, "StartDebuggingError");
  }
  get message() {
    return `Failed to start debugging session.`;
  }
}
export {
  DebugProviderRegistrationError,
  StartDebuggingError
};
//# sourceMappingURL=Error.js.map
