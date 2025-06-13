var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ModuleBlockedError extends Data.TaggedError("ModuleBlockedError") {
  static {
    __name(this, "ModuleBlockedError");
  }
  get message() {
    return `[Cocoon] require('${this.ModuleName}') is disallowed. Extensions MUST use the appropriate 'vscode.*' API for this functionality.`;
  }
}
class ModuleNotShimmedError extends Data.TaggedError(
  "ModuleNotShimmedError"
) {
  static {
    __name(this, "ModuleNotShimmedError");
  }
  get message() {
    return `Module '${this.ModuleName}' was intercepted, but no shim is defined for it.`;
  }
}
export {
  ModuleBlockedError,
  ModuleNotShimmedError
};
//# sourceMappingURL=Error.js.map
