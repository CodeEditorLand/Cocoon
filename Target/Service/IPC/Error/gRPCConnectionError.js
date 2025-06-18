var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class GPCConnectionError extends Data.TaggedError(
  "gRPCConnectionError"
) {
  static {
    __name(this, "GPCConnectionError");
  }
}
var gRPCConnectionError_default = GPCConnectionError;
export {
  GPCConnectionError,
  gRPCConnectionError_default as default
};
//# sourceMappingURL=gRPCConnectionError.js.map
