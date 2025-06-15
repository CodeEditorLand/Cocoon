var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ModuleBlockedError_default extends Data.TaggedError("ModuleBlockedError") {
  static {
    __name(this, "default");
  }
  constructor(Properties) {
    super(Properties);
    this.message = `[Cocoon] require('${this.ModuleName}') is disallowed. Extensions MUST use the appropriate 'vscode.*' API for this functionality.`;
  }
  message;
}
export {
  ModuleBlockedError_default as default
};
//# sourceMappingURL=ModuleBlockedError.js.map
