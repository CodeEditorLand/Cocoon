var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator.js";
import { ExtensionKind, Uri } from "vscode";
const CreateApiObject = /* @__PURE__ */ __name((Description, ExtensionHostService) => {
  const ActivateEffect = ExtensionHostService.ActivateById(
    Description.identifier,
    {
      startup: false,
      extensionId: Description.identifier,
      activationEvent: "api",
      activationKind: ActivationKind.Api
    }
  ).pipe(
    Effect.map(
      () => ExtensionHostService.GetExtensionExports(
        Description.identifier
      )
    )
  );
  const getExtensionKind = /* @__PURE__ */ __name(() => {
    if (Description.extensionKind?.includes("web"))
      return ExtensionKind.Web;
    if (Description.extensionKind?.includes("workspace"))
      return ExtensionKind.Workspace;
    return ExtensionKind.UI;
  }, "getExtensionKind");
  const ExtensionApiObject = {
    id: Description.identifier.value,
    extensionUri: Uri.from(Description.extensionLocation),
    extensionPath: Description.extensionLocation.fsPath,
    get isActive() {
      return ExtensionHostService.IsActivated(Description.identifier);
    },
    get packageJSON() {
      return Description;
    },
    extensionKind: getExtensionKind(),
    get exports() {
      return ExtensionHostService.GetExtensionExports(
        Description.identifier
      );
    },
    activate: /* @__PURE__ */ __name(() => Effect.runPromise(ActivateEffect), "activate")
  };
  return Object.freeze(ExtensionApiObject);
}, "CreateApiObject");
export {
  CreateApiObject
};
//# sourceMappingURL=CreateApiObject.js.map
