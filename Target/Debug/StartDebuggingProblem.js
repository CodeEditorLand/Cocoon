var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class StartDebuggingProblem extends Data.TaggedError(
  "StartDebuggingProblem"
) {
  static {
    __name(this, "StartDebuggingProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Failed to start debugging session.`;
  }
}
export {
  StartDebuggingProblem
};
//# sourceMappingURL=StartDebuggingProblem.js.map
