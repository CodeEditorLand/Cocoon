var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Stock/Lift.ts
import {
  isEmptyPattern as StockGlobIsEmpty,
  match as StockGlobMatch,
  parse as StockGlobParse
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/glob.js";
import {
  basename as StockBasename,
  dirname as StockDirname,
  extname as StockExtname,
  isEqualOrParent as StockIsEqualOrParent,
  joinPath as StockJoinPath,
  relativePath as StockRelativePath
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/resources.js";
import { URI } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";
function ToUri(Input) {
  if (Input == null) return void 0;
  if (Input instanceof URI) return Input;
  if (typeof Input === "string") {
    if (Input.length === 0) return void 0;
    try {
      if (Input.startsWith("file:") || Input.includes("://")) {
        return URI.parse(Input);
      }
      return URI.file(Input);
    } catch {
      return void 0;
    }
  }
  const WithScheme = Input;
  if (typeof WithScheme.scheme === "string") {
    try {
      return URI.from({
        scheme: WithScheme.scheme,
        authority: typeof WithScheme.authority === "string" ? WithScheme.authority : "",
        path: typeof WithScheme.path === "string" ? WithScheme.path : "",
        query: typeof WithScheme.query === "string" ? WithScheme.query : "",
        fragment: typeof WithScheme.fragment === "string" ? WithScheme.fragment : ""
      });
    } catch {
      return void 0;
    }
  }
  return void 0;
}
__name(ToUri, "ToUri");
function RelativePath(From, To) {
  const FromUri = ToUri(From);
  const ToUriValue = ToUri(To);
  if (!FromUri || !ToUriValue) return void 0;
  return StockRelativePath(FromUri, ToUriValue);
}
__name(RelativePath, "RelativePath");
function IsEqualOrParent(Resource, Candidate) {
  const R = ToUri(Resource);
  const C = ToUri(Candidate);
  if (!R || !C) return false;
  return StockIsEqualOrParent(R, C);
}
__name(IsEqualOrParent, "IsEqualOrParent");
function Basename(Resource) {
  const U = ToUri(Resource);
  return U ? StockBasename(U) : "";
}
__name(Basename, "Basename");
function Dirname(Resource) {
  const U = ToUri(Resource);
  return U ? StockDirname(U) : void 0;
}
__name(Dirname, "Dirname");
function Extname(Resource) {
  const U = ToUri(Resource);
  return U ? StockExtname(U) : "";
}
__name(Extname, "Extname");
function JoinPath(Resource, ...Parts) {
  const U = ToUri(Resource);
  return U ? StockJoinPath(U, ...Parts) : void 0;
}
__name(JoinPath, "JoinPath");
function GlobMatch(Pattern, Path) {
  return StockGlobMatch(Pattern, Path);
}
__name(GlobMatch, "GlobMatch");
function GlobParsePattern(Pattern) {
  return StockGlobParse(Pattern);
}
__name(GlobParsePattern, "GlobParsePattern");
function GlobIsEmpty(Pattern) {
  return StockGlobIsEmpty(Pattern);
}
__name(GlobIsEmpty, "GlobIsEmpty");

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
  return (InitWorkspace.folders ?? []).map(
    (Folder) => {
      const FsPath = FolderToFsPath(Folder?.uri);
      const Record = { ...Folder };
      if (typeof FsPath === "string") Record.FsPath = FsPath;
      return Record;
    }
  );
}, "ResolveWorkspaceFolders");

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
    "gRPC"
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
  Telemetry: Pick("Telemetry", "Synchronous"),
  // IPC routing: Mountain (default) → NodeDeferred → Node
  IPC: Pick("IPC", "Mountain"),
  // Per-subsystem routing (added 2026-05-25). Defaults match .env.Land
  // and `Mountain/build.rs::EmitTierDefaults`.
  Terminal: Pick("Terminal", "Mountain"),
  SCM: Pick("SCM", "Mountain"),
  Debug: Pick("Debug", "Mountain"),
  LanguageFeatures: Pick(
    "LanguageFeatures",
    "Mountain"
  ),
  Search: Pick("Search", "Mountain"),
  OutputChannel: Pick("OutputChannel", "Mountain"),
  NativeHost: Pick("NativeHost", "Mountain"),
  TreeView: Pick("TreeView", "Mountain"),
  Storage: Pick("Storage", "Mountain"),
  Model: Pick("Model", "Mountain"),
  Tasks: Pick("Tasks", "Node"),
  Auth: Pick("Auth", "Node"),
  Encryption: Pick("Encryption", "Mountain"),
  ExtensionHost: Pick("ExtensionHost", "Process"),
  WebSocket: Pick("WebSocket", "Disabled")
};
Log_default.Info("Tier", `Cocoon tier set resolved: ${JSON.stringify(Tier)}`);
var Tier_default = Tier;

// Source/Services/Language/Provider/Registry.ts
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
  if (process.env.Trace) {
    CocoonDevLog(
      "registry",
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
function HasCommand(CommandId) {
  return Commands.has(CommandId);
}
__name(HasCommand, "HasCommand");
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

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Providers.ts
var MakeProvider = /* @__PURE__ */ __name((Context, RegisterMethod, UnregisterMethod, _LegacyHandlePrefix, ExtraPayload, OnRegister, OnDispose) => (Key, _Provider, _Options) => {
  const Handle = NextProviderHandle();
  Context.SendToMountain(RegisterMethod, {
    handle: Handle,
    ...ExtraPayload(Key)
  }).catch(() => {
  });
  OnRegister?.(Handle, Key, _Provider);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      OnDispose?.(Handle, Key);
      Context.SendToMountain(UnregisterMethod, {
        handle: Handle
      }).catch(() => {
      });
    }, "dispose")
  };
}, "MakeProvider");
var BuildRegisterTextDocumentContentProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_text_document_content_provider",
  "unregister_text_document_content_provider",
  "textDocumentContent",
  (Scheme) => ({ scheme: Scheme, extensionId: "" }),
  (_Handle, Scheme, Provider) => {
    Context.ExtensionRegistry.set(
      `__textDocumentContentProvider:${Scheme}`,
      Provider
    );
    if (Provider && typeof Provider.onDidChange === "function") {
      try {
        Provider.onDidChange((Uri) => {
          const UriStr = typeof Uri === "string" ? Uri : Uri?.toString?.() ?? "";
          if (!UriStr) return;
          const CancellationToken = {
            isCancellationRequested: false,
            onCancellationRequested: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "onCancellationRequested")
          };
          void Promise.resolve(
            Provider.provideTextDocumentContent?.(
              Uri,
              CancellationToken
            )
          ).then((Content) => {
            if (typeof Content === "string") {
              Context.DocumentContentCache?.set(
                UriStr,
                Content
              );
              Context.WorkspaceEventEmitter?.emit(
                "didChangeTextDocument",
                {
                  document: {
                    uri: {
                      toString: /* @__PURE__ */ __name(() => UriStr, "toString"),
                      scheme: Scheme,
                      path: UriStr.slice(
                        Scheme.length + 1
                      )
                    },
                    fileName: UriStr,
                    languageId: "plaintext",
                    version: Date.now(),
                    isDirty: false,
                    getText: /* @__PURE__ */ __name(() => Content, "getText")
                  },
                  contentChanges: [
                    {
                      text: Content,
                      range: null,
                      rangeOffset: 0,
                      rangeLength: 0
                    }
                  ],
                  reason: void 0
                }
              );
            }
          }).catch(() => {
          });
        });
      } catch {
      }
    }
  },
  (_Handle, Scheme) => {
    Context.ExtensionRegistry.delete(
      `__textDocumentContentProvider:${Scheme}`
    );
  }
), "BuildRegisterTextDocumentContentProvider");
var ClaimedFileSystemSchemes = /* @__PURE__ */ new Set();
var BuildRegisterFileSystemProvider = /* @__PURE__ */ __name((Context) => (Scheme, _Provider, Options) => {
  const Handle = NextProviderHandle();
  ClaimedFileSystemSchemes.add(Scheme);
  Context.SendToMountain("register_file_system_provider", {
    handle: Handle,
    scheme: Scheme,
    isCaseSensitive: Options?.isCaseSensitive ?? true,
    isReadonly: Options?.isReadonly ?? false,
    extensionId: ""
  }).catch(() => {
  });
  return {
    dispose: /* @__PURE__ */ __name(() => {
      ClaimedFileSystemSchemes.delete(Scheme);
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
  (TaskType) => ({ taskType: TaskType, extensionId: "" }),
  (Handle, _TaskType, Provider) => {
    Context.ExtensionRegistry.set(`__taskProvider:${Handle}`, Provider);
  },
  (Handle, _TaskType) => {
    Context.ExtensionRegistry.delete(`__taskProvider:${Handle}`);
  }
), "BuildRegisterTaskProvider");
var BuildRegisterNotebookContentProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_notebook_content_provider",
  "unregister_notebook_content_provider",
  "notebookContent",
  (NotebookType) => ({ notebookType: NotebookType, extensionId: "" })
), "BuildRegisterNotebookContentProvider");
var BuildRegisterNotebookSerializer = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_notebook_serializer",
  "unregister_notebook_serializer",
  "notebookSerializer",
  (NotebookType) => ({ notebookType: NotebookType, extensionId: "" })
), "BuildRegisterNotebookSerializer");
var BuildRegisterRemoteAuthorityResolver = /* @__PURE__ */ __name((Context) => (AuthorityPrefix, _Resolver) => {
  Context.SendToMountain("register_remote_authority_resolver", {
    authorityPrefix: AuthorityPrefix,
    extensionId: ""
  }).catch(() => {
  });
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("unregister_remote_authority_resolver", {
        authorityPrefix: AuthorityPrefix
      }).catch(() => {
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

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Route.ts
function ExtractScheme(Uri) {
  if (Uri && typeof Uri === "object") {
    const WithScheme = Uri;
    if (typeof WithScheme.scheme === "string" && WithScheme.scheme.length > 0) {
      return WithScheme.scheme;
    }
  }
  if (typeof Uri === "string") {
    const Colon = Uri.indexOf(":");
    if (Colon > 0 && Colon < 32) {
      const Scheme = Uri.slice(0, Colon);
      if (/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(Scheme)) {
        return Scheme.toLowerCase();
      }
    }
    return "file";
  }
  return "file";
}
__name(ExtractScheme, "ExtractScheme");
function ExtractFsPath(Uri) {
  if (Uri && typeof Uri === "object") {
    const WithPath = Uri;
    if (typeof WithPath.fsPath === "string" && WithPath.fsPath.length > 0) {
      return WithPath.fsPath;
    }
    if (typeof WithPath.path === "string" && WithPath.path.length > 0) {
      return WithPath.path;
    }
  }
  if (typeof Uri === "string") {
    if (Uri.startsWith("file://")) {
      try {
        return decodeURIComponent(Uri.slice("file://".length));
      } catch {
        return Uri.slice("file://".length);
      }
    }
    if (Uri.startsWith("/")) return Uri;
  }
  return void 0;
}
__name(ExtractFsPath, "ExtractFsPath");
function Route(Uri) {
  const Scheme = ExtractScheme(Uri);
  if (Tier_default.FileSystem === "Layer2") return "mountain";
  if (Scheme !== "file") return "mountain";
  if (ClaimedFileSystemSchemes.has("file")) return "mountain";
  if (Tier_default.FileSystem === "Layer4") {
    return ExtractFsPath(Uri) !== void 0 ? "native" : "mountain";
  }
  return ExtractFsPath(Uri) !== void 0 ? "native" : "mountain";
}
__name(Route, "Route");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Namespace.ts
import { promises as FsPromises } from "node:fs";
import { dirname as PathDirname } from "node:path";
var UriToString = /* @__PURE__ */ __name((Value) => {
  if (Value == null) return "";
  if (typeof Value === "string") {
    if (Value.startsWith("/")) return `file://${Value}`;
    return Value;
  }
  if (typeof Value === "object") {
    const WithToString = Value;
    if (typeof WithToString.toString === "function" && WithToString.toString !== Object.prototype.toString) {
      const Rendered = WithToString.toString();
      if (Rendered && Rendered !== "[object Object]") return Rendered;
    }
    const Hydrated = ToUri(Value);
    if (Hydrated) return Hydrated.toString();
    const WithParts = Value;
    if (typeof WithParts.scheme === "string") {
      const Scheme = WithParts.scheme;
      const Authority = typeof WithParts.authority === "string" ? WithParts.authority : "";
      const PathPart = typeof WithParts.path === "string" ? WithParts.path : "";
      const Query = typeof WithParts.query === "string" && WithParts.query.length > 0 ? `?${WithParts.query}` : "";
      const Fragment = typeof WithParts.fragment === "string" && WithParts.fragment.length > 0 ? `#${WithParts.fragment}` : "";
      return `${Scheme}://${Authority}${PathPart}${Query}${Fragment}`;
    }
    if (typeof WithParts.fsPath === "string") {
      return `file://${WithParts.fsPath}`;
    }
  }
  return String(Value);
}, "UriToString");
var FileType = {
  Unknown: 0,
  File: 1,
  Directory: 2,
  SymbolicLink: 64
};
var LogRoute = /* @__PURE__ */ __name((Operation, Uri, Decision) => {
  const Enabled2 = process.env["Trace"];
  if (!Enabled2 || !Enabled2.includes("fs-route")) return;
  process.stdout.write(
    `[DEV:FS-ROUTE] op=${Operation} route=${Decision} scheme=${ExtractScheme(Uri)} uri=${UriToString(Uri)}
`
  );
}, "LogRoute");
var ThrowFileNotFound = /* @__PURE__ */ __name((Uri) => {
  const Api = globalThis.__cocoonVscodeAPI;
  const FileNotFound = Api?.FileSystemError?.FileNotFound;
  if (typeof FileNotFound === "function") throw FileNotFound(Uri);
  const Synthetic = new Error(
    `EntryNotFound (FileSystemError): ${UriToString(Uri)}`
  );
  Synthetic.code = "FileNotFound";
  Synthetic.name = "FileSystemError";
  throw Synthetic;
}, "ThrowFileNotFound");
var MetadataToStat = /* @__PURE__ */ __name((Metadata) => ({
  type: Metadata.isSymbolicLink() ? FileType.SymbolicLink : Metadata.isDirectory() ? FileType.Directory : FileType.File,
  size: Metadata.size,
  mtime: Math.floor(Metadata.mtimeMs),
  ctime: Math.floor(Metadata.ctimeMs)
}), "MetadataToStat");
var BuildFileSystemNamespace = /* @__PURE__ */ __name((Context) => ({
  stat: /* @__PURE__ */ __name(async (Uri) => {
    const Decision = Route(Uri);
    LogRoute("stat", Uri, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri);
      try {
        const Metadata = await FsPromises.lstat(Path);
        return MetadataToStat(Metadata);
      } catch (Err) {
        if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
        throw Err;
      }
    }
    return await Call(Context, "FileSystem.Stat", [
      UriToString(Uri)
    ]) ?? {
      type: FileType.File,
      size: 0,
      ctime: 0,
      mtime: 0
    };
  }, "stat"),
  readFile: /* @__PURE__ */ __name(async (Uri) => {
    const Decision = Route(Uri);
    LogRoute("readFile", Uri, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri);
      try {
        return await FsPromises.readFile(Path);
      } catch (Err) {
        if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
        throw Err;
      }
    }
    const UriString = UriToString(Uri);
    try {
      const Raw = await Context.MountainClient?.sendRequest(
        "FileSystem.ReadFile",
        [UriString]
      );
      if (Raw == null) return Buffer.alloc(0);
      if (Array.isArray(Raw))
        return Buffer.from(Raw);
      if (Raw instanceof Uint8Array) return Buffer.from(Raw);
      return Buffer.from(String(Raw), "utf8");
    } catch (Err) {
      const Message = Err instanceof Error ? Err.message : String(Err);
      const Code = Err?.code;
      const TraceFsRead = process.env["Trace"]?.includes("fs-read");
      if (Code === -32004 || /resource not found|ENOENT|not found|no such file or directory|entity not found|os error 2|path is outside of the registered workspace|permission denied for operation|workspace is not trusted/i.test(
        Message
      )) {
        if (TraceFsRead) {
          process.stdout.write(
            `[LandFix:FsRead] 404 \u2192 FileNotFound for ${UriString}
`
          );
        }
        ThrowFileNotFound(Uri);
      }
      process.stdout.write(
        `[LandFix:FsRead] non-404 failure for ${UriString}: ${Message}
`
      );
      throw Err;
    }
  }, "readFile"),
  writeFile: /* @__PURE__ */ __name(async (Uri, Content) => {
    const Decision = Route(Uri);
    LogRoute("writeFile", Uri, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri);
      const Parent = PathDirname(Path);
      if (Parent && Parent !== Path) {
        await FsPromises.mkdir(Parent, { recursive: true }).catch(
          () => {
          }
        );
      }
      await FsPromises.writeFile(Path, Content);
      return;
    }
    const Bytes = Array.from(Content);
    await Call(Context, "FileSystem.WriteFile", [
      UriToString(Uri),
      Bytes
    ]);
  }, "writeFile"),
  readDirectory: /* @__PURE__ */ __name(async (Uri) => {
    const Decision = Route(Uri);
    LogRoute("readDirectory", Uri, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri);
      try {
        const Entries = await FsPromises.readdir(Path, {
          withFileTypes: true
        });
        return Entries.map((Entry) => {
          const Type = Entry.isSymbolicLink() ? FileType.SymbolicLink : Entry.isDirectory() ? FileType.Directory : FileType.File;
          return [Entry.name, Type];
        });
      } catch (Err) {
        if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
        throw Err;
      }
    }
    return await Call(
      Context,
      "FileSystem.ReadDirectory",
      [UriToString(Uri)]
    ) ?? [];
  }, "readDirectory"),
  createDirectory: /* @__PURE__ */ __name(async (Uri) => {
    const Decision = Route(Uri);
    LogRoute("createDirectory", Uri, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri);
      await FsPromises.mkdir(Path, { recursive: true });
      return;
    }
    await Call(Context, "FileSystem.CreateDirectory", [
      UriToString(Uri)
    ]);
  }, "createDirectory"),
  delete: /* @__PURE__ */ __name(async (Uri, Options) => {
    const Decision = Route(Uri);
    LogRoute("delete", Uri, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri);
      try {
        await FsPromises.rm(Path, {
          recursive: Options?.recursive ?? false,
          force: false
        });
        return;
      } catch (Err) {
        if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
        throw Err;
      }
    }
    await Call(Context, "FileSystem.Delete", [
      UriToString(Uri),
      Options?.recursive ?? false
    ]);
  }, "delete"),
  rename: /* @__PURE__ */ __name(async (Source, Target, _Options) => {
    const SourceRoute = Route(Source);
    const TargetRoute = Route(Target);
    const Decision = SourceRoute === "native" && TargetRoute === "native" ? "native" : "mountain";
    LogRoute("rename", Source, Decision);
    if (Decision === "native") {
      const SourcePath = ExtractFsPath(Source);
      const TargetPath = ExtractFsPath(Target);
      try {
        await FsPromises.rename(SourcePath, TargetPath);
        return;
      } catch (Err) {
        if (Err?.code === "ENOENT") ThrowFileNotFound(Source);
        throw Err;
      }
    }
    await Call(Context, "FileSystem.Rename", [
      UriToString(Source),
      UriToString(Target)
    ]);
  }, "rename"),
  copy: /* @__PURE__ */ __name(async (Source, Target, _Options) => {
    const SourceRoute = Route(Source);
    const TargetRoute = Route(Target);
    const Decision = SourceRoute === "native" && TargetRoute === "native" ? "native" : "mountain";
    LogRoute("copy", Source, Decision);
    if (Decision === "native") {
      const SourcePath = ExtractFsPath(Source);
      const TargetPath = ExtractFsPath(Target);
      const Parent = PathDirname(TargetPath);
      if (Parent && Parent !== TargetPath) {
        await FsPromises.mkdir(Parent, { recursive: true }).catch(
          () => {
          }
        );
      }
      try {
        await FsPromises.copyFile(SourcePath, TargetPath);
        return;
      } catch (Err) {
        if (Err?.code === "ENOENT") ThrowFileNotFound(Source);
        throw Err;
      }
    }
    await Call(Context, "FileSystem.Copy", [
      UriToString(Source),
      UriToString(Target)
    ]);
  }, "copy"),
  isWritableFileSystem: /* @__PURE__ */ __name((Scheme) => {
    if (Scheme === "file") return true;
    return true;
  }, "isWritableFileSystem")
}), "BuildFileSystemNamespace");
export {
  BuildFileSystemNamespace
};
//# sourceMappingURL=Namespace.js.map
