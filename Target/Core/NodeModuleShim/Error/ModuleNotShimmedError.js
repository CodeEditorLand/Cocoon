var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ModuleNotShimmedError extends Data.TaggedError(
  "ModuleNotShimmedError"
) {
  static {
    __name(this, "ModuleNotShimmedError");
  }
  constructor(properties) {
    super(properties);
    this.message = `Module '${this.ModuleName}' was intercepted, but no shim is defined for it.`;
  }
  message;
}
var ModuleNotShimmedError_default = ModuleNotShimmedError;
export {
  ModuleNotShimmedError,
  ModuleNotShimmedError_default as default
};
//# sourceMappingURL=ModuleNotShimmedError.js.map
