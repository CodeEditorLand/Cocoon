var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ModuleNotShimmedError_default extends Data.TaggedError("ModuleNotShimmedError") {
  static {
    __name(this, "default");
  }
  constructor(Properties) {
    super(Properties);
    this.message = `Module '${this.ModuleName}' was intercepted, but no shim is defined for it.`;
  }
  message;
}
export {
  ModuleNotShimmedError_default as default
};
//# sourceMappingURL=ModuleNotShimmedError.js.map
