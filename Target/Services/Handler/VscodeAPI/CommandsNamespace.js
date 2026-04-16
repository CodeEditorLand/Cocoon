var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/CommandsNamespace.ts
var CreateCommandsNamespace = /* @__PURE__ */ __name((Context, LanguageProviderRegistry) => ({
  registerCommand: /* @__PURE__ */ __name((Command, Callback) => {
    LanguageProviderRegistry.RegisterCommand(Command, Callback);
    Context.SendToMountain("registerCommand", { commandId: Command }).catch(() => {
    });
    return { dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") };
  }, "registerCommand"),
  executeCommand: /* @__PURE__ */ __name(async (Command, ...Arguments) => {
    const LocalResult = LanguageProviderRegistry.ExecuteCommand(Command, ...Arguments);
    if (LocalResult !== void 0) return LocalResult;
    try {
      return await Context.MountainClient?.sendRequest("executeCommand", { commandId: Command, arguments: Arguments });
    } catch {
      return void 0;
    }
  }, "executeCommand"),
  getCommands: /* @__PURE__ */ __name(async () => [], "getCommands")
}), "CreateCommandsNamespace");
var CommandsNamespace_default = CreateCommandsNamespace;
export {
  CommandsNamespace_default as default
};
//# sourceMappingURL=CommandsNamespace.js.map
