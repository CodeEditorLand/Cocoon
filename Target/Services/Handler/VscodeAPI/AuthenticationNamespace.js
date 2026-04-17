var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/AuthenticationNamespace.ts
var AuthProviderCounter = 0;
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
    const Handle = `authProvider:${++AuthProviderCounter}`;
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
