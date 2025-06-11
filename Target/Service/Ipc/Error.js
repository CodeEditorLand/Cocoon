var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class GrpcConnectionError extends Data.TaggedError(
  "GrpcConnectionError"
) {
  static {
    __name(this, "GrpcConnectionError");
  }
}
class IpcError extends Data.TaggedError("IpcError") {
  static {
    __name(this, "IpcError");
  }
}
export {
  GrpcConnectionError,
  IpcError
};
//# sourceMappingURL=Error.js.map
