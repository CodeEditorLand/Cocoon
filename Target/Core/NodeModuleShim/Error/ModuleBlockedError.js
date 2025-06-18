var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ModuleBlockedError extends Data.TaggedError("ModuleBlockedError") {
  static {
    __name(this, "ModuleBlockedError");
  }
  constructor(properties) {
    super(properties);
    this.message = `[Cocoon] require('${this.ModuleName}') is disallowed. Extensions MUST use the appropriate 'vscode.*' API for this functionality.`;
  }
  message;
}
var ModuleBlockedError_default = ModuleBlockedError;
export {
  ModuleBlockedError,
  ModuleBlockedError_default as default
};
//# sourceMappingURL=ModuleBlockedError.js.map
