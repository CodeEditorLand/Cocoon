var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ExtensionKind } from "vscode";
const CreateAPIObject = /* @__PURE__ */ __name((Description, ExtensionHost) => {
  const ActivateEffect = Effect.gen(function* () {
    yield* ExtensionHost.ActivateById(Description.identifier, {
      startup: false,
      extensionId: Description.identifier,
      activationEvent: "api"
    });
    const Exports = yield* ExtensionHost.GetExtensionExports(
      Description.identifier
    );
    return Exports;
  });
  const GetExtensionKind = /* @__PURE__ */ __name(() => {
    const Kinds = Array.isArray(Description.extensionKind) ? Description.extensionKind : Description.extensionKind ? [Description.extensionKind] : ["workspace"];
    if (Kinds.includes("workspace")) {
      return ExtensionKind.Workspace;
    }
    return ExtensionKind.UI;
  }, "GetExtensionKind");
  const ExtensionAPIObject = {
    id: Description.identifier.value,
    extensionUri: Description.extensionLocation,
    extensionPath: Description.extensionLocation.fsPath,
    get isActive() {
      return Effect.runSync(
        ExtensionHost.IsActivated(Description.identifier)
      );
    },
    get packageJSON() {
      return Description;
    },
    extensionKind: GetExtensionKind(),
    get exports() {
      return Effect.runSync(
        Effect.catchAll(
          ExtensionHost.GetExtensionExports(Description.identifier),
          () => Effect.succeed(void 0)
        )
      );
    },
    activate: /* @__PURE__ */ __name(() => Effect.runPromise(ActivateEffect), "activate"),
    // `isFromDifferentExtensionHost` is a proposed API field, default to false.
    isFromDifferentExtensionHost: false
  };
  return Object.freeze(ExtensionAPIObject);
}, "CreateAPIObject");
var CreateAPIObject_default = CreateAPIObject;
export {
  CreateAPIObject_default as default
};
//# sourceMappingURL=CreateAPIObject.js.map
