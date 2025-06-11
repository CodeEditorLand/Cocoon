var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const CreateCommandsNamespace = /* @__PURE__ */ __name((CommandsService, Extension) => ({
  /**
   * Registers a command.
   */
  registerCommand: /* @__PURE__ */ __name((Id, Handler, ThisArgument) => CommandsService.RegisterCommand(Id, Handler, ThisArgument, Extension), "registerCommand"),
  /**
   * Registers a command that is only active when a text editor has focus.
   */
  registerTextEditorCommand: /* @__PURE__ */ __name((Id, Handler, ThisArgument) => CommandsService.RegisterTextEditorCommand(
    Id,
    Handler,
    ThisArgument,
    Extension
  ), "registerTextEditorCommand"),
  /**
   * Executes a command.
   * It converts the `Effect`-based service call into a `Promise`, as
   * expected by the `vscode` API.
   */
  executeCommand: /* @__PURE__ */ __name((Id, ...Argument) => Effect.runPromise(CommandsService.ExecuteCommand(Id, ...Argument)), "executeCommand"),
  /**
   * Retrieves a list of all available command IDs.
   * It converts the `Effect`-based service call into a `Promise`, as
   * expected by the `vscode` API.
   */
  getCommands: /* @__PURE__ */ __name((FilterInternal) => Effect.runPromise(CommandsService.GetCommands(FilterInternal)), "getCommands")
}), "CreateCommandsNamespace");
export {
  CreateCommandsNamespace
};
//# sourceMappingURL=CreateCommandsNamespace.js.map
