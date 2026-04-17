var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/ExtensionsNamespace.ts
var NoopDisposable = { dispose: /* @__PURE__ */ __name(() => {
}, "dispose") };
var MakePermissiveExports = /* @__PURE__ */ __name(() => {
  const Base = {
    enabled: true
  };
  return new Proxy(Base, {
    get(Target, Property) {
      if (Property in Target) {
        return Target[Property];
      }
      if (typeof Property !== "string") {
        return void 0;
      }
      if (Property === "then") return void 0;
      if (Property.startsWith("onDid") || Property.startsWith("onWill")) {
        return (_Listener) => NoopDisposable;
      }
      if (Property.startsWith("register")) {
        return (..._Args) => NoopDisposable;
      }
      if (Property.startsWith("get") || Property.startsWith("create")) {
        return (..._Args) => MakePermissiveExports();
      }
      return (..._Args) => void 0;
    }
  });
}, "MakePermissiveExports");
var ToExtensionObject = /* @__PURE__ */ __name((Context, Id, Raw) => {
  const Exports = MakePermissiveExports();
  return {
    id: Id,
    extensionUri: Raw?.extensionLocation ?? {
      scheme: "file",
      path: "",
      fsPath: ""
    },
    extensionPath: Raw?.extensionLocation?.fsPath ?? Raw?.extensionLocation?.path ?? "",
    // Reporting `isActive: true` mirrors VS Code's behaviour for
    // built-ins that have completed activation; without it, callers
    // like the `github` extension treat the extension as missing.
    isActive: true,
    packageJSON: Raw,
    extensionKind: 1,
    exports: Exports,
    // Critical: `activate()` must resolve to the SAME exports object
    // so consumers like `vscode.github` can chain
    // `gitExtension.activate().then(api => api.onDidChangeEnablement(...))`.
    activate: /* @__PURE__ */ __name(async () => Exports, "activate")
  };
}, "ToExtensionObject");
var CreateExtensionsNamespace = /* @__PURE__ */ __name((Context) => ({
  getExtension: /* @__PURE__ */ __name((Identifier) => {
    const Raw = Context.ExtensionRegistry.get(Identifier);
    return Raw ? ToExtensionObject(Context, Identifier, Raw) : void 0;
  }, "getExtension"),
  get all() {
    return [...Context.ExtensionRegistry.entries()].map(
      ([Id, Raw]) => ToExtensionObject(Context, Id, Raw)
    );
  },
  // Some extensions (html-language-features) iterate
  // `extensions.allAcrossExtensionHosts`; return the same array as `all`
  // so `for (...of...)` does not throw on `is not iterable`.
  get allAcrossExtensionHosts() {
    return [...Context.ExtensionRegistry.entries()].map(
      ([Id, Raw]) => ToExtensionObject(Context, Id, Raw)
    );
  },
  onDidChange: /* @__PURE__ */ __name((Listener) => {
    Context.Emitter.on("deltaExtensions", Listener);
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.Emitter.off("deltaExtensions", Listener);
      }, "dispose")
    };
  }, "onDidChange")
}), "CreateExtensionsNamespace");
var ExtensionsNamespace_default = CreateExtensionsNamespace;
export {
  ExtensionsNamespace_default as default
};
//# sourceMappingURL=ExtensionsNamespace.js.map
