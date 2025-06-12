var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class StdioError extends Data.TaggedError("StdioError") {
  static {
    __name(this, "StdioError");
  }
}
export {
  StdioError
};
//# sourceMappingURL=Error.js.map
