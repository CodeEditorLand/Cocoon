var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class EmptyKeyError extends Data.TaggedError("EmptyKeyError") {
  static {
    __name(this, "EmptyKeyError");
  }
  get message() {
    return "Secret key cannot be empty.";
  }
}
class InvalidValueError extends Data.TaggedError(
  "InvalidValueError"
) {
  static {
    __name(this, "InvalidValueError");
  }
  get message() {
    return "Secret value must be a string.";
  }
}
export {
  EmptyKeyError,
  InvalidValueError
};
//# sourceMappingURL=Error.js.map
