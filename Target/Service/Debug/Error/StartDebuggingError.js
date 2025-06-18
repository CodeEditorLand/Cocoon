var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class StartDebuggingError extends Data.TaggedError(
  "StartDebuggingError"
) {
  static {
    __name(this, "StartDebuggingError");
  }
  constructor(properties) {
    super(properties);
    this.message = `Failed to start debugging session.`;
  }
  message;
}
var StartDebuggingError_default = StartDebuggingError;
export {
  StartDebuggingError,
  StartDebuggingError_default as default
};
//# sourceMappingURL=StartDebuggingError.js.map
