var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { LoggerService } from "./Logger.js";
class APIDeprecationService extends Effect.Service()(
  "Service/APIDeprecation",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      const Report = /* @__PURE__ */ __name((ExtensionId, Usage, Message) => Logger.Warn(
        `Extension '${ExtensionId.value}' used deprecated API: '${Usage}'. Message: ${Message}`
      ), "Report");
      const Deprecated = /* @__PURE__ */ __name((ExtensionId, Feature, Message) => {
        const CreateReport = /* @__PURE__ */ __name((PropertyName) => Report(
          ExtensionId,
          `${Feature} (property: ${String(PropertyName)})`,
          Message
        ), "CreateReport");
        return (Target, PropertyKey) => {
          let BackingField = Target[PropertyKey];
          let HasReported = false;
          const ReportOnce = /* @__PURE__ */ __name((Key) => {
            if (!HasReported) {
              Effect.runFork(CreateReport(Key));
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
      return { Report, Deprecated };
    })
  }
) {
  static {
    __name(this, "APIDeprecationService");
  }
}
export {
  APIDeprecationService
};
//# sourceMappingURL=APIDeprecation.js.map
