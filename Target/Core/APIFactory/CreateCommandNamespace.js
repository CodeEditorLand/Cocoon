var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const CreateCommandNamespace = /* @__PURE__ */ __name((CommandServiceInstance, ExtensionDescription) => {
  const RegisterCommand = /* @__PURE__ */ __name((ID, Handler, ThisArgument) => CommandServiceInstance.RegisterCommand(
    ID,
    Handler,
    ThisArgument,
    ExtensionDescription
  ), "RegisterCommand");
  const RegisterTextEditorCommand = /* @__PURE__ */ __name((ID, Handler, ThisArgument) => CommandServiceInstance.RegisterTextEditorCommand(
    ID,
    Handler,
    ThisArgument,
    ExtensionDescription
  ), "RegisterTextEditorCommand");
  const ExecuteCommand = /* @__PURE__ */ __name((ID, ...Argument) => CommandServiceInstance.ExecuteCommand(ID, ...Argument), "ExecuteCommand");
  const GetCommands = /* @__PURE__ */ __name((FilterInternal) => CommandServiceInstance.GetCommands(FilterInternal), "GetCommands");
  return {
    registerCommand: RegisterCommand,
    registerTextEditorCommand: RegisterTextEditorCommand,
    registerDiffInformationCommand: RegisterCommand,
    // Alias to generic registration
    executeCommand: ExecuteCommand,
    // Cast to `any` to satisfy the `Promise` in the vscode.d.ts, will be handled by caller
    getCommands: GetCommands
    // Cast to `any` to satisfy the `Promise` in the vscode.d.ts, will be handled by caller
  };
}, "CreateCommandNamespace");
var CreateCommandNamespace_default = CreateCommandNamespace;
export {
  CreateCommandNamespace_default as default
};
//# sourceMappingURL=CreateCommandNamespace.js.map
