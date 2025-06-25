var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import {
  NullValue,
  Value as ProtoValue
} from "google-protobuf/google/protobuf/struct_pb.js";
import { ProtoSerializationProblem } from "./ProtoSerializationProblem.js";
const EncodeValue = /* @__PURE__ */ __name((JavaScriptValue) => {
  return Effect.try({
    try: /* @__PURE__ */ __name(() => {
      if (JavaScriptValue === void 0) {
        const Value = new ProtoValue();
        Value.setNullValue(NullValue.NULL_VALUE);
        return Value;
      }
      return ProtoValue.fromJavaScript(JavaScriptValue);
    }, "try"),
    catch: /* @__PURE__ */ __name((cause) => new ProtoSerializationProblem({
      Cause: cause,
      Direction: "Encoding"
    }), "catch")
  });
}, "EncodeValue");
export {
  EncodeValue
};
//# sourceMappingURL=EncodeValue.js.map
