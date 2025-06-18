var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class InvalidValueError_default extends Data.TaggedError("InvalidValueError") {
  static {
    __name(this, "default");
  }
  message;
  constructor() {
    super();
    this.message = "Secret value must be a string.";
  }
}
export {
  InvalidValueError_default as default
};
//# sourceMappingURL=InvalidValueError.js.map
