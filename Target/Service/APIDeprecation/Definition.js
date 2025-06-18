var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import LogService from "../Log/Service.js";
var Definition_default = Effect.gen(function* (G) {
  const Log = yield* G(LogService);
  const ReportEffect = /* @__PURE__ */ __name((ExtensionID, Usage, Message) => Log.Warn(
    `Extension '${ExtensionID.value}' used deprecated API: '${Usage}'. Message: ${Message}`
  ), "ReportEffect");
  const DeprecatedDecorator = /* @__PURE__ */ __name((ExtensionID, Feature, Message) => {
    const CreateReportEffect = /* @__PURE__ */ __name((PropertyName) => ReportEffect(
      ExtensionID,
      `${Feature} (property: ${String(PropertyName)})`,
      Message
    ), "CreateReportEffect");
    return (Target, PropertyKey) => {
      let BackingField = Target[PropertyKey];
      let HasReported = false;
      const ReportOnce = /* @__PURE__ */ __name((Key) => {
        if (!HasReported) {
          Effect.runFork(CreateReportEffect(Key));
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
  }, "DeprecatedDecorator");
  const ServiceImplementation = {
    Report: ReportEffect,
    Deprecated: DeprecatedDecorator
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
