var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";
import { LoggerService } from "./Logger.js";
class HostKindPickerService extends Effect.Service()(
  "Service/HostKindPicker",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      const Pick = /* @__PURE__ */ __name((ExtensionDescription) => Effect.gen(function* () {
        const DeclaredKinds = new Set(
          Array.isArray(ExtensionDescription.extensionKind) ? ExtensionDescription.extensionKind : ExtensionDescription.extensionKind ? [ExtensionDescription.extensionKind] : ["workspace"]
        );
        const HasNodeRequirement = DeclaredKinds.has("workspace") || DeclaredKinds.has("ui") && !ExtensionDescription.browser;
        if (HasNodeRequirement) {
          yield* Logger.Trace(
            `HostKindPicker: Selecting LocalProcess for extension '${ExtensionDescription.identifier.value}'.`
          );
          return ExtensionHostKind.LocalProcess;
        }
        if (DeclaredKinds.has("web") && !HasNodeRequirement) {
          yield* Logger.Trace(
            `HostKindPicker: Extension '${ExtensionDescription.identifier.value}' is Web-only and not suitable for Cocoon.`
          );
          return null;
        }
        yield* Logger.Warn(
          `HostKindPicker: No suitable host kind found for extension '${ExtensionDescription.identifier.value}'. Defaulting to 'null'.`
        );
        return null;
      }), "Pick");
      return { Pick };
    })
  }
) {
  static {
    __name(this, "HostKindPickerService");
  }
}
export {
  HostKindPickerService
};
//# sourceMappingURL=HostKindPicker.js.map
