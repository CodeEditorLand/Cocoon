var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class EmptyKeyError_default extends Data.TaggedError("EmptyKeyError") {
  static {
    __name(this, "default");
  }
  message;
  constructor() {
    super();
    this.message = "Secret key cannot be empty.";
  }
}
export {
  EmptyKeyError_default as default
};
//# sourceMappingURL=EmptyKeyError.js.map
