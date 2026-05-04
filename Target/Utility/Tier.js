var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/Land/Fix/Log.ts
var Mode = process.env["Mend"] ?? "short";
var Enabled = Mode !== "off";
var Long = Mode === "long";
var DebugEnabled = Long;
var AllowList = (() => {
  const Raw = process.env["Mend"];
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
var Log_default = LandFixLog;

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
  // Default Layer4 so `createFileSystemWatcher` forwards to Mountain's
  // native `notify`-crate implementation in `Environment/FileWatcherProvider.rs`.
  // Stub mode drops every watch registration, leaving every extension that
  // relies on file-change events (eslint, typescript, tailwind, most
  // language servers) blind to disk mutations. Override with
  // `TierFileWatcher=Stub` at launch to restore the old drop behaviour
  // for debugging.
  FileWatcher: Pick("FileWatcher", "Layer4"),
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
Log_default.Info("Tier", `Cocoon tier set resolved: ${JSON.stringify(Tier)}`);
var Tier_default = Tier;
export {
  Tier_default as default
};
//# sourceMappingURL=Tier.js.map
