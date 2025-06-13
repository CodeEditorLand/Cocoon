var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
function CreateCommandNamespace(CommandService, Extension) {
  return {
    /**
     * Registers a command.
     */
    registerCommand: /* @__PURE__ */ __name((ID, Handler, ThisArgument) => CommandService.RegisterCommand(
      ID,
      Handler,
      ThisArgument,
      Extension
    ), "registerCommand"),
    /**
     * Registers a command that is only active when a text editor has focus.
     */
    registerTextEditorCommand: /* @__PURE__ */ __name((ID, Handler, ThisArgument) => CommandService.RegisterTextEditorCommand(
      ID,
      Handler,
      ThisArgument,
      Extension
    ), "registerTextEditorCommand"),
    /**
     * Executes a command.
     * It converts the `Effect`-based service call into a `Promise`, as
     * expected by the `vscode` API.
     */
    executeCommand: /* @__PURE__ */ __name((ID, ...Argument) => Effect.runPromise(
      CommandService.ExecuteCommand(ID, ...Argument)
    ), "executeCommand"),
    /**
     * Retrieves a list of all available command IDs.
     * It converts the `Effect`-based service call into a `Promise`, as
     * expected by the `vscode` API.
     */
    getCommands: /* @__PURE__ */ __name((FilterInternal) => Effect.runPromise(CommandService.GetCommands(FilterInternal)), "getCommands")
  };
}
__name(CreateCommandNamespace, "CreateCommandNamespace");
export {
  CreateCommandNamespace
};
//# sourceMappingURL=CreateCommandNamespace.js.map
