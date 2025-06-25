var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class IntegrationConfigurationProblem extends Data.TaggedError(
  "IntegrationConfigurationProblem"
) {
  static {
    __name(this, "IntegrationConfigurationProblem");
  }
}
export {
  IntegrationConfigurationProblem
};
//# sourceMappingURL=Problem.js.map
