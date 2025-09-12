var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class DebugProviderRegistrationProblem extends Data.TaggedError(
  "DebugProviderRegistrationProblem"
) {
  static {
    __name(this, "DebugProviderRegistrationProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Failed to register debug provider for type '${this.DebugType}'.`;
  }
}
export {
  DebugProviderRegistrationProblem
};
//# sourceMappingURL=DebugProviderRegistrationProblem.js.map
