var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/ExtensionsNamespace.ts
var ToExtensionObject = /* @__PURE__ */ __name((Context, Id, Raw) => ({
  id: Id,
  extensionUri: Raw?.extensionLocation ?? { scheme: "file", path: "", fsPath: "" },
  extensionPath: Raw?.extensionLocation?.fsPath ?? Raw?.extensionLocation?.path ?? "",
  isActive: Context.ActivatedExtensions.has(Id),
  packageJSON: Raw,
  extensionKind: 1,
  exports: void 0,
  activate: /* @__PURE__ */ __name(async () => {
  }, "activate")
}), "ToExtensionObject");
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
