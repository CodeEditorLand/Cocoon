var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/Helpers.ts
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
var ExtractGlobPattern = /* @__PURE__ */ __name((Raw) => {
  if (typeof Raw === "string" && Raw.length > 0) return Raw;
  if (Raw && typeof Raw === "object") {
    const Obj = Raw;
    if (typeof Obj["pattern"] === "string") return Obj["pattern"];
    if (typeof Obj["glob"] === "string") return Obj["glob"];
  }
  return void 0;
}, "ExtractGlobPattern");
var FolderToFsPath = /* @__PURE__ */ __name((FolderUri) => {
  const Raw = typeof FolderUri === "string" ? FolderUri : FolderUri?.["fsPath"] ?? FolderUri?.["path"] ?? FolderUri?.["external"];
  if (typeof Raw !== "string" || Raw.length === 0) return void 0;
  if (Raw.startsWith("file:")) {
    try {
      return decodeURIComponent(new URL(Raw).pathname);
    } catch {
      return Raw.replace(/^file:\/\//, "");
    }
  }
  return Raw;
}, "FolderToFsPath");
var ResolveWorkspaceFolders = /* @__PURE__ */ __name((Context) => {
  const InitWorkspace = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
  return (InitWorkspace.folders ?? []).map((Folder) => {
    const FsPath = FolderToFsPath(Folder?.uri);
    const Record = { ...Folder };
    if (typeof FsPath === "string") Record.FsPath = FsPath;
    return Record;
  });
}, "ResolveWorkspaceFolders");

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/Configuration.ts
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
      const Resolved = Shape?.["workspaceFolderValue"] ?? Shape?.["workspaceValue"] ?? Shape?.["globalValue"] ?? Shape?.["defaultValue"] ?? Value;
      const Prior = ConfigCache.get(Key);
      ConfigCache.set(Key, Resolved);
      if (Prior !== Resolved) FireConfigChange(Key);
    });
  }, "PrimeConfig");
  Context.Emitter.on("configurationChanged", (Payload) => {
    const Shape = Payload ?? {};
    const Keys = Array.isArray(Shape.keys) ? Shape.keys : Array.isArray(Shape.affected) ? Shape.affected : [];
    if (Keys.length === 0) {
      for (const CachedKey of [...ConfigCache.keys()]) {
        ConfigCache.delete(CachedKey);
        FireConfigChange(CachedKey);
      }
      return;
    }
    for (const Key of Keys) {
      ConfigCache.delete(Key);
      FireConfigChange(Key);
      PrimeConfig(Key);
    }
  });
  return { ConfigCache, ConfigInFlight, ConfigListeners, FireConfigChange, PrimeConfig };
}, "CreateConfigurationState");
var BuildGetConfiguration = /* @__PURE__ */ __name((Context, State) => (Section, _Scope) => ({
  get: /* @__PURE__ */ __name((Key, DefaultValue) => {
    const Full = Section ? `${Section}.${Key}` : Key;
    if (State.ConfigCache.has(Full)) {
      return State.ConfigCache.get(Full);
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
    State.PrimeConfig(Full);
    return false;
  }, "has"),
  inspect: /* @__PURE__ */ __name((Key) => {
    const Full = Section ? `${Section}.${Key}` : Key;
    if (!State.ConfigCache.has(Full)) {
      State.PrimeConfig(Full);
      return void 0;
    }
    const Cached = State.ConfigCache.get(Full);
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
