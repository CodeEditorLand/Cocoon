var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import LogService from "../Log/Service.js";
var Definition_default = Effect.gen(function* () {
  const Log = yield* LogService;
  const Report = /* @__PURE__ */ __name((ExtensionID, Usage, Message) => Log.Warn(
    `Extension '${ExtensionID.value}' used deprecated API: '${Usage}'. Message: ${Message}`
  ), "Report");
  const Deprecated = /* @__PURE__ */ __name((ExtensionID, Feature, Message) => {
    const ReportEffect = /* @__PURE__ */ __name((PropertyName) => Report(
      ExtensionID,
      `${Feature} (property: ${String(PropertyName)})`,
      Message
    ), "ReportEffect");
    return (Target, PropertyKey) => {
      let BackingField = Target[PropertyKey];
      let HasReported = false;
      const ReportOnce = /* @__PURE__ */ __name((Key) => {
        if (!HasReported) {
          Effect.runFork(ReportEffect(Key));
          HasReported = true;
        }
      }, "ReportOnce");
      Object.defineProperty(Target, PropertyKey, {
        configurable: true,
        enumerable: true,
        get() {
          ReportOnce(PropertyKey);
          return BackingField;
        },
        set(NewValue) {
          ReportOnce(PropertyKey);
          BackingField = NewValue;
        }
      });
    };
  }, "Deprecated");
  const ServiceImplementation = {
    Report,
    Deprecated
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
