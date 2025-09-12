var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ModuleBlockedProblem extends Data.TaggedError(
  "ModuleBlockedProblem"
) {
  static {
    __name(this, "ModuleBlockedProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `[Cocoon] require('${this.ModuleName}') is disallowed. Extensions MUST use the appropriate 'vscode.*' API for this functionality.`;
  }
}
export {
  ModuleBlockedProblem
};
//# sourceMappingURL=ModuleBlockedProblem.js.map
