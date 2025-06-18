var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";
import LogService from "../../Service/Log/Service.js";
var Definition_default = Effect.gen(function* () {
  const Log = yield* LogService;
  const PickHostKind = /* @__PURE__ */ __name((ExtensionDescription) => Effect.gen(function* () {
    const DeclaredKinds = new Set(
      Array.isArray(ExtensionDescription.extensionKind) ? ExtensionDescription.extensionKind : ExtensionDescription.extensionKind ? [ExtensionDescription.extensionKind] : ["workspace"]
    );
    const HasNodeRequirement = DeclaredKinds.has("workspace") || DeclaredKinds.has("ui") && !ExtensionDescription.browser;
    if (HasNodeRequirement) {
      yield* Log.Trace(
        `HostKindPicker: Selecting LocalProcess for extension '${ExtensionDescription.identifier.value}'.`
      );
      return ExtensionHostKind.LocalProcess;
    }
    if (DeclaredKinds.has("web") && !HasNodeRequirement) {
      yield* Log.Trace(
        `HostKindPicker: Extension '${ExtensionDescription.identifier.value}' is Web-only and not suitable for Cocoon.`
      );
      return null;
    }
    yield* Log.Warn(
      `HostKindPicker: No suitable host kind found for extension '${ExtensionDescription.identifier.value}'. Defaulting to 'null'.`
    );
    return null;
  }), "PickHostKind");
  const HostKindPickerImplementation = {
    PickHostKind
  };
  return HostKindPickerImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
