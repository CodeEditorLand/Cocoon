var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class IntegrationPathProblem extends Data.TaggedError(
  "IntegrationPathProblem"
) {
  static {
    __name(this, "IntegrationPathProblem");
  }
}
export {
  IntegrationPathProblem
};
//# sourceMappingURL=Problem.js.map
