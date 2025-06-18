var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class DialogError extends Data.TaggedError("DialogError") {
  static {
    __name(this, "DialogError");
  }
  constructor(properties) {
    super(properties);
    this.message = `Dialog operation failed: ${this.context}`;
  }
  message;
}
var DialogError_default = DialogError;
export {
  DialogError,
  DialogError_default as default
};
//# sourceMappingURL=DialogError.js.map
