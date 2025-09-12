var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ApplicationConfigurationProblem extends Data.TaggedError(
  "ApplicationConfigurationProblem"
) {
  static {
    __name(this, "ApplicationConfigurationProblem");
  }
}
export {
  ApplicationConfigurationProblem
};
//# sourceMappingURL=ApplicationConfigurationProblem.js.map
