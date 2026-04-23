var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/LanguageProviderRegistry.ts
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
  if (process.env.LAND_DEV_LOG) {
    console.warn(
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

// Source/Services/Handler/VscodeAPI/AuthenticationNamespace.ts
var EventSubscriber = /* @__PURE__ */ __name((Context, EventName) => (Listener) => {
  Context.Emitter.on(EventName, Listener);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.Emitter.off(EventName, Listener);
    }, "dispose")
  };
}, "EventSubscriber");
var CreateAuthenticationNamespace = /* @__PURE__ */ __name((Context) => ({
  registerAuthenticationProvider: /* @__PURE__ */ __name((ProviderId, Label, _Provider, Options) => {
    const Handle = NextProviderHandle();
    Context.SendToMountain("register_authentication_provider", {
      handle: Handle,
      provider_id: ProviderId,
      label: Label,
      supports_multiple_accounts: Options?.supportsMultipleAccounts ?? false,
      extension_id: ""
    }).catch(() => {
    });
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.SendToMountain("unregister_authentication_provider", {
          handle: Handle
        }).catch(() => {
        });
      }, "dispose")
    };
  }, "registerAuthenticationProvider"),
  getSession: /* @__PURE__ */ __name(async (ProviderId, Scopes, Options) => {
    try {
      return await Context.MountainClient?.sendRequest(
        "Authentication.GetSession",
        [ProviderId, Scopes, Options ?? {}]
      );
    } catch {
      return void 0;
    }
  }, "getSession"),
  getAccounts: /* @__PURE__ */ __name(async (ProviderId) => {
    try {
      const Result = await Context.MountainClient?.sendRequest(
        "Authentication.GetAccounts",
        [ProviderId]
      );
      return Array.isArray(Result) ? Result : [];
    } catch {
      return [];
    }
  }, "getAccounts"),
  onDidChangeSessions: EventSubscriber(Context, "auth.didChangeSessions")
}), "CreateAuthenticationNamespace");
var AuthenticationNamespace_default = CreateAuthenticationNamespace;
export {
  AuthenticationNamespace_default as default
};
//# sourceMappingURL=AuthenticationNamespace.js.map
