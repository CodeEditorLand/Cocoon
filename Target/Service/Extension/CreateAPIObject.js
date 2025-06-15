var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ActivationKind, ExtensionKind, Uri } from "vscode";
const CreateAPIObject = /* @__PURE__ */ __name((Description, ExtensionHost) => {
  const Activate = ExtensionHost.ActivateById(Description.identifier, {
    startup: false,
    extensionId: Description.identifier,
    activationEvent: "api",
    activationKind: ActivationKind.API
  }).pipe(
    Effect.map(
      () => ExtensionHost.GetExtensionExports(Description.identifier)
    )
  );
  const GetExtensionKind = /* @__PURE__ */ __name(() => {
    if (Description.extensionKind?.includes("web")) {
      return ExtensionKind.Web;
    }
    if (Description.extensionKind?.includes("workspace")) {
      return ExtensionKind.Workspace;
    }
    return ExtensionKind.UI;
  }, "GetExtensionKind");
  const ExtensionAPIObject = {
    id: Description.identifier.value,
    extensionUri: Uri.revive(Description.extensionLocation),
    extensionPath: Description.extensionLocation.fsPath,
    get isActive() {
      return ExtensionHost.IsActivated(Description.identifier);
    },
    get packageJSON() {
      return Description;
    },
    extensionKind: GetExtensionKind(),
    get exports() {
      return ExtensionHost.GetExtensionExports(Description.identifier);
    },
    activate: /* @__PURE__ */ __name(() => Effect.runPromise(Activate), "activate"),
    isFromDifferentExtensionHost: false
    // Assuming it's always local
  };
  return Object.freeze(ExtensionAPIObject);
}, "CreateAPIObject");
var CreateAPIObject_default = CreateAPIObject;
export {
  CreateAPIObject_default as default
};
//# sourceMappingURL=CreateAPIObject.js.map
