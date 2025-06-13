var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Log } from "../Log.js";
const Definition = Effect.gen(function* (_) {
  const LogService = yield* _(Log.Tag);
  const Report = /* @__PURE__ */ __name((ExtensionID, Usage, Message) => LogService.Warn(
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
      let hasReported = false;
      const reportOnce = /* @__PURE__ */ __name((key) => {
        if (!hasReported) {
          Effect.runFork(ReportEffect(key));
          hasReported = true;
        }
      }, "reportOnce");
      Object.defineProperty(Target, PropertyKey, {
        configurable: true,
        enumerable: true,
        get() {
          reportOnce(PropertyKey);
          return BackingField;
        },
        set(NewValue) {
          reportOnce(PropertyKey);
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
  Definition
};
//# sourceMappingURL=Definition.js.map
