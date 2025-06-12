var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ProtoSerializationError extends Data.TaggedError(
  "ProtoSerializationError"
) {
  static {
    __name(this, "ProtoSerializationError");
  }
  get message() {
    return `Protobuf ${this.direction} failed: ${this.cause}`;
  }
}
export {
  ProtoSerializationError
};
//# sourceMappingURL=Error.js.map
