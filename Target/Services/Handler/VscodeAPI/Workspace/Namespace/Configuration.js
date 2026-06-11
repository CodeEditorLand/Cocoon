var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Dev/Log.ts
var Raw = process.env["Trace"] ?? "";
var ParsedTags = Raw.split(",").map((Segment) => Segment.trim().toLowerCase()).filter((Segment) => Segment.length > 0);
var TagSet = new Set(ParsedTags);
var IsShort = TagSet.has("short");
var HasAll = TagSet.has("all");
var IsEnabled = /* @__PURE__ */ __name((Tag) => {
  if (TagSet.size === 0) return false;
  if (HasAll || IsShort) return true;
  return TagSet.has(Tag.toLowerCase());
}, "IsEnabled");
var CocoonDevLog = /* @__PURE__ */ __name((Tag, Message) => {
  if (!IsEnabled(Tag)) return;
  const TagUpper = Tag.toUpperCase();
  process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
}, "CocoonDevLog");
var Log_default = CocoonDevLog;

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Helpers.ts
var EventSubscriber = /* @__PURE__ */ __name((Context, EventName) => (Listener) => {
  Context.WorkspaceEventEmitter.on(EventName, Listener);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.WorkspaceEventEmitter.removeListener(
        EventName,
        Listener
      );
    }, "dispose")
  };
}, "EventSubscriber");
var Call = /* @__PURE__ */ __name(async (Context, Method, Parameters) => {
  try {
    return await Context.MountainClient?.sendRequest(
      Method,
      Parameters
    );
  } catch {
    return void 0;
  }
}, "Call");
var DefaultExcludeSegments = /* @__PURE__ */ new Set([
  ".git",
  "node_modules",
  ".astro",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  ".pnpm",
  "Target",
  "target",
  "dist",
  "out",
  "build",
  ".DS_Store"
]);
var ExtractGlobPattern = /* @__PURE__ */ __name((Raw2) => {
  if (typeof Raw2 === "string" && Raw2.length > 0) return Raw2;
  if (Raw2 && typeof Raw2 === "object") {
    const Obj = Raw2;
    if (typeof Obj["pattern"] === "string") return Obj["pattern"];
    if (typeof Obj["glob"] === "string") return Obj["glob"];
  }
  return void 0;
}, "ExtractGlobPattern");
var FolderToFsPath = /* @__PURE__ */ __name((FolderUri) => {
  const Raw2 = typeof FolderUri === "string" ? FolderUri : FolderUri?.["fsPath"] ?? FolderUri?.["path"] ?? FolderUri?.["external"];
  if (typeof Raw2 !== "string" || Raw2.length === 0) return void 0;
  if (Raw2.startsWith("file:")) {
    try {
      return decodeURIComponent(new URL(Raw2).pathname);
    } catch {
      return Raw2.replace(/^file:\/\//, "");
    }
  }
  return Raw2;
}, "FolderToFsPath");
var ResolveWorkspaceFolders = /* @__PURE__ */ __name((Context) => {
  const InitWorkspace = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
  return (InitWorkspace.folders ?? []).map(
    (Folder) => {
      const FsPath = FolderToFsPath(Folder?.uri);
      const Record = { ...Folder };
      if (typeof FsPath === "string") Record.FsPath = FsPath;
      return Record;
    }
  );
}, "ResolveWorkspaceFolders");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Configuration.ts
var CreateConfigurationState = /* @__PURE__ */ __name((Context) => {
  const ConfigCache = /* @__PURE__ */ new Map();
  const ConfigInFlight = /* @__PURE__ */ new Set();
  const ConfigListeners = /* @__PURE__ */ new Set();
  const FireConfigChange = /* @__PURE__ */ __name((ChangedKey) => {
    if (ConfigListeners.size === 0) return;
    const Event = {
      affectsConfiguration: /* @__PURE__ */ __name((QueryKey) => ChangedKey === QueryKey || ChangedKey.startsWith(`${QueryKey}.`), "affectsConfiguration")
    };
    for (const Listener of ConfigListeners) {
      try {
        Listener(Event);
      } catch {
      }
    }
  }, "FireConfigChange");
  const PrimeConfig = /* @__PURE__ */ __name((Key) => {
    if (ConfigInFlight.has(Key)) return;
    ConfigInFlight.add(Key);
    void Call(
      Context,
      "Configuration.Inspect",
      [Key]
    ).then((Value) => {
      ConfigInFlight.delete(Key);
      if (Value === void 0) return;
      const Shape = Value;
      const Resolved = Shape?.["effectiveValue"] ?? Shape?.["workspaceFolderValue"] ?? Shape?.["workspaceValue"] ?? Shape?.["userValue"] ?? Shape?.["globalValue"] ?? Shape?.["defaultValue"] ?? Value;
      const Prior = ConfigCache.get(Key);
      ConfigCache.set(Key, Resolved);
      if (Prior !== Resolved) FireConfigChange(Key);
    });
  }, "PrimeConfig");
  const TypeSafeDefault = /* @__PURE__ */ __name((Decl) => {
    const T = Array.isArray(Decl.type) ? Decl.type[0] : Decl.type;
    switch (T) {
      case "array":
        return [];
      case "object":
        return {};
      case "boolean":
        return false;
      case "number":
      case "integer":
        return 0;
      case "string":
        return "";
      default:
        return void 0;
    }
  }, "TypeSafeDefault");
  const PrePopulateFromManifest = /* @__PURE__ */ __name((PackageJSON) => {
    const Manifest = PackageJSON ?? {};
    const Contributed = Manifest.contributes?.configuration;
    if (!Contributed) return;
    const Sections = Array.isArray(Contributed) ? Contributed : [Contributed];
    let Seeded = 0;
    let Skipped = 0;
    let ExtensionId = "";
    const ManifestShape = PackageJSON ?? {};
    if (ManifestShape.publisher && ManifestShape.name) {
      ExtensionId = `${ManifestShape.publisher}.${ManifestShape.name}`;
    }
    for (const Section of Sections) {
      const Properties = Section?.properties;
      if (!Properties) continue;
      for (const [DottedKey, Declaration] of Object.entries(Properties)) {
        if (ConfigCache.has(DottedKey)) {
          Skipped++;
          continue;
        }
        if (Declaration !== null && typeof Declaration === "object") {
          const Value = "default" in Declaration ? Declaration.default : TypeSafeDefault(Declaration);
          if (Value !== void 0) {
            ConfigCache.set(DottedKey, Value);
            Seeded++;
          }
        }
      }
    }
    CocoonDevLog(
      "config-prime",
      `[ConfigPrime] prepopulate ext=${ExtensionId || "<unknown>"} seeded=${Seeded} skipped=${Skipped}`
    );
  }, "PrePopulateFromManifest");
  Context.Emitter.on("configurationChanged", (Payload) => {
    const Shape = Payload ?? {};
    const Keys = Array.isArray(Shape.keys) ? Shape.keys : Array.isArray(Shape.affected) ? Shape.affected : [];
    if (Keys.length === 0) {
      return;
    }
    if (Keys.length === 1 && Keys[0] === "*") {
      const CachedKeys = [...ConfigCache.keys()];
      ConfigCache.clear();
      for (const Key of CachedKeys) {
        PrimeConfig(Key);
      }
      return;
    }
    for (const Key of Keys) {
      ConfigCache.delete(Key);
      FireConfigChange(Key);
      PrimeConfig(Key);
    }
  });
  return {
    ConfigCache,
    ConfigInFlight,
    ConfigListeners,
    FireConfigChange,
    PrimeConfig,
    PrePopulateFromManifest
  };
}, "CreateConfigurationState");
var SynthesiseSubtree = /* @__PURE__ */ __name((Cache, Full) => {
  const Prefix = `${Full}.`;
  const Subtree = {};
  let Matched = false;
  for (const [CachedKey, CachedValue] of Cache.entries()) {
    if (!CachedKey.startsWith(Prefix)) continue;
    Matched = true;
    const Local = CachedKey.slice(Prefix.length);
    const Parts = Local.split(".");
    let Current = Subtree;
    for (let I = 0; I < Parts.length - 1; I++) {
      const Segment = Parts[I];
      const Existing = Current[Segment];
      if (Existing === void 0 || Existing === null || typeof Existing !== "object") {
        Current[Segment] = {};
      }
      Current = Current[Segment];
    }
    Current[Parts[Parts.length - 1]] = CachedValue;
  }
  return Matched ? Subtree : void 0;
}, "SynthesiseSubtree");
var BuildGetConfiguration = /* @__PURE__ */ __name((Context, State) => (Section, Scope) => ({
  get: /* @__PURE__ */ __name((Key, DefaultValue) => {
    const Full = Section ? `${Section}.${Key}` : Key;
    const LangId = typeof Scope?.languageId === "string" ? Scope.languageId : typeof Scope?.language === "string" ? Scope.language : void 0;
    if (LangId) {
      const LangFull = `[${LangId}].${Full}`;
      if (State.ConfigCache.has(LangFull)) {
        return State.ConfigCache.get(LangFull);
      }
      const LangSection = `[${LangId}].${Section ?? ""}`;
      const LangSubtree = SynthesiseSubtree(
        State.ConfigCache,
        LangSection
      );
      if (LangSubtree !== void 0) {
        const Parts = Key.split(".");
        let Cur = LangSubtree;
        for (const Part of Parts) {
          Cur = Cur?.[Part];
          if (Cur === void 0) {
            Cur = void 0;
            break;
          }
        }
        if (Cur !== void 0) return Cur;
      }
      if (!State.ConfigCache.has(Full)) {
        State.PrimeConfig(Full);
      }
    }
    if (State.ConfigCache.has(Full)) {
      const Cached = State.ConfigCache.get(Full);
      if (Cached === null || Cached === void 0) {
        const Subtree2 = SynthesiseSubtree(State.ConfigCache, Full);
        if (Subtree2 !== void 0) {
          CocoonDevLog(
            "config-prime",
            `[ConfigPrime] synthesise key=${Full} source=null-shadowed`
          );
          return Subtree2;
        }
        return DefaultValue;
      }
      return Cached;
    }
    const Subtree = SynthesiseSubtree(State.ConfigCache, Full);
    if (Subtree !== void 0) {
      CocoonDevLog(
        "config-prime",
        `[ConfigPrime] synthesise key=${Full} source=miss`
      );
      if (DefaultValue !== void 0 && DefaultValue !== null && typeof DefaultValue === "object" && !Array.isArray(DefaultValue) && typeof Subtree === "object") {
        return { ...DefaultValue, ...Subtree };
      }
      return Subtree;
    }
    State.PrimeConfig(Full);
    return DefaultValue;
  }, "get"),
  update: /* @__PURE__ */ __name(async (Key, Value, Target) => {
    const Full = Section ? `${Section}.${Key}` : Key;
    const TargetIndex = Target === 2 ? 1 : Target === true ? 0 : typeof Target === "number" ? Target : 0;
    await Call(Context, "Configuration.Update", [
      Full,
      Value,
      TargetIndex
    ]);
    const Prior = State.ConfigCache.get(Full);
    State.ConfigCache.set(Full, Value);
    if (Prior !== Value) State.FireConfigChange(Full);
  }, "update"),
  has: /* @__PURE__ */ __name((Key) => {
    const Full = Section ? `${Section}.${Key}` : Key;
    if (State.ConfigCache.has(Full)) return true;
    if (SynthesiseSubtree(State.ConfigCache, Full) !== void 0) {
      return true;
    }
    State.PrimeConfig(Full);
    return false;
  }, "has"),
  inspect: /* @__PURE__ */ __name((Key) => {
    const Full = Section ? `${Section}.${Key}` : Key;
    let Cached;
    if (State.ConfigCache.has(Full)) {
      Cached = State.ConfigCache.get(Full);
    } else {
      const Subtree = SynthesiseSubtree(State.ConfigCache, Full);
      if (Subtree === void 0) {
        State.PrimeConfig(Full);
        return void 0;
      }
      Cached = Subtree;
    }
    return {
      key: Full,
      defaultValue: void 0,
      globalValue: Cached,
      workspaceValue: void 0,
      workspaceFolderValue: void 0,
      defaultLanguageValue: void 0,
      globalLanguageValue: void 0,
      workspaceLanguageValue: void 0,
      workspaceFolderLanguageValue: void 0,
      languageIds: []
    };
  }, "inspect")
}), "BuildGetConfiguration");
var BuildOnDidChangeConfiguration = /* @__PURE__ */ __name((State) => (Listener, ThisArg, Disposables) => {
  const Bound = ThisArg === void 0 ? Listener : Listener.bind(ThisArg);
  State.ConfigListeners.add(Bound);
  const Subscription = {
    dispose: /* @__PURE__ */ __name(() => {
      State.ConfigListeners.delete(Bound);
    }, "dispose")
  };
  if (Disposables && typeof Disposables.push === "function") {
    Disposables.push(Subscription);
  }
  return Subscription;
}, "BuildOnDidChangeConfiguration");
export {
  BuildGetConfiguration,
  BuildOnDidChangeConfiguration,
  CreateConfigurationState
};
//# sourceMappingURL=Configuration.js.map
