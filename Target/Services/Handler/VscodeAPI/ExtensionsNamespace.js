var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/LandFixLog.ts
var Mode = process.env["LAND_LANDFIX_LOG"] ?? "short";
var Enabled = Mode !== "off";
var Long = Mode === "long";
var DebugEnabled = Long;
var AllowList = (() => {
  const Raw = process.env["LAND_LANDFIX_TAGS"];
  if (!Raw || Raw.trim().length === 0) return void 0;
  const Tags = Raw.split(",").map((Entry) => Entry.trim()).filter((Entry) => Entry.length > 0);
  return Tags.length === 0 ? void 0 : new Set(Tags);
})();
var PadTwo = /* @__PURE__ */ __name((Value) => Value < 10 ? `0${Value}` : String(Value), "PadTwo");
var PadThree = /* @__PURE__ */ __name((Value) => Value < 10 ? `00${Value}` : Value < 100 ? `0${Value}` : String(Value), "PadThree");
var FormatTimestamp = /* @__PURE__ */ __name(() => {
  const Now = /* @__PURE__ */ new Date();
  if (Long) return Now.toISOString();
  return `${PadTwo(Now.getHours())}:${PadTwo(Now.getMinutes())}:${PadTwo(
    Now.getSeconds()
  )}.${PadThree(Now.getMilliseconds())}`;
}, "FormatTimestamp");
var SerializeContext = /* @__PURE__ */ __name((Context) => {
  const Seen = /* @__PURE__ */ new WeakSet();
  try {
    return JSON.stringify(Context, (_Key, Value) => {
      if (Value instanceof Error) {
        return { name: Value.name, message: Value.message };
      }
      if (typeof Value === "bigint") return String(Value);
      if (typeof Value === "function") return "[Function]";
      if (typeof Value === "object" && Value !== null) {
        if (Seen.has(Value)) return "[Circular]";
        Seen.add(Value);
      }
      return Value;
    });
  } catch {
    return '"[Unserializable]"';
  }
}, "SerializeContext");
var LevelTag = /* @__PURE__ */ __name((Level) => Level === "info" ? "" : ` ${Level.toUpperCase()}`, "LevelTag");
var FormatLine = /* @__PURE__ */ __name((Level, Tag, Message, Context) => {
  const Head = `${FormatTimestamp()} [LandFix:${Tag}]${LevelTag(Level)} ${Message}`;
  if (!Context) return `${Head}
`;
  return `${Head} ${SerializeContext(Context)}
`;
}, "FormatLine");
var Emit = /* @__PURE__ */ __name((Stream, Level, Tag, Message, Context) => {
  if (!Enabled) return;
  if (AllowList && !AllowList.has(Tag)) return;
  try {
    Stream.write(FormatLine(Level, Tag, Message, Context));
  } catch {
  }
}, "Emit");
var Info = /* @__PURE__ */ __name((Tag, Message, Context) => {
  Emit(process.stdout, "info", Tag, Message, Context);
}, "Info");
var Warn = /* @__PURE__ */ __name((Tag, Message, Context) => {
  Emit(process.stdout, "warn", Tag, Message, Context);
}, "Warn");
var ErrorLog = /* @__PURE__ */ __name((Tag, Message, Context) => {
  Emit(process.stderr, "error", Tag, Message, Context);
}, "ErrorLog");
var Debug = /* @__PURE__ */ __name((Tag, Message, Context) => {
  if (!DebugEnabled) return;
  Emit(process.stdout, "debug", Tag, Message, Context);
}, "Debug");
var SeenOnce = /* @__PURE__ */ new Set();
var DebugOnce = /* @__PURE__ */ __name((Tag, Key, Message, Context) => {
  if (!DebugEnabled) return;
  const Combined = `${Tag}:${Key}`;
  if (SeenOnce.has(Combined)) return;
  SeenOnce.add(Combined);
  Emit(process.stdout, "debug", Tag, Message, Context);
}, "DebugOnce");
var InfoOnce = /* @__PURE__ */ __name((Tag, Key, Message, Context) => {
  const Combined = `${Tag}:${Key}`;
  if (SeenOnce.has(Combined)) return;
  SeenOnce.add(Combined);
  Emit(process.stdout, "info", Tag, Message, Context);
}, "InfoOnce");
var LandFixLog = {
  Info,
  InfoOnce,
  Warn,
  Error: ErrorLog,
  Debug,
  DebugOnce,
  IsEnabled: /* @__PURE__ */ __name(() => Enabled, "IsEnabled"),
  IsDebugEnabled: /* @__PURE__ */ __name(() => DebugEnabled, "IsDebugEnabled"),
  Mode: /* @__PURE__ */ __name(() => Mode === "off" ? "off" : Long ? "long" : "short", "Mode")
};
var LandFixLog_default = LandFixLog;

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
        LandFixLog_default.Warn(
          "ExtNs",
          `URL parse failed for ${Raw}: ${Error2 instanceof Error2 ? Error2.message : String(Error2)}; using fallback strip`
        );
        Path = Raw.replace(/^file:\/\//, "");
      }
    }
    Path = Path.replace(/\/$/, "");
    if (UriFactoryAvailable) {
      LandFixLog_default.DebugOnce(
        "ExtNs",
        `string:${Path}`,
        `string extensionLocation ${Raw} \u2192 path=${Path} (factory=real)`
      );
    } else {
      LandFixLog_default.InfoOnce(
        "ExtNs",
        `string-fallback:${Path}`,
        `string extensionLocation ${Raw} \u2192 path=${Path} (factory=FALLBACK)`
      );
    }
    return { ExtensionPath: Path, ExtensionUri: MakeUri(Path) };
  }
  if (Raw && typeof Raw === "object") {
    const Obj = Raw;
    const Path = typeof Obj["fsPath"] === "string" && Obj["fsPath"] || typeof Obj["path"] === "string" && Obj["path"] || (typeof Obj["external"] === "string" ? NormalizeLocation(Obj["external"]).ExtensionPath : "");
    if (UriFactoryAvailable) {
      LandFixLog_default.DebugOnce(
        "ExtNs",
        `object:${Path}`,
        `object extensionLocation keys=[${Object.keys(Obj).join(",")}] \u2192 path=${Path} (factory=real)`
      );
    } else {
      LandFixLog_default.InfoOnce(
        "ExtNs",
        `object-fallback:${Path}`,
        `object extensionLocation keys=[${Object.keys(Obj).join(",")}] \u2192 path=${Path} (factory=FALLBACK)`
      );
    }
    return { ExtensionPath: Path, ExtensionUri: MakeUri(Path) };
  }
  LandFixLog_default.Warn(
    "ExtNs",
    `extensionLocation missing or unsupported type: ${typeof Raw}; using empty path`
  );
  return { ExtensionPath: "", ExtensionUri: MakeUri("") };
}, "NormalizeLocation");
var ToExtensionObject = /* @__PURE__ */ __name((Context, Id, Raw) => {
  const Exports = MakePermissiveExports();
  const { ExtensionPath, ExtensionUri } = NormalizeLocation(
    Raw?.extensionLocation
  );
  const SafePackageJSON = Raw && typeof Raw === "object" ? {
    ...Raw,
    name: typeof Raw.name === "string" && Raw.name.length > 0 ? Raw.name : Id,
    version: typeof Raw.version === "string" && Raw.version.length > 0 ? Raw.version : "0.0.0",
    publisher: typeof Raw.publisher === "string" ? Raw.publisher : Id.split(".")[0] ?? "unknown"
  } : { name: Id, version: "0.0.0", publisher: Id.split(".")[0] ?? "unknown" };
  return {
    id: Id,
    extensionUri: ExtensionUri,
    extensionPath: ExtensionPath,
    // Reporting `isActive: true` mirrors VS Code's behaviour for
    // built-ins that have completed activation; without it, callers
    // like the `github` extension treat the extension as missing.
    isActive: true,
    packageJSON: SafePackageJSON,
    extensionKind: 1,
    exports: Exports,
    // Critical: `activate()` must resolve to the SAME exports object
    // so consumers like `vscode.github` can chain
    // `gitExtension.activate().then(api => api.onDidChangeEnablement(...))`.
    activate: /* @__PURE__ */ __name(async () => Exports, "activate")
  };
}, "ToExtensionObject");
var IsExtensionKey = /* @__PURE__ */ __name((Key) => !Key.startsWith("__"), "IsExtensionKey");
var CreateExtensionsNamespace = /* @__PURE__ */ __name((Context) => ({
  getExtension: /* @__PURE__ */ __name((Identifier) => {
    if (!IsExtensionKey(Identifier)) return void 0;
    const Raw = Context.ExtensionRegistry.get(Identifier);
    return Raw ? ToExtensionObject(Context, Identifier, Raw) : void 0;
  }, "getExtension"),
  get all() {
    return [...Context.ExtensionRegistry.entries()].filter(([Id]) => IsExtensionKey(Id)).map(([Id, Raw]) => ToExtensionObject(Context, Id, Raw));
  },
  // Some extensions (html-language-features) iterate
  // `extensions.allAcrossExtensionHosts`; return the same array as `all`
  // so `for (...of...)` does not throw on `is not iterable`.
  get allAcrossExtensionHosts() {
    return [...Context.ExtensionRegistry.entries()].filter(([Id]) => IsExtensionKey(Id)).map(([Id, Raw]) => ToExtensionObject(Context, Id, Raw));
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
