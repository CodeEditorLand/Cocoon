var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class gRPCConnectionError extends Data.TaggedError(
  "gRPCConnectionError"
) {
  static {
    __name(this, "gRPCConnectionError");
  }
}
export {
  gRPCConnectionError
};
//# sourceMappingURL=gRPCConnectionError.js.map
