var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { LogProvider } from "../Log.js";
const Definition = Effect.gen(function* (_) {
  const Log = yield* _(LogProvider.Tag);
  const Report = /* @__PURE__ */ __name((ExtensionId, Usage, Message) => Log.Warn(
    `Extension '${ExtensionId.value}' used deprecated API: '${Usage}'. Message: ${Message}`
  ), "Report");
  const Deprecated = /* @__PURE__ */ __name((ExtensionId, Feature, Message) => {
    const ReportEffect = /* @__PURE__ */ __name((PropertyName) => Report(
      ExtensionId,
      `${Feature} (property: ${String(PropertyName)})`,
      Message
    ), "ReportEffect");
    return (Target, PropertyKey) => {
      let BackingField = Target[PropertyKey];
      Object.defineProperty(Target, PropertyKey, {
        configurable: true,
        enumerable: true,
        get() {
          Effect.runFork(ReportEffect(PropertyKey));
          return BackingField;
        },
        set(NewValue) {
          Effect.runFork(ReportEffect(PropertyKey));
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
