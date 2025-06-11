var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ExitPreventedError extends Data.TaggedError("ExitPreventedError") {
  static {
    __name(this, "ExitPreventedError");
  }
}
export {
  ExitPreventedError
};
//# sourceMappingURL=ExitPreventedError.js.map
