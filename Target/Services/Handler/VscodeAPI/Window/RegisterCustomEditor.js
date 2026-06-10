var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Language/Provider/Registry.ts
var Callbacks = /* @__PURE__ */ new Map();
function Register(Handle, Provider) {
  Callbacks.set(Handle, Provider);
}
__name(Register, "Register");
function Unregister(Handle) {
  Callbacks.delete(Handle);
}
__name(Unregister, "Unregister");
function Get(Handle) {
  const Provider = Callbacks.get(Handle);
  if (process.env.Trace) {
    CocoonDevLog(
      "registry",
      `[DEV:LANG] Get(handle=${Handle}) resolved=${Boolean(Provider)} (total_registered=${Callbacks.size})`
    );
  }
  return Provider;
}
__name(Get, "Get");
var NextHandle = 1e4;
function RegisterAutoHandle(Provider) {
  const Handle = NextHandle++;
  Callbacks.set(Handle, Provider);
  return Handle;
}
__name(RegisterAutoHandle, "RegisterAutoHandle");
function NextProviderHandle() {
  return NextHandle++;
}
__name(NextProviderHandle, "NextProviderHandle");
var Commands = /* @__PURE__ */ new Map();
function RegisterCommand(CommandId, Callback) {
  Commands.set(CommandId, Callback);
}
__name(RegisterCommand, "RegisterCommand");
function HasCommand(CommandId) {
  return Commands.has(CommandId);
}
__name(HasCommand, "HasCommand");
function ExecuteCommand(CommandId, ...Args) {
  const Handler = Commands.get(CommandId);
  if (Handler) return Handler(...Args);
  return void 0;
}
__name(ExecuteCommand, "ExecuteCommand");
function UnregisterCommand(CommandId) {
  Commands.delete(CommandId);
}
__name(UnregisterCommand, "UnregisterCommand");
function ListCommands() {
  return Array.from(Commands.keys());
}
__name(ListCommands, "ListCommands");
function ListHandles() {
  return Array.from(Callbacks.keys());
}
__name(ListHandles, "ListHandles");

// Source/Services/Handler/VscodeAPI/Window/Registry.ts
var TreeDataProviders = /* @__PURE__ */ new Map();
var TreeDataProvidersByViewId = /* @__PURE__ */ new Map();
var WebviewViewProviders = /* @__PURE__ */ new Map();
var WebviewViewBuilders = /* @__PURE__ */ new Map();
var CustomEditorProviders = /* @__PURE__ */ new Map();
var CustomEditorProvidersByViewType = /* @__PURE__ */ new Map();
var WebviewPanels = /* @__PURE__ */ new Map();

// Source/Services/Handler/VscodeAPI/Window/RegisterCustomEditor.ts
var RegisterCustomEditor = /* @__PURE__ */ __name((Context, ViewType, Provider, Options, IsReadonly) => {
  const Handle = NextProviderHandle();
  CustomEditorProviders.set(String(Handle), Provider);
  CustomEditorProvidersByViewType.set(ViewType, {
    Provider,
    Readonly: IsReadonly,
    Handle
  });
  let Selector = [];
  for (const [, Ext] of Context.ExtensionRegistry) {
    const Contributions = Ext?.contributes?.customEditors;
    if (Array.isArray(Contributions)) {
      const Match = Contributions.find(
        (CE) => CE?.viewType === ViewType
      );
      if (Match?.selector) {
        Selector = Array.isArray(Match.selector) ? Match.selector : [Match.selector];
        break;
      }
    }
  }
  Context.MountainClient?.sendRequest("webview.registerCustomEditor", {
    handle: Handle,
    viewType: ViewType,
    selector: Selector,
    options: {
      readonly: IsReadonly,
      supportsMultipleEditorsPerDocument: Options.supportsMultipleEditorsPerDocument ?? false,
      webviewOptions: Options.webviewOptions ?? {}
    }
  }).catch(() => {
  });
  const SafeAwait = /* @__PURE__ */ __name(async (Channel, MethodName, Payload) => {
    const Entry = CustomEditorProvidersByViewType.get(
      Payload?.viewType ?? ViewType
    );
    if (!Entry || Entry.Handle !== Handle) return void 0;
    if (Entry.Readonly && MethodName !== "resolveCustomEditor")
      return void 0;
    const Method = Entry.Provider?.[MethodName];
    if (typeof Method !== "function") return void 0;
    try {
      const Result = await Method.call(
        Entry.Provider,
        Payload?.document,
        Payload?.context ?? Payload?.destination,
        Payload?.token
      );
      return Result;
    } catch (Error2) {
      try {
        process.stdout.write(
          `[CustomEditor:${Channel}] provider for "${ViewType}" threw: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}
`
        );
      } catch {
      }
      return void 0;
    }
  }, "SafeAwait");
  const Listeners = [];
  const Subscribe = /* @__PURE__ */ __name((Channel, MethodName) => {
    const Listener = /* @__PURE__ */ __name((Payload) => {
      void SafeAwait(Channel, MethodName, Payload);
    }, "Listener");
    Context.Emitter.on(Channel, Listener);
    Listeners.push({ Channel, Listener });
  }, "Subscribe");
  Subscribe("customEditor.saveDocument", "saveCustomDocument");
  Subscribe("customEditor.saveDocumentAs", "saveCustomDocumentAs");
  Subscribe("customEditor.revertCustomDocument", "revertCustomDocument");
  Subscribe("customEditor.backupCustomDocument", "backupCustomDocument");
  Subscribe("customEditor.willSaveCustomDocument", "willSaveCustomDocument");
  Subscribe(
    "customEditor.didChangeCustomDocument",
    "didChangeCustomDocument"
  );
  return {
    dispose: /* @__PURE__ */ __name(() => {
      for (const { Channel, Listener } of Listeners) {
        Context.Emitter.off(
          Channel,
          Listener
        );
      }
      Listeners.length = 0;
      CustomEditorProviders.delete(String(Handle));
      const ByViewType = CustomEditorProvidersByViewType.get(ViewType);
      if (ByViewType && ByViewType.Handle === Handle) {
        CustomEditorProvidersByViewType.delete(ViewType);
      }
      Context.MountainClient?.sendRequest(
        "webview.unregisterCustomEditor",
        { handle: Handle, viewType: ViewType }
      ).catch(() => {
      });
    }, "dispose")
  };
}, "RegisterCustomEditor");
var RegisterCustomEditor_default = RegisterCustomEditor;
export {
  RegisterCustomEditor_default as default
};
//# sourceMappingURL=RegisterCustomEditor.js.map
