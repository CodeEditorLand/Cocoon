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
class IPCError extends Data.TaggedError("IPCError") {
  static {
    __name(this, "IPCError");
  }
}
export {
  IPCError,
  gRPCConnectionError
};
//# sourceMappingURL=Error.js.map
