var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ModuleNotShimmedProblem extends Data.TaggedError(
  "ModuleNotShimmedProblem"
) {
  static {
    __name(this, "ModuleNotShimmedProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Module '${this.ModuleName}' was intercepted, but no shim is defined for it.`;
  }
}
export {
  ModuleNotShimmedProblem
};
//# sourceMappingURL=ModuleNotShimmedProblem.js.map
