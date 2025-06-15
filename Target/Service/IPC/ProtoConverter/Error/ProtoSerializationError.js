var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ProtoSerializationError_default extends Data.TaggedError("ProtoSerializationError") {
  static {
    __name(this, "default");
  }
  constructor(Properties) {
    super(Properties);
    this.message = `Protobuf ${this.Direction} failed: ${this.cause}`;
  }
  message;
}
export {
  ProtoSerializationError_default as default
};
//# sourceMappingURL=ProtoSerializationError.js.map
