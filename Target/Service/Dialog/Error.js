var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class DialogError extends Data.TaggedError("DialogError") {
  static {
    __name(this, "DialogError");
  }
  get message() {
    return `Dialog operation failed: ${this.context}`;
  }
}
export {
  DialogError
};
//# sourceMappingURL=Error.js.map
