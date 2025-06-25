var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ProtoSerializationProblem extends Data.TaggedError(
  "ProtoSerializationProblem"
) {
  static {
    __name(this, "ProtoSerializationProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Protobuf ${this.Direction} failed: ${this.Cause}`;
  }
}
export {
  ProtoSerializationProblem
};
//# sourceMappingURL=ProtoSerializationProblem.js.map
