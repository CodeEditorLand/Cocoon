var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import {
  NullValue,
  Value as ProtoValue
} from "google-protobuf/google/protobuf/struct_pb.js";
import { ProtoSerializationError } from "./Error.js";
const EncodeValue = /* @__PURE__ */ __name((JsValue) => {
  return Effect.try({
    try: /* @__PURE__ */ __name(() => {
      if (JsValue === void 0) {
        const Value = new ProtoValue();
        Value.setNullValue(NullValue.NULL_VALUE);
        return Value;
      }
      return ProtoValue.fromJavaScript(JsValue);
    }, "try"),
    catch: /* @__PURE__ */ __name((Cause) => new ProtoSerializationError({ Cause, Direction: "Encoding" }), "catch")
  });
}, "EncodeValue");
var EncodeValue_default = EncodeValue;
export {
  EncodeValue_default as default
};
//# sourceMappingURL=EncodeValue.js.map
