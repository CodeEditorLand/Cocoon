var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/GlobToRegex.ts
var FindMatchingBrace = /* @__PURE__ */ __name((Input, Start, Open, Close) => {
  let Depth = 1;
  for (let I = Start + 1; I < Input.length; I++) {
    const Character = Input[I];
    if (Character === "\\") {
      I++;
      continue;
    }
    if (Character === Open) Depth++;
    else if (Character === Close) {
      Depth--;
      if (Depth === 0) return I;
    }
  }
  return -1;
}, "FindMatchingBrace");
var SplitTopLevelCommas = /* @__PURE__ */ __name((Body) => {
  const Parts = [];
  let Depth = 0;
  let Start = 0;
  for (let I = 0; I < Body.length; I++) {
    const Character = Body[I];
    if (Character === "\\") {
      I++;
      continue;
    }
    if (Character === "{" || Character === "(") Depth++;
    else if (Character === "}" || Character === ")") Depth--;
    else if (Character === "," && Depth === 0) {
      Parts.push(Body.slice(Start, I));
      Start = I + 1;
    }
  }
  Parts.push(Body.slice(Start));
  return Parts;
}, "SplitTopLevelCommas");
var ExpandBraces = /* @__PURE__ */ __name((Input) => {
  const Open = Input.indexOf("{");
  if (Open === -1) return [Input];
  const Close = FindMatchingBrace(Input, Open, "{", "}");
  if (Close === -1) return [Input];
  const Prefix = Input.slice(0, Open);
  const Body = Input.slice(Open + 1, Close);
  const Suffix = Input.slice(Close + 1);
  const RangeMatch = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(Body);
  const Alternatives = [];
  if (RangeMatch) {
    const Start = parseInt(RangeMatch[1], 10);
    const End = parseInt(RangeMatch[2], 10);
    const StepRaw = RangeMatch[3];
    const Step = StepRaw ? Math.abs(parseInt(StepRaw, 10)) : 1;
    if (Step > 0 && Number.isFinite(Start) && Number.isFinite(End)) {
      const Width = RangeMatch[1].startsWith("0") || RangeMatch[2].startsWith("0") ? Math.max(RangeMatch[1].length, RangeMatch[2].length) : 0;
      const Direction = Start <= End ? 1 : -1;
      for (let Value = Start; Direction === 1 ? Value <= End : Value >= End; Value += Direction * Step) {
        const Text = String(Math.abs(Value));
        const Padded = Width > 0 && Text.length < Width ? "0".repeat(Width - Text.length) + Text : Text;
        Alternatives.push(Value < 0 ? `-${Padded}` : Padded);
      }
    }
  }
  if (Alternatives.length === 0) {
    Alternatives.push(...SplitTopLevelCommas(Body));
  }
  const Expanded = [];
  for (const Alternative of Alternatives) {
    for (const Sub of ExpandBraces(Alternative)) {
      for (const Tail of ExpandBraces(Suffix)) {
        Expanded.push(`${Prefix}${Sub}${Tail}`);
      }
    }
  }
  return Expanded;
}, "ExpandBraces");
var RegexEscape = /* @__PURE__ */ __name((Character) => /[.+^$()|\[\]\\]/.test(Character) ? `\\${Character}` : Character, "RegexEscape");
var PlainGlobToRegexSource = /* @__PURE__ */ __name((Glob) => {
  let Expression = "";
  let I = 0;
  while (I < Glob.length) {
    const Character = Glob[I];
    const Next = Glob[I + 1];
    if (Character === "*" && Next === "*") {
      Expression += ".*";
      I += 2;
      if (Glob[I] === "/") I++;
      continue;
    }
    if ((Character === "?" || Character === "*" || Character === "+" || Character === "@" || Character === "!") && Next === "(") {
      const CloseAt = FindMatchingBrace(Glob, I + 1, "(", ")");
      if (CloseAt !== -1) {
        const Inside = Glob.slice(I + 2, CloseAt);
        const Alternatives = SplitTopLevelCommas(
          Inside.replace(/\|/g, ",")
        ).map((Alternative) => PlainGlobToRegexSource(Alternative));
        const Joined = Alternatives.join("|");
        switch (Character) {
          case "?":
            Expression += `(?:${Joined})?`;
            break;
          case "*":
            Expression += `(?:${Joined})*`;
            break;
          case "+":
            Expression += `(?:${Joined})+`;
            break;
          case "@":
            Expression += `(?:${Joined})`;
            break;
          case "!":
            Expression += `(?:(?!(?:${Joined})(?:/|$))[^/])+`;
            break;
        }
        I = CloseAt + 1;
        continue;
      }
    }
    if (Character === "*") {
      Expression += "[^/]*";
      I++;
      continue;
    }
    if (Character === "?") {
      Expression += "[^/]";
      I++;
      continue;
    }
    if (Character === "[") {
      const CloseAt = Glob.indexOf("]", I + 1);
      if (CloseAt !== -1) {
        let Class = Glob.slice(I + 1, CloseAt);
        if (Class.startsWith("!")) Class = `^${Class.slice(1)}`;
        Expression += `[${Class}]`;
        I = CloseAt + 1;
        continue;
      }
    }
    if (Character === "\\" && Next !== void 0) {
      Expression += RegexEscape(Next);
      I += 2;
      continue;
    }
    Expression += RegexEscape(Character);
    I++;
  }
  return Expression;
}, "PlainGlobToRegexSource");
var GlobToRegex = /* @__PURE__ */ __name((Glob) => {
  const Variants = ExpandBraces(Glob);
  const Source = Variants.length === 1 ? PlainGlobToRegexSource(Variants[0]) : `(?:${Variants.map(PlainGlobToRegexSource).join("|")})`;
  return new RegExp(`^${Source}$`);
}, "GlobToRegex");
var GlobToRegex_default = GlobToRegex;

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

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/FindFiles.ts
var FindFilesLocal = /* @__PURE__ */ __name(async (_Context, Folders, Include, Exclude, MaxResults) => {
  const IncludePattern = ExtractGlobPattern(Include);
  const ExcludePattern = ExtractGlobPattern(Exclude);
  const Cap = typeof MaxResults === "number" && MaxResults > 0 ? MaxResults : 1e4;
  process.stdout.write(
    `[LandFix:WsNs] findFiles include=${IncludePattern ?? "<any>"} exclude=${ExcludePattern ?? "<none>"} cap=${Cap} folders=${Folders.length}
`
  );
  if (!IncludePattern) {
    process.stdout.write(
      "[LandFix:WsNs] findFiles: no include pattern \u2192 []\n"
    );
    return [];
  }
  let IncludeRegex;
  try {
    IncludeRegex = GlobToRegex_default(IncludePattern);
  } catch (CaughtError) {
    const Message = CaughtError instanceof globalThis.Error ? CaughtError.message : String(CaughtError);
    process.stdout.write(
      `[LandFix:WsNs] findFiles: glob compile failed for ${IncludePattern}: ${Message}
`
    );
    return [];
  }
  let ExcludeRegex;
  if (ExcludePattern) {
    try {
      ExcludeRegex = GlobToRegex_default(ExcludePattern);
    } catch {
    }
  }
  const { readdir } = await import("node:fs/promises");
  const { join, relative, sep } = await import("node:path");
  const Results = [];
  const MaxDepth = 32;
  const DeadlineAt = Date.now() + 3e4;
  let Truncated = "";
  const Walk = /* @__PURE__ */ __name(async (Root, Current, Depth) => {
    if (Results.length >= Cap) {
      Truncated = "cap";
      return;
    }
    if (Depth > MaxDepth) {
      Truncated = Truncated || "depth";
      return;
    }
    if (Date.now() > DeadlineAt) {
      Truncated = Truncated || "deadline";
      return;
    }
    let Entries;
    try {
      Entries = await readdir(Current, {
        withFileTypes: true
      });
    } catch {
      return;
    }
    const SubDirectories = [];
    for (const Entry of Entries) {
      if (Results.length >= Cap) {
        Truncated = "cap";
        return;
      }
      const Name = Entry.name;
      if (DefaultExcludeSegments.has(Name)) continue;
      if (typeof Entry.isSymbolicLink === "function" && Entry.isSymbolicLink())
        continue;
      const Full = join(Current, Name);
      const RelativeFromRoot = relative(Root, Full).split(sep).join("/");
      if (Entry.isDirectory()) {
        SubDirectories.push(Full);
        continue;
      }
      if (ExcludeRegex && ExcludeRegex.test(RelativeFromRoot)) continue;
      if (!IncludeRegex.test(RelativeFromRoot)) continue;
      Results.push({ scheme: "file", path: Full, fsPath: Full });
    }
    const Concurrency = 4;
    for (let Index = 0; Index < SubDirectories.length; Index += Concurrency) {
      const Batch = SubDirectories.slice(Index, Index + Concurrency);
      await Promise.all(Batch.map((Sub) => Walk(Root, Sub, Depth + 1)));
      if (Results.length >= Cap) {
        Truncated = "cap";
        return;
      }
      if (Date.now() > DeadlineAt) {
        Truncated = Truncated || "deadline";
        return;
      }
    }
  }, "Walk");
  for (const Folder of Folders) {
    const FsPath = FolderToFsPath(Folder?.uri);
    if (!FsPath) {
      process.stdout.write(
        `[LandFix:WsNs] findFiles: folder has no fsPath (name=${Folder?.name})
`
      );
      continue;
    }
    await Walk(FsPath, FsPath, 0);
  }
  if (Truncated) {
    process.stdout.write(
      `[LandFix:WsNs] findFiles: truncated (${Truncated}) at ${Results.length} result(s)
`
    );
  }
  process.stdout.write(
    `[LandFix:WsNs] findFiles: matched ${Results.length} file(s) for include=${IncludePattern}
`
  );
  return Results;
}, "FindFilesLocal");

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

// Source/Utility/Tier.ts
var Injected = globalThis.__LandTiers ?? {};
var Pick = /* @__PURE__ */ __name((Capability, Fallback) => {
  const FromInjected = Injected[Capability];
  if (typeof FromInjected === "string" && FromInjected.length > 0) {
    return FromInjected;
  }
  const FromEnvironment = process.env[`Tier${Capability}`];
  if (typeof FromEnvironment === "string" && FromEnvironment.length > 0) {
    return FromEnvironment;
  }
  return Fallback;
}, "Pick");
var Tier = {
  RemoteProcedureCall: Pick(
    "RemoteProcedureCall",
    "GRPC"
  ),
  HTTPProxy: Pick("HTTPProxy", "HandRolled"),
  Logger: Pick("Logger", "Standard"),
  FileSystem: Pick("FileSystem", "Layer2"),
  FindFiles: Pick("FindFiles", "Layer3"),
  Glob: Pick("Glob", "JavaScript"),
  FileWatcher: Pick("FileWatcher", "Stub"),
  SchemeAssets: Pick("SchemeAssets", "Embedded"),
  Configuration: Pick("Configuration", "Cache"),
  Diagnostics: Pick("Diagnostics", "Full"),
  Clipboard: Pick("Clipboard", "Layer3"),
  OpenExternal: Pick("OpenExternal", "Layer3"),
  DocumentMirror: Pick("DocumentMirror", "Full"),
  ExtensionActivation: Pick(
    "ExtensionActivation",
    "Parallel8"
  ),
  ExtensionScan: Pick("ExtensionScan", "Sequential"),
  ModuleCache: Pick("ModuleCache", "Simple"),
  Telemetry: Pick("Telemetry", "Synchronous")
};
LandFixLog_default.Info(
  "Tier",
  `Cocoon tier set resolved: ${JSON.stringify(Tier)}`
);
var Tier_default = Tier;

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/FileSystemWatcher.ts
var WatcherCounter = 0;
var CreateFileSystemWatcher = /* @__PURE__ */ __name((Context, Pattern, IgnoreCreateEvents, IgnoreChangeEvents, IgnoreDeleteEvents) => {
  const StubDisposable = { dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") };
  const StubWatcher = {
    ignoreCreateEvents: IgnoreCreateEvents === true,
    ignoreChangeEvents: IgnoreChangeEvents === true,
    ignoreDeleteEvents: IgnoreDeleteEvents === true,
    onDidCreate: /* @__PURE__ */ __name(() => StubDisposable, "onDidCreate"),
    onDidChange: /* @__PURE__ */ __name(() => StubDisposable, "onDidChange"),
    onDidDelete: /* @__PURE__ */ __name(() => StubDisposable, "onDidDelete"),
    dispose: /* @__PURE__ */ __name(() => {
    }, "dispose")
  };
  if (Tier_default.FileWatcher !== "Layer4") {
    return StubWatcher;
  }
  const PatternString = ExtractGlobPattern(Pattern);
  if (!PatternString) {
    return StubWatcher;
  }
  const Matcher = GlobToRegex_default(PatternString);
  const Folders = ResolveWorkspaceFolders(Context);
  const Root = Pattern?.baseUri?.fsPath ?? Pattern?.base ?? Folders[0]?.FsPath;
  if (!Root) {
    return StubWatcher;
  }
  const Handle = `watcher:${++WatcherCounter}`;
  const IsRecursive = PatternString.includes("**");
  Context.MountainClient?.sendRequest("FileWatcher.Register", [
    Handle,
    Root,
    IsRecursive,
    PatternString
  ]).catch(() => {
  });
  const EventName = `fileWatcher:${Handle}`;
  const MakeSubscriber = /* @__PURE__ */ __name((Kind, Ignore) => (Listener) => {
    if (Ignore) return StubDisposable;
    const WrappedListener = /* @__PURE__ */ __name((Event) => {
      if (Event.kind !== Kind) return;
      if (!Matcher.test(Event.path)) return;
      try {
        Listener({
          scheme: "file",
          path: Event.path,
          fsPath: Event.path,
          toString: /* @__PURE__ */ __name(() => `file://${Event.path}`, "toString")
        });
      } catch {
      }
    }, "WrappedListener");
    Context.Emitter.on(EventName, WrappedListener);
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.Emitter.removeListener(
          EventName,
          WrappedListener
        );
      }, "dispose")
    };
  }, "MakeSubscriber");
  return {
    ignoreCreateEvents: IgnoreCreateEvents === true,
    ignoreChangeEvents: IgnoreChangeEvents === true,
    ignoreDeleteEvents: IgnoreDeleteEvents === true,
    onDidCreate: MakeSubscriber(
      "create",
      IgnoreCreateEvents === true
    ),
    onDidChange: MakeSubscriber(
      "change",
      IgnoreChangeEvents === true
    ),
    onDidDelete: MakeSubscriber(
      "delete",
      IgnoreDeleteEvents === true
    ),
    dispose: /* @__PURE__ */ __name(() => {
      Context.Emitter.removeAllListeners(EventName);
      Context.MountainClient?.sendRequest(
        "FileWatcher.Unregister",
        [Handle]
      ).catch(() => {
      });
    }, "dispose")
  };
}, "CreateFileSystemWatcher");

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

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/TextDocument.ts
var BuildOpenTextDocument = /* @__PURE__ */ __name((Context) => async (UriOrPath) => {
  const UriString = typeof UriOrPath === "string" ? UriOrPath : UriOrPath?.toString?.() ?? "";
  const Cached = Context.DocumentContentCache.get(UriString);
  const Text = Cached ?? await Call(Context, "FileSystem.ReadFile", [UriString]) ?? "";
  return {
    uri: UriOrPath,
    fileName: UriString,
    languageId: "plaintext",
    isDirty: false,
    isClosed: false,
    isUntitled: false,
    version: 1,
    eol: 1,
    lineCount: Text.split("\n").length,
    getText: /* @__PURE__ */ __name(() => Text, "getText"),
    save: /* @__PURE__ */ __name(async () => true, "save")
  };
}, "BuildOpenTextDocument");
var BuildSaveAll = /* @__PURE__ */ __name((Context) => async (_IncludeUntitled) => {
  await Call(Context, "Document.Save", []);
  return true;
}, "BuildSaveAll");
var BuildApplyEdit = /* @__PURE__ */ __name((Context) => async (_Edit) => {
  Context.SendToMountain("workspace.applyEdit", _Edit).catch(() => {
  });
  return true;
}, "BuildApplyEdit");
var BuildUpdateWorkspaceFolders = /* @__PURE__ */ __name((Context, ReadFolders) => (Start, DeleteCount, ...ToAdd) => {
  const Current = ReadFolders();
  const RemoveCount = typeof DeleteCount === "number" && DeleteCount > 0 ? Math.min(DeleteCount, Math.max(Current.length - Start, 0)) : 0;
  const Removals = Current.slice(Start, Start + RemoveCount).map((Folder) => ({
    uri: {
      value: typeof Folder?.uri === "string" ? Folder.uri : Folder?.uri?.["toString"]?.call(Folder?.uri) ?? String(Folder?.uri)
    }
  }));
  const Additions = ToAdd.map((Folder) => {
    const Raw = Folder?.uri;
    const Serialized = typeof Raw === "string" ? Raw : Raw?.["toString"]?.call(Raw) ?? String(Raw ?? "");
    return { uri: { value: Serialized }, name: Folder?.name ?? "" };
  });
  Context.MountainClient?.sendRequest("$updateWorkspaceFolders", {
    additions: Additions,
    removals: Removals
  }).catch((Error2) => {
    const Message = Error2 instanceof globalThis.Error ? Error2.message : String(Error2);
    try {
      process.stdout.write(
        `[LandFix:WsNs] updateWorkspaceFolders failed: ${Message}
`
      );
    } catch {
    }
  });
  return true;
}, "BuildUpdateWorkspaceFolders");
var BuildDocumentEventMembers = /* @__PURE__ */ __name((Context) => ({
  onDidOpenTextDocument: EventSubscriber(Context, "didOpenTextDocument"),
  onDidCloseTextDocument: EventSubscriber(Context, "didCloseTextDocument"),
  onDidChangeTextDocument: EventSubscriber(Context, "didChangeTextDocument"),
  onDidSaveTextDocument: EventSubscriber(Context, "didSaveTextDocument"),
  onWillSaveTextDocument: EventSubscriber(Context, "willSaveTextDocument"),
  onDidCreateFiles: EventSubscriber(Context, "didCreateFiles"),
  onDidDeleteFiles: EventSubscriber(Context, "didDeleteFiles"),
  onDidRenameFiles: EventSubscriber(Context, "didRenameFiles"),
  onWillRenameFiles: EventSubscriber(Context, "willRenameFiles"),
  onWillCreateFiles: EventSubscriber(Context, "willCreateFiles"),
  onWillDeleteFiles: EventSubscriber(Context, "willDeleteFiles"),
  onDidOpenNotebookDocument: EventSubscriber(
    Context,
    "didOpenNotebookDocument"
  ),
  onDidCloseNotebookDocument: EventSubscriber(
    Context,
    "didCloseNotebookDocument"
  ),
  onDidChangeNotebookDocument: EventSubscriber(
    Context,
    "didChangeNotebookDocument"
  ),
  onDidSaveNotebookDocument: EventSubscriber(
    Context,
    "didSaveNotebookDocument"
  ),
  onWillSaveNotebookDocument: EventSubscriber(
    Context,
    "willSaveNotebookDocument"
  )
}), "BuildDocumentEventMembers");

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/Providers.ts
var MakeProvider = /* @__PURE__ */ __name((Context, RegisterMethod, UnregisterMethod, HandlePrefix, ExtraPayload, OnRegister, OnDispose) => (Key, _Provider, _Options) => {
  const Handle = `${HandlePrefix}:${Key}:${Date.now()}`;
  Context.SendToMountain(RegisterMethod, {
    handle: Handle,
    ...ExtraPayload(Key)
  }).catch(() => {
  });
  OnRegister?.(Handle, Key, _Provider);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      OnDispose?.(Handle, Key);
      Context.SendToMountain(UnregisterMethod, { handle: Handle }).catch(
        () => {
        }
      );
    }, "dispose")
  };
}, "MakeProvider");
var BuildRegisterTextDocumentContentProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_text_document_content_provider",
  "unregister_text_document_content_provider",
  "textDocumentContent",
  (Scheme) => ({ scheme: Scheme, extension_id: "" }),
  (_Handle, Scheme, Provider) => {
    Context.ExtensionRegistry.set(
      `__textDocumentContentProvider:${Scheme}`,
      Provider
    );
  },
  (_Handle, Scheme) => {
    Context.ExtensionRegistry.delete(
      `__textDocumentContentProvider:${Scheme}`
    );
  }
), "BuildRegisterTextDocumentContentProvider");
var BuildRegisterFileSystemProvider = /* @__PURE__ */ __name((Context) => (Scheme, _Provider, Options) => {
  const Handle = `fileSystemProvider:${Scheme}:${Date.now()}`;
  Context.SendToMountain("register_file_system_provider", {
    handle: Handle,
    scheme: Scheme,
    is_case_sensitive: Options?.isCaseSensitive ?? true,
    is_readonly: Options?.isReadonly ?? false,
    extension_id: ""
  }).catch(() => {
  });
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("unregister_file_system_provider", {
        handle: Handle
      }).catch(() => {
      });
    }, "dispose")
  };
}, "BuildRegisterFileSystemProvider");
var BuildRegisterTaskProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_task_provider",
  "unregister_task_provider",
  "taskProvider",
  (TaskType) => ({ task_type: TaskType, extension_id: "" })
), "BuildRegisterTaskProvider");
var BuildRegisterNotebookContentProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_notebook_content_provider",
  "unregister_notebook_content_provider",
  "notebookContent",
  (NotebookType) => ({ notebook_type: NotebookType, extension_id: "" })
), "BuildRegisterNotebookContentProvider");
var BuildRegisterNotebookSerializer = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_notebook_serializer",
  "unregister_notebook_serializer",
  "notebookSerializer",
  (NotebookType) => ({ notebook_type: NotebookType, extension_id: "" })
), "BuildRegisterNotebookSerializer");
var BuildRegisterRemoteAuthorityResolver = /* @__PURE__ */ __name((Context) => (AuthorityPrefix, _Resolver) => {
  Context.SendToMountain("register_remote_authority_resolver", {
    authority_prefix: AuthorityPrefix,
    extension_id: ""
  }).catch(() => {
  });
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.SendToMountain(
        "unregister_remote_authority_resolver",
        { authority_prefix: AuthorityPrefix }
      ).catch(() => {
      });
    }, "dispose")
  };
}, "BuildRegisterRemoteAuthorityResolver");
var BuildRegisterResourceLabelFormatter = /* @__PURE__ */ __name((Context) => (Formatter) => {
  Context.SendToMountain("register_resource_label_formatter", {
    formatter: Formatter
  }).catch(() => {
  });
  return { dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") };
}, "BuildRegisterResourceLabelFormatter");

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/FileSystemNamespace.ts
var BuildFileSystemNamespace = /* @__PURE__ */ __name((Context) => ({
  stat: /* @__PURE__ */ __name(async (Uri) => await Call(Context, "FileSystem.Stat", [
    String(Uri)
  ]) ?? {
    type: 1,
    size: 0,
    ctime: 0,
    mtime: 0
  }, "stat"),
  readFile: /* @__PURE__ */ __name(async (Uri) => {
    const UriString = String(Uri);
    try {
      const Raw = await Context.MountainClient?.sendRequest(
        "FileSystem.ReadFile",
        [UriString]
      );
      if (Raw == null) return new Uint8Array();
      if (Array.isArray(Raw)) {
        return Uint8Array.from(
          Raw,
          (N) => Number(N) & 255
        );
      }
      if (Raw instanceof Uint8Array) return Raw;
      return new TextEncoder().encode(String(Raw));
    } catch (Err) {
      const Message = Err instanceof Error ? Err.message : String(Err);
      const LooksLike404 = /resource not found|ENOENT|not found/i.test(Message);
      if (LooksLike404) {
        process.stdout.write(
          `[LandFix:FsRead] 404 \u2192 FileNotFound for ${UriString}
`
        );
        const Api = globalThis.__cocoonVscodeAPI;
        const FileNotFound = Api?.FileSystemError?.FileNotFound;
        if (typeof FileNotFound === "function") {
          throw FileNotFound(Uri);
        }
        const Synthetic = new Error(
          `EntryNotFound (FileSystemError): ${UriString}`
        );
        Synthetic.code = "FileNotFound";
        Synthetic.name = "FileSystemError";
        throw Synthetic;
      }
      process.stdout.write(
        `[LandFix:FsRead] non-404 failure for ${UriString}: ${Message}
`
      );
      throw Err;
    }
  }, "readFile"),
  writeFile: /* @__PURE__ */ __name(async (Uri, Content) => {
    const Text = new TextDecoder().decode(Content);
    await Call(Context, "FileSystem.WriteFile", [
      String(Uri),
      Text
    ]);
  }, "writeFile"),
  readDirectory: /* @__PURE__ */ __name(async (Uri) => await Call(Context, "FileSystem.ReadDirectory", [
    String(Uri)
  ]) ?? [], "readDirectory"),
  createDirectory: /* @__PURE__ */ __name(async (Uri) => {
    await Call(Context, "FileSystem.CreateDirectory", [
      String(Uri)
    ]);
  }, "createDirectory"),
  delete: /* @__PURE__ */ __name(async (Uri, Options) => {
    await Call(Context, "FileSystem.Delete", [
      String(Uri),
      Options?.recursive ?? false
    ]);
  }, "delete"),
  rename: /* @__PURE__ */ __name(async (Source, Target, _Options) => {
    await Call(Context, "FileSystem.Rename", [
      String(Source),
      String(Target)
    ]);
  }, "rename"),
  copy: /* @__PURE__ */ __name(async (Source, Target, _Options) => {
    await Call(Context, "FileSystem.Copy", [
      String(Source),
      String(Target)
    ]);
  }, "copy"),
  isWritableFileSystem: /* @__PURE__ */ __name((_Scheme) => true, "isWritableFileSystem")
}), "BuildFileSystemNamespace");

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/Index.ts
var CreateWorkspaceNamespace = /* @__PURE__ */ __name((Context) => {
  const InitWorkspace = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
  const ReadFolders = /* @__PURE__ */ __name(() => {
    const Live = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
    return Live.folders ?? [];
  }, "ReadFolders");
  const ReadName = /* @__PURE__ */ __name(() => {
    const Live = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
    return Live.name ?? InitWorkspace.name;
  }, "ReadName");
  const ConfigState = CreateConfigurationState(Context);
  return {
    get workspaceFolders() {
      return ReadFolders();
    },
    get name() {
      return ReadName();
    },
    workspaceFile: void 0,
    rootPath: void 0,
    textDocuments: [],
    notebookDocuments: [],
    getConfiguration: BuildGetConfiguration(Context, ConfigState),
    findFiles: /* @__PURE__ */ __name(async (Include, Exclude, MaxResults) => FindFilesLocal(Context, ReadFolders(), Include, Exclude, MaxResults), "findFiles"),
    openTextDocument: BuildOpenTextDocument(Context),
    saveAll: BuildSaveAll(Context),
    applyEdit: BuildApplyEdit(Context),
    asRelativePath: /* @__PURE__ */ __name((PathOrUri) => String(PathOrUri), "asRelativePath"),
    // BATCH-14 follow-up: forwards through Mountain's `$updateWorkspaceFolders`
    // which mutates ApplicationState.Workspace and fires `$deltaWorkspaceFolders`
    // back - the listener wiring from BATCH-14 does the rest.
    updateWorkspaceFolders: BuildUpdateWorkspaceFolders(
      Context,
      ReadFolders
    ),
    ...BuildDocumentEventMembers(Context),
    onDidChangeConfiguration: BuildOnDidChangeConfiguration(ConfigState),
    onDidChangeWorkspaceFolders: /* @__PURE__ */ __name((Listener) => {
      Context.WorkspaceEventEmitter.on(
        "didChangeWorkspaceFolders",
        Listener
      );
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context.WorkspaceEventEmitter.removeListener(
            "didChangeWorkspaceFolders",
            Listener
          );
        }, "dispose")
      };
    }, "onDidChangeWorkspaceFolders"),
    // Provider registrations - each backed by a Mountain round-trip.
    registerTextDocumentContentProvider: BuildRegisterTextDocumentContentProvider(Context),
    registerFileSystemProvider: BuildRegisterFileSystemProvider(Context),
    registerTaskProvider: BuildRegisterTaskProvider(Context),
    registerNotebookContentProvider: BuildRegisterNotebookContentProvider(Context),
    registerNotebookSerializer: BuildRegisterNotebookSerializer(Context),
    registerRemoteAuthorityResolver: BuildRegisterRemoteAuthorityResolver(Context),
    registerResourceLabelFormatter: BuildRegisterResourceLabelFormatter(Context),
    // Stub-only registrations (no Mountain route yet).
    registerDocumentPasteEditProvider: /* @__PURE__ */ __name((_Selector, _Provider, _Metadata) => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerDocumentPasteEditProvider"),
    registerDocumentDropEditProvider: /* @__PURE__ */ __name((_Selector, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerDocumentDropEditProvider"),
    registerEditSessionIdentityProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerEditSessionIdentityProvider"),
    registerShareProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerShareProvider"),
    registerCanonicalUriProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerCanonicalUriProvider"),
    onDidGrantWorkspaceTrust: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "onDidGrantWorkspaceTrust"),
    isTrusted: true,
    trusted: true,
    requestWorkspaceTrust: /* @__PURE__ */ __name(async () => true, "requestWorkspaceTrust"),
    registerTunnelProvider: /* @__PURE__ */ __name((_Provider, _Information) => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerTunnelProvider"),
    openTunnel: /* @__PURE__ */ __name(async (_TunnelOptions) => ({
      remoteAddress: { port: 0, host: "localhost" },
      localAddress: "",
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    }), "openTunnel"),
    tunnels: Promise.resolve([]),
    onDidChangeTunnels: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "onDidChangeTunnels"),
    registerPortAttributesProvider: /* @__PURE__ */ __name((_Selector, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerPortAttributesProvider"),
    // createFileSystemWatcher is tier-gated - see FileSystemWatcher.ts.
    createFileSystemWatcher: /* @__PURE__ */ __name((Pattern, IgnoreCreateEvents, IgnoreChangeEvents, IgnoreDeleteEvents) => CreateFileSystemWatcher(
      Context,
      Pattern,
      IgnoreCreateEvents,
      IgnoreChangeEvents,
      IgnoreDeleteEvents
    ), "createFileSystemWatcher"),
    fs: BuildFileSystemNamespace(Context)
  };
}, "CreateWorkspaceNamespace");
var Index_default = CreateWorkspaceNamespace;
export {
  Index_default as default
};
//# sourceMappingURL=WorkspaceNamespace.js.map
