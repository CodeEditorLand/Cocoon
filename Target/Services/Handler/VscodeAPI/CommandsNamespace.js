var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/CommandsNamespace.ts
var CreateCommandsNamespace = /* @__PURE__ */ __name((Context, LanguageProviderRegistry) => ({
  registerCommand: /* @__PURE__ */ __name((Command, Callback) => {
    LanguageProviderRegistry.RegisterCommand(Command, Callback);
    Context.SendToMountain("registerCommand", { commandId: Command }).catch(
      () => {
      }
    );
    return {
      dispose: /* @__PURE__ */ __name(() => {
        LanguageProviderRegistry.UnregisterCommand(Command);
        Context.SendToMountain("unregisterCommand", {
          commandId: Command
        }).catch(() => {
        });
      }, "dispose")
    };
  }, "registerCommand"),
  registerTextEditorCommand: /* @__PURE__ */ __name((Command, Callback) => {
    LanguageProviderRegistry.RegisterCommand(Command, Callback);
    Context.SendToMountain("registerCommand", {
      commandId: Command,
      kind: "textEditor"
    }).catch(() => {
    });
    return {
      dispose: /* @__PURE__ */ __name(() => {
        LanguageProviderRegistry.UnregisterCommand(Command);
        Context.SendToMountain("unregisterCommand", {
          commandId: Command
        }).catch(() => {
        });
      }, "dispose")
    };
  }, "registerTextEditorCommand"),
  executeCommand: /* @__PURE__ */ __name(async (Command, ...Arguments) => {
    const LocalResult = LanguageProviderRegistry.ExecuteCommand(
      Command,
      ...Arguments
    );
    if (LocalResult !== void 0) return LocalResult;
    try {
      return await Context.MountainClient?.sendRequest(
        "Command.Execute",
        [Command, ...Arguments]
      );
    } catch {
      return void 0;
    }
  }, "executeCommand"),
  getCommands: /* @__PURE__ */ __name(async (FilterInternal) => {
    try {
      const Response = await Context.MountainClient?.sendRequest(
        "Command.GetAll",
        [FilterInternal ?? false]
      );
      if (Array.isArray(Response)) return Response;
      return [];
    } catch {
      return [];
    }
  }, "getCommands"),
  // `onDidExecuteCommand` - stock VS Code event that fires post-dispatch
  // for any `executeCommand` call. Extensions (vim, gitlens, telemetry
  // collectors) subscribe to observe user-invoked commands. Land doesn't
  // surface a post-dispatch stream yet; stub with a no-op disposable so
  // the subscription doesn't crash. Emitting real events requires a hook
  // in the Mountain Command.Execute effect to broadcast back - deferred.
  onDidExecuteCommand: /* @__PURE__ */ __name((_Listener) => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidExecuteCommand")
}), "CreateCommandsNamespace");
var CommandsNamespace_default = CreateCommandsNamespace;
export {
  CommandsNamespace_default as default
};
//# sourceMappingURL=CommandsNamespace.js.map
