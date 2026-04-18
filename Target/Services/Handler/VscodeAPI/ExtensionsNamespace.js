var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/ExtensionsNamespace.ts
var NoopDisposable = { dispose: /* @__PURE__ */ __name(() => {
}, "dispose") };
var MakeMultiStub = /* @__PURE__ */ __name(() => {
  const StubTarget = /* @__PURE__ */ __name(function MultiStub() {
    return StubProxy;
  }, "MultiStub");
  StubTarget.dispose = () => {
  };
  StubTarget[Symbol.iterator] = function* () {
  };
  const ArrayShim = [];
  const ArrayMethods = [
    "forEach",
    "map",
    "filter",
    "find",
    "findIndex",
    "some",
    "every",
    "reduce",
    "reduceRight",
    "includes",
    "indexOf",
    "lastIndexOf",
    "slice",
    "concat",
    "join",
    "entries",
    "keys",
    "values",
    "flat",
    "flatMap"
  ];
  for (const Name of ArrayMethods) {
    StubTarget[Name] = ArrayShim[Name];
  }
  const StubProxy = new Proxy(StubTarget, {
    get(Target, Property) {
      if (Property in Target) {
        return Target[Property];
      }
      if (Property === "then") return void 0;
      if (typeof Property === "symbol") return void 0;
      return StubProxy;
    },
    apply() {
      return StubProxy;
    },
    has() {
      return true;
    }
  });
  return StubProxy;
}, "MakeMultiStub");
var Stub = MakeMultiStub();
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
        return Stub[Property];
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
      return Stub;
    }
  });
}, "MakePermissiveExports");
var NormalizeLocation = /* @__PURE__ */ __name((Raw) => {
  const VsCodeUri = globalThis.__cocoonVscodeAPI?.Uri;
  const UriFactoryAvailable = VsCodeUri && typeof VsCodeUri.file === "function";
  const MakeUri = /* @__PURE__ */ __name((Path) => {
    if (UriFactoryAvailable) {
      return VsCodeUri.file(Path);
    }
    return {
      scheme: "file",
      authority: "",
      path: Path,
      query: "",
      fragment: "",
      fsPath: Path,
      with(Change) {
        return { ...this, ...Change };
      },
      toString: /* @__PURE__ */ __name(() => `file://${Path}`, "toString"),
      toJSON() {
        return { scheme: "file", path: Path };
      }
    };
  }, "MakeUri");
  if (typeof Raw === "string" && Raw.length > 0) {
    let Path = Raw;
    if (Raw.startsWith("file:")) {
      try {
        Path = decodeURIComponent(new URL(Raw).pathname);
      } catch (Error2) {
        process.stdout.write(
          `[LandFix:ExtNs] URL parse failed for ${Raw}: ${Error2 instanceof Error2 ? Error2.message : String(Error2)}; using fallback strip
`
        );
        Path = Raw.replace(/^file:\/\//, "");
      }
    }
    Path = Path.replace(/\/$/, "");
    process.stdout.write(
      `[LandFix:ExtNs] string extensionLocation ${Raw} \u2192 path=${Path} (Uri factory=${UriFactoryAvailable ? "real" : "fallback"})
`
    );
    return { ExtensionPath: Path, ExtensionUri: MakeUri(Path) };
  }
  if (Raw && typeof Raw === "object") {
    const Obj = Raw;
    const Path = typeof Obj["fsPath"] === "string" && Obj["fsPath"] || typeof Obj["path"] === "string" && Obj["path"] || (typeof Obj["external"] === "string" ? NormalizeLocation(Obj["external"]).ExtensionPath : "");
    process.stdout.write(
      `[LandFix:ExtNs] object extensionLocation keys=[${Object.keys(Obj).join(",")}] \u2192 path=${Path} (Uri factory=${UriFactoryAvailable ? "real" : "fallback"})
`
    );
    return { ExtensionPath: Path, ExtensionUri: MakeUri(Path) };
  }
  process.stdout.write(
    `[LandFix:ExtNs] extensionLocation missing or unsupported type: ${typeof Raw}; using empty path
`
  );
  return { ExtensionPath: "", ExtensionUri: MakeUri("") };
}, "NormalizeLocation");
var ToExtensionObject = /* @__PURE__ */ __name((Context, Id, Raw) => {
  const Exports = MakePermissiveExports();
  const { ExtensionPath, ExtensionUri } = NormalizeLocation(
    Raw?.extensionLocation
  );
  return {
    id: Id,
    extensionUri: ExtensionUri,
    extensionPath: ExtensionPath,
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
