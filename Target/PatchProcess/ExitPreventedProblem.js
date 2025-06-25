var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ExitPreventedProblem extends Data.TaggedError(
  "ExitPreventedProblem"
) {
  static {
    __name(this, "ExitPreventedProblem");
  }
}
export {
  ExitPreventedProblem
};
//# sourceMappingURL=ExitPreventedProblem.js.map
