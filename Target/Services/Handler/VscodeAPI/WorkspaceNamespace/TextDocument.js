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
LandFixLog_default.Info("Tier", `Cocoon tier set resolved: ${JSON.stringify(Tier)}`);
var Tier_default = Tier;

// Source/Services/LanguageProviderRegistry.ts
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
  if (process.env.LAND_DEV_LOG) {
    console.warn(
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

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/Providers.ts
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
  (TaskType) => ({ taskType: TaskType, extensionId: "" })
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

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/FileSystemRoute.ts
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
  return (InitWorkspace.folders ?? []).map(
    (Folder) => {
      const FsPath = FolderToFsPath(Folder?.uri);
      const Record = { ...Folder };
      if (typeof FsPath === "string") Record.FsPath = FsPath;
      return Record;
    }
  );
}, "ResolveWorkspaceFolders");

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/LanguageActivation.ts
var STATIC_EXTENSION_TO_LANGUAGE = {
  // Web / script
  ts: "typescript",
  tsx: "typescriptreact",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascriptreact",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "jsonc",
  "json5": "json",
  // Markup / styles
  html: "html",
  htm: "html",
  xml: "xml",
  xhtml: "xml",
  svg: "xml",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  md: "markdown",
  markdown: "markdown",
  mdx: "mdx",
  // Systems
  rs: "rust",
  go: "go",
  c: "c",
  h: "c",
  hh: "cpp",
  hpp: "cpp",
  hxx: "cpp",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  cs: "csharp",
  // Scripting
  py: "python",
  pyi: "python",
  rb: "ruby",
  php: "php",
  lua: "lua",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
  java: "java",
  scala: "scala",
  // Shell / ops
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  fish: "shellscript",
  ps1: "powershell",
  dockerfile: "dockerfile",
  // Data / config
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  properties: "properties",
  // Frontend frameworks
  svelte: "svelte",
  vue: "vue",
  astro: "astro",
  // Others
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  proto: "proto3",
  tex: "latex",
  r: "r",
  dart: "dart"
};
function ResolveLanguageIdFromRegistry(Context, FileExtension) {
  const ExtensionWithDot = `.${FileExtension}`;
  for (const Description of Context.ExtensionRegistry.values()) {
    const Contributes = Description?.contributes;
    const Languages = Contributes?.languages;
    if (!Languages) continue;
    for (const Language of Languages) {
      if (!Language?.id) continue;
      if (Language.extensions?.includes(ExtensionWithDot)) {
        return Language.id;
      }
    }
  }
  return void 0;
}
__name(ResolveLanguageIdFromRegistry, "ResolveLanguageIdFromRegistry");
function DeriveLanguageIdFromUri(UriString) {
  if (!UriString) return "plaintext";
  let Path = UriString;
  const SchemeEnd = Path.indexOf("://");
  if (SchemeEnd !== -1) Path = Path.slice(SchemeEnd + 3);
  const QueryStart = Path.indexOf("?");
  if (QueryStart !== -1) Path = Path.slice(0, QueryStart);
  const HashStart = Path.indexOf("#");
  if (HashStart !== -1) Path = Path.slice(0, HashStart);
  const LastSlash = Math.max(Path.lastIndexOf("/"), Path.lastIndexOf("\\"));
  const FileName = LastSlash === -1 ? Path : Path.slice(LastSlash + 1);
  const Lower = FileName.toLowerCase();
  switch (Lower) {
    case "dockerfile":
    case "dockerfile.dev":
    case "dockerfile.prod":
      return "dockerfile";
    case "makefile":
    case "gnumakefile":
      return "makefile";
    case "cmakelists.txt":
      return "cmake";
    case ".gitignore":
    case ".dockerignore":
      return "ignore";
    case ".gitattributes":
      return "properties";
  }
  const Dot = FileName.lastIndexOf(".");
  if (Dot === -1 || Dot === FileName.length - 1) return "plaintext";
  const Extension = FileName.slice(Dot + 1).toLowerCase();
  return STATIC_EXTENSION_TO_LANGUAGE[Extension] ?? "plaintext";
}
__name(DeriveLanguageIdFromUri, "DeriveLanguageIdFromUri");
var FiredLanguages = /* @__PURE__ */ new Set();
function FireOnLanguageActivation(Context, LanguageId) {
  if (!LanguageId || LanguageId === "plaintext") return;
  if (FiredLanguages.has(LanguageId)) return;
  FiredLanguages.add(LanguageId);
  const Event = `onLanguage:${LanguageId}`;
  const Router = Context.ActivateByEvent;
  if (typeof Router === "function") {
    Router(Event).catch((Error2) => {
      const Message = Error2 instanceof globalThis.Error ? Error2.message : String(Error2);
      console.warn(
        `[LanguageActivation] onLanguage:${LanguageId} failed: ${Message}`
      );
    });
    return;
  }
  const Matching = Context.ActivationEventIndex?.get(Event) ?? [];
  if (Matching.length > 0) {
    console.log(
      `[LanguageActivation] ${Event} matches ${Matching.length} extension(s); activate router is absent - extensions will activate on their next event instead`
    );
  }
}
__name(FireOnLanguageActivation, "FireOnLanguageActivation");

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/TextDocument.ts
import { promises as FsPromises } from "node:fs";
var BuildOpenTextDocument = /* @__PURE__ */ __name((Context) => async (UriOrPath) => {
  const UriString = typeof UriOrPath === "string" ? UriOrPath : UriOrPath?.toString?.() ?? "";
  const Cached = Context.DocumentContentCache.get(UriString);
  let Text;
  if (Cached !== void 0) {
    Text = Cached;
  } else {
    const Decision = Route(UriOrPath);
    if (Decision === "native") {
      const Path = ExtractFsPath(UriOrPath);
      if (Path !== void 0) {
        if (process.env["LAND_DEV_LOG"]) {
          process.stdout.write(
            `[DEV:FS-ROUTE] op=openTextDocument route=native uri=${UriString}
`
          );
        }
        try {
          Text = await FsPromises.readFile(Path, "utf8");
        } catch {
          Text = "";
        }
      } else {
        Text = await Call(Context, "FileSystem.ReadFile", [
          UriString
        ]) ?? "";
      }
    } else {
      if (process.env["LAND_DEV_LOG"]) {
        process.stdout.write(
          `[DEV:FS-ROUTE] op=openTextDocument route=mountain uri=${UriString}
`
        );
      }
      Text = await Call(Context, "FileSystem.ReadFile", [
        UriString
      ]) ?? "";
    }
  }
  const LanguageId = DeriveLanguageIdFromUri(UriString);
  if (LanguageId !== "plaintext") {
    FireOnLanguageActivation(Context, LanguageId);
  }
  return {
    uri: UriOrPath,
    fileName: UriString,
    languageId: LanguageId,
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
  const Removals = Current.slice(Start, Start + RemoveCount).map(
    (Folder) => ({
      uri: {
        value: typeof Folder?.uri === "string" ? Folder.uri : Folder?.uri?.["toString"]?.call(Folder?.uri) ?? String(Folder?.uri)
      }
    })
  );
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
export {
  BuildApplyEdit,
  BuildDocumentEventMembers,
  BuildOpenTextDocument,
  BuildSaveAll,
  BuildUpdateWorkspaceFolders
};
//# sourceMappingURL=TextDocument.js.map
