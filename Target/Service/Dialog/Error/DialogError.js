var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class DialogError_default extends Data.TaggedError("DialogError") {
  static {
    __name(this, "default");
  }
  constructor(Properties) {
    super(Properties);
    this.message = `Dialog operation failed: ${this.context}`;
  }
  message;
}
export {
  DialogError_default as default
};
//# sourceMappingURL=DialogError.js.map
