var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import {
  NullValue,
  Value as ProtoValue
} from "google-protobuf/google/protobuf/struct_pb.js";
import { ProtoSerializationError } from "./Error.js";
const EncodeValue = /* @__PURE__ */ __name((JsValue) => Effect.try({
  try: /* @__PURE__ */ __name(() => {
    if (JsValue === void 0) {
      throw new Error(
        "Cannot encode 'undefined'. It should be omitted from the payload."
      );
    }
    if (JsValue === null) {
      const Value = new ProtoValue();
      Value.setNullValue(NullValue.NULL_VALUE);
      return Value;
    }
    return ProtoValue.fromJavaScript(JsValue);
  }, "try"),
  catch: /* @__PURE__ */ __name((cause) => new ProtoSerializationError({ cause, direction: "Encoding" }), "catch")
}), "EncodeValue");
export {
  EncodeValue
};
//# sourceMappingURL=EncodeValue.js.map
