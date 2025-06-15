var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class StartDebuggingError_default extends Data.TaggedError("StartDebuggingError") {
  static {
    __name(this, "default");
  }
  constructor(Properties) {
    super(Properties);
    this.message = `Failed to start debugging session.`;
  }
  message;
}
export {
  StartDebuggingError_default as default
};
//# sourceMappingURL=StartDebuggingError.js.map
