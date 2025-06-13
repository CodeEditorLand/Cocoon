var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";
import { Log } from "../../Service/Log.js";
const Definition = Effect.gen(function* (_) {
  const LogService = yield* _(Log.Tag);
  const PickHostKind = /* @__PURE__ */ __name((Extension) => Effect.gen(function* (_2) {
    const DeclaredKinds = new Set(
      Array.isArray(Extension.extensionKind) ? Extension.extensionKind : Extension.extensionKind ? [Extension.extensionKind] : ["workspace"]
    );
    const HasNodeRequirement = DeclaredKinds.has("workspace") || DeclaredKinds.has("ui") && !Extension.browser;
    if (HasNodeRequirement) {
      yield* _2(
        LogService.Trace(
          `HostKindPicker: Selecting LocalProcess for extension '${Extension.identifier.value}'.`
        )
      );
      return ExtensionHostKind.LocalProcess;
    }
    if (DeclaredKinds.has("web") && !HasNodeRequirement) {
      yield* _2(
        LogService.Trace(
          `HostKindPicker: Extension '${Extension.identifier.value}' is Web-only and not suitable for Cocoon.`
        )
      );
      return null;
    }
    yield* _2(
      LogService.Warn(
        `HostKindPicker: No suitable host kind found for extension '${Extension.identifier.value}'. Defaulting to 'null'.`
      )
    );
    return null;
  }), "PickHostKind");
  return {
    PickHostKind
  };
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
