var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const CreateCommandNamespace = /* @__PURE__ */ __name((CommandService, ExtensionDescription) => {
  return {
    registerCommand: /* @__PURE__ */ __name((ID, Handler, ThisArgument) => CommandService.RegisterCommand(
      ID,
      Handler,
      ThisArgument,
      ExtensionDescription
    ), "registerCommand"),
    registerTextEditorCommand: /* @__PURE__ */ __name((ID, Handler, ThisArgument) => CommandService.RegisterTextEditorCommand(
      ID,
      Handler,
      ThisArgument,
      ExtensionDescription
    ), "registerTextEditorCommand"),
    registerDiffInformationCommand: /* @__PURE__ */ __name((ID, Handler, ThisArgument) => {
      return CommandService.RegisterCommand(
        ID,
        Handler,
        ThisArgument,
        ExtensionDescription
      );
    }, "registerDiffInformationCommand"),
    executeCommand: /* @__PURE__ */ __name((ID, ...Argument) => Effect.runPromise(
      CommandService.ExecuteCommand(ID, ...Argument)
    ), "executeCommand"),
    getCommands: /* @__PURE__ */ __name((FilterInternal) => Effect.runPromise(CommandService.GetCommands(FilterInternal)), "getCommands")
  };
}, "CreateCommandNamespace");
var CreateCommandNamespace_default = CreateCommandNamespace;
export {
  CreateCommandNamespace_default as default
};
//# sourceMappingURL=CreateCommandNamespace.js.map
