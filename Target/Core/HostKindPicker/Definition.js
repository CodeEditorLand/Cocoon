var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";
import { LogProvider } from "../../Service/Log.js";
const Definition = Effect.gen(function* (_) {
  const Log = yield* _(LogProvider.Tag);
  const PickHostKindEffect = /* @__PURE__ */ __name((Extension) => Effect.gen(function* (_2) {
    const DeclaredKinds = new Set(
      Array.isArray(Extension.extensionKinds) ? Extension.extensionKinds : Extension.extensionKinds ? [Extension.extensionKinds] : ["workspace"]
    );
    const HasNodeRequirement = DeclaredKinds.has("workspace") || DeclaredKinds.has("ui") && !Extension.browser;
    if (HasNodeRequirement) {
      yield* _2(
        Log.Trace(
          `HostKindPicker: Selecting LocalProcess for extension '${Extension.identifier.value}'.`
        )
      );
      return ExtensionHostKind.LocalProcess;
    }
    if (DeclaredKinds.has("web") && !HasNodeRequirement) {
      yield* _2(
        Log.Trace(
          `HostKindPicker: Extension '${Extension.identifier.value}' is Web-only and not suitable for Cocoon.`
        )
      );
      return null;
    }
    yield* _2(
      Log.Warn(
        `HostKindPicker: No suitable host kind found for extension '${Extension.identifier.value}'.`
      )
    );
    return null;
  }), "PickHostKindEffect");
  const ServiceImplementation = {
    PickHostKind: PickHostKindEffect
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
