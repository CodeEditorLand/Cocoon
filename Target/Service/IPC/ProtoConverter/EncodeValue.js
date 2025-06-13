var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import {
  NullValue,
  Value as ProtoValue
} from "google-protobuf/google/protobuf/struct_pb.js";
import { ProtoSerializationError } from "./Error.js";
function EncodeValue(JsValue) {
  return Effect.try({
    try: /* @__PURE__ */ __name(() => {
      if (JsValue === void 0) {
        const Value = new ProtoValue();
        Value.setNullValue(NullValue.NULL_VALUE);
        return Value;
      }
      return ProtoValue.fromJavaScript(JsValue);
    }, "try"),
    catch: /* @__PURE__ */ __name((cause) => new ProtoSerializationError({ cause, direction: "Encoding" }), "catch")
  });
}
__name(EncodeValue, "EncodeValue");
export {
  EncodeValue
};
//# sourceMappingURL=EncodeValue.js.map
