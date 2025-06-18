var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Value as ProtoValue } from "google-protobuf/google/protobuf/struct_pb.js";
import ProtoSerializationError from "./Error/ProtoSerializationError.js";
var DecodeValue_default = /* @__PURE__ */ __name((ProtoValueInstance) => {
  return Effect.try({
    try: /* @__PURE__ */ __name(() => {
      if (ProtoValueInstance === void 0) {
        return void 0;
      }
      if (ProtoValueInstance.getKindCase() === ProtoValue.KindCase.NULL_VALUE) {
        return null;
      }
      return ProtoValueInstance.toJavaScript();
    }, "try"),
    catch: /* @__PURE__ */ __name((cause) => new ProtoSerializationError({
      cause,
      Direction: "Decoding"
    }), "catch")
  });
}, "default");
export {
  DecodeValue_default as default
};
//# sourceMappingURL=DecodeValue.js.map
