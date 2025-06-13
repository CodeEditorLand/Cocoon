var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator.js";
import { ExtensionKind, Uri } from "vscode";
function CreateAPIObject(Description, ExtensionHostService) {
  const Activate = ExtensionHostService.ActivateById(Description.identifier, {
    startup: false,
    extensionId: Description.identifier,
    activationEvent: "api",
    activationKind: ActivationKind.API
  }).pipe(
    Effect.map(
      () => ExtensionHostService.GetExtensionExports(
        Description.identifier
      )
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
      return ExtensionHostService.IsActivated(Description.identifier);
    },
    get packageJSON() {
      return Description;
    },
    extensionKind: GetExtensionKind(),
    get exports() {
      return ExtensionHostService.GetExtensionExports(
        Description.identifier
      );
    },
    activate: /* @__PURE__ */ __name(() => Effect.runPromise(Activate), "activate")
  };
  return Object.freeze(ExtensionAPIObject);
}
__name(CreateAPIObject, "CreateAPIObject");
export {
  CreateAPIObject
};
//# sourceMappingURL=CreateAPIObject.js.map
