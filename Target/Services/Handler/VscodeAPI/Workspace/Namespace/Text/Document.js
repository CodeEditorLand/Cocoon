var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/Land/Fix/Log.ts
var Mode = process.env["Mend"] ?? "short";
var Enabled = Mode !== "off";
var Long = Mode === "long";
var DebugEnabled = Long;
var AllowList = (() => {
  const Raw2 = process.env["Mend"];
  if (!Raw2 || Raw2.trim().length === 0) return void 0;
  const Tags = Raw2.split(",").map((Entry) => Entry.trim()).filter((Entry) => Entry.length > 0);
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
  IPC: Pick("IPC", "Mountain")
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
var CocoonDevLog2 = /* @__PURE__ */ __name((Tag, Message) => {
  if (!IsEnabled(Tag)) return;
  const TagUpper = Tag.toUpperCase();
  process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
}, "CocoonDevLog");
var Log_default2 = CocoonDevLog2;

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Language/Activation.ts
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
      CocoonDevLog2(
        "language-activation",
        `[LanguageActivation] onLanguage:${LanguageId} failed: ${Message}`
      );
    });
    return;
  }
  const Matching = Context.ActivationEventIndex?.get(Event) ?? [];
  if (Matching.length > 0) {
    CocoonDevLog2(
      "language-activation",
      `[LanguageActivation] ${Event} matches ${Matching.length} extension(s); activate router is absent - extensions will activate on their next event instead`
    );
  }
}
__name(FireOnLanguageActivation, "FireOnLanguageActivation");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Text/Document.ts
import { promises as FsPromises } from "node:fs";
var BuildOpenTextDocument = /* @__PURE__ */ __name((Context) => async (UriOrPath) => {
  if (UriOrPath && typeof UriOrPath === "object" && !UriOrPath.scheme && !UriOrPath.path && !UriOrPath.fsPath && (typeof UriOrPath.language === "string" || typeof UriOrPath.content === "string")) {
    const InlineContent = typeof UriOrPath.content === "string" ? UriOrPath.content : "";
    const InlineLang = typeof UriOrPath.language === "string" ? UriOrPath.language : "plaintext";
    const UntitledKey = `untitled:Untitled-${Date.now()}`;
    Context.DocumentContentCache.set(UntitledKey, InlineContent);
    if (!Array.isArray(Context.__textDocuments))
      Context.__textDocuments = [];
    const UriShape = {
      toString: /* @__PURE__ */ __name(() => UntitledKey, "toString"),
      fsPath: "",
      scheme: "untitled",
      path: UntitledKey.slice("untitled:".length),
      external: UntitledKey
    };
    const Lines2 = InlineContent.split("\n");
    const LineStarts2 = [0];
    for (let I = 0; I < InlineContent.length; I++) {
      if (InlineContent.charCodeAt(I) === 10) LineStarts2.push(I + 1);
    }
    const PositionAt2 = /* @__PURE__ */ __name((Off) => {
      let Lo = 0, Hi = LineStarts2.length - 1;
      while (Lo < Hi) {
        const Mid = Lo + Hi + 1 >>> 1;
        if (LineStarts2[Mid] <= Off) Lo = Mid;
        else Hi = Mid - 1;
      }
      return { line: Lo, character: Off - LineStarts2[Lo] };
    }, "PositionAt");
    const OffsetAt2 = /* @__PURE__ */ __name((P) => {
      const L = Math.max(0, Math.min(P?.line ?? 0, Lines2.length - 1));
      return Math.max(0, (LineStarts2[L] ?? 0) + (P?.character ?? 0));
    }, "OffsetAt");
    const Doc = {
      uri: UriShape,
      fileName: UntitledKey,
      languageId: InlineLang,
      isDirty: false,
      isClosed: false,
      isUntitled: true,
      version: 1,
      eol: 1,
      lineCount: Lines2.length,
      getText: /* @__PURE__ */ __name(() => InlineContent, "getText"),
      positionAt: PositionAt2,
      offsetAt: OffsetAt2,
      lineAt: /* @__PURE__ */ __name((N) => {
        const Ln = typeof N === "number" ? N : N?.line ?? 0;
        const T = Lines2[Ln] ?? "";
        return {
          lineNumber: Ln,
          text: T,
          range: {
            start: { line: Ln, character: 0 },
            end: { line: Ln, character: T.length }
          },
          firstNonWhitespaceCharacterIndex: T.search(/\S/) < 0 ? T.length : T.search(/\S/),
          isEmptyOrWhitespace: T.trim().length === 0
        };
      }, "lineAt"),
      getWordRangeAtPosition: /* @__PURE__ */ __name(() => void 0, "getWordRangeAtPosition"),
      validateRange: /* @__PURE__ */ __name((R) => R, "validateRange"),
      validatePosition: /* @__PURE__ */ __name((P) => P, "validatePosition"),
      save: /* @__PURE__ */ __name(async () => false, "save")
    };
    Context.__textDocuments.push(Doc);
    setImmediate(() => {
      try {
        Context.WorkspaceEventEmitter?.emit(
          "didOpenTextDocument",
          Doc
        );
      } catch {
      }
    });
    return Doc;
  }
  const UriString = typeof UriOrPath === "string" ? UriOrPath : UriOrPath?.toString?.() ?? "";
  if (UriString.startsWith("untitled:") || UriString === "") {
    const Content = Context.DocumentContentCache.get(UriString) ?? "";
    const ULines = Content.split("\n");
    const UntitledLang = DeriveLanguageIdFromUri(UriString);
    return {
      uri: UriOrPath ?? {
        toString: /* @__PURE__ */ __name(() => UriString, "toString"),
        scheme: "untitled",
        path: UriString.slice("untitled:".length)
      },
      fileName: UriString,
      languageId: UntitledLang,
      isDirty: false,
      isClosed: false,
      isUntitled: true,
      version: 1,
      eol: 1,
      lineCount: ULines.length,
      getText: /* @__PURE__ */ __name(() => Content, "getText"),
      positionAt: /* @__PURE__ */ __name((Off) => {
        let Rem = Off;
        for (let I = 0; I < ULines.length; I++) {
          const L = ULines[I].length + 1;
          if (Rem < L) return { line: I, character: Rem };
          Rem -= L;
        }
        return {
          line: ULines.length - 1,
          character: ULines[ULines.length - 1]?.length ?? 0
        };
      }, "positionAt"),
      offsetAt: /* @__PURE__ */ __name((P) => {
        let O = 0;
        for (let I = 0; I < (P?.line ?? 0); I++)
          O += (ULines[I]?.length ?? 0) + 1;
        return O + (P?.character ?? 0);
      }, "offsetAt"),
      lineAt: /* @__PURE__ */ __name((N) => {
        const Ln = typeof N === "number" ? N : N?.line ?? 0;
        const T = ULines[Ln] ?? "";
        return {
          lineNumber: Ln,
          text: T,
          range: {
            start: { line: Ln, character: 0 },
            end: { line: Ln, character: T.length }
          },
          firstNonWhitespaceCharacterIndex: T.search(/\S/) < 0 ? T.length : T.search(/\S/),
          isEmptyOrWhitespace: T.trim().length === 0
        };
      }, "lineAt"),
      getWordRangeAtPosition: /* @__PURE__ */ __name(() => void 0, "getWordRangeAtPosition"),
      validateRange: /* @__PURE__ */ __name((R) => R, "validateRange"),
      validatePosition: /* @__PURE__ */ __name((P) => P, "validatePosition"),
      save: /* @__PURE__ */ __name(async () => false, "save")
    };
  }
  const Cached = Context.DocumentContentCache.get(UriString);
  let Text;
  if (Cached !== void 0) {
    Text = Cached;
  } else {
    const DecodeRaw = /* @__PURE__ */ __name((Raw2) => {
      if (typeof Raw2 === "string") return Raw2;
      if (Array.isArray(Raw2)) {
        return Buffer.from(Raw2).toString("utf8");
      }
      if (Raw2 instanceof Uint8Array) {
        return Buffer.from(Raw2).toString("utf8");
      }
      if (Raw2 && typeof Raw2 === "object") {
        const Maybe = Raw2.content;
        if (Array.isArray(Maybe)) {
          return Buffer.from(Maybe).toString("utf8");
        }
        if (Maybe instanceof Uint8Array) {
          return Buffer.from(Maybe).toString("utf8");
        }
        if (typeof Maybe === "string") return Maybe;
      }
      return Raw2 == null ? "" : String(Raw2);
    }, "DecodeRaw");
    const Scheme = (() => {
      if (typeof UriOrPath === "object" && UriOrPath?.scheme)
        return String(UriOrPath.scheme);
      if (typeof UriString === "string") {
        const C = UriString.indexOf(":");
        if (C > 0 && C < 32) return UriString.slice(0, C);
      }
      return "file";
    })();
    if (Scheme !== "file") {
      const Provider = Context.ExtensionRegistry?.get(
        `__textDocumentContentProvider:${Scheme}`
      );
      if (Provider && typeof Provider.provideTextDocumentContent === "function") {
        const CancellationToken = {
          isCancellationRequested: false,
          onCancellationRequested: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") }), "onCancellationRequested")
        };
        let ProviderUri = UriOrPath;
        try {
          const API = globalThis.__cocoonVscodeAPI;
          if (API?.Uri && UriString)
            ProviderUri = API.Uri.parse(UriString);
        } catch {
        }
        try {
          const Content = await Provider.provideTextDocumentContent(
            ProviderUri,
            CancellationToken
          );
          Text = typeof Content === "string" ? Content : Content ?? "";
        } catch {
          Text = "";
        }
        if (Text !== void 0) {
          Context.DocumentContentCache.set(UriString, Text);
        } else {
          Text = "";
        }
      }
    }
    const Decision = Route(UriOrPath);
    if (Text === void 0) {
      if (Decision === "native") {
        const Path = ExtractFsPath(UriOrPath);
        if (Path !== void 0) {
          if (process.env["Trace"]) {
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
          Text = DecodeRaw(
            await Call(
              Context,
              "FileSystem.ReadFile",
              [UriString]
            )
          );
        }
      } else {
        if (process.env["Trace"]) {
          process.stdout.write(
            `[DEV:FS-ROUTE] op=openTextDocument route=mountain uri=${UriString}
`
          );
        }
        Text = DecodeRaw(
          await Call(Context, "FileSystem.ReadFile", [
            UriString
          ])
        );
      }
    }
  }
  const LanguageId = DeriveLanguageIdFromUri(UriString);
  if (LanguageId !== "plaintext") {
    FireOnLanguageActivation(Context, LanguageId);
  }
  const LineStarts = [0];
  for (let I = 0; I < Text.length; I++) {
    if (Text.charCodeAt(I) === 10) LineStarts.push(I + 1);
  }
  const Lines = Text.split("\n");
  const ClampOffset = /* @__PURE__ */ __name((Offset) => Math.max(0, Math.min(Math.floor(Offset || 0), Text.length)), "ClampOffset");
  const PositionAt = /* @__PURE__ */ __name((Offset) => {
    const Clamped = ClampOffset(Offset);
    let Lo = 0;
    let Hi = LineStarts.length - 1;
    while (Lo < Hi) {
      const Mid = Lo + Hi + 1 >>> 1;
      if (LineStarts[Mid] <= Clamped) Lo = Mid;
      else Hi = Mid - 1;
    }
    return { line: Lo, character: Clamped - LineStarts[Lo] };
  }, "PositionAt");
  const OffsetAt = /* @__PURE__ */ __name((Position) => {
    const L = Math.max(
      0,
      Math.min(Math.floor(Position?.line ?? 0), Lines.length - 1)
    );
    const C = Math.max(0, Math.floor(Position?.character ?? 0));
    const LineLength = Lines[L]?.length ?? 0;
    return ClampOffset((LineStarts[L] ?? 0) + Math.min(C, LineLength));
  }, "OffsetAt");
  const LineAt = /* @__PURE__ */ __name((LineOrPosition) => {
    const L = typeof LineOrPosition === "number" ? LineOrPosition : LineOrPosition?.line ?? 0;
    const Clamped = Math.max(
      0,
      Math.min(Math.floor(L), Lines.length - 1)
    );
    const Content = Lines[Clamped] ?? "";
    const Start = { line: Clamped, character: 0 };
    const End = { line: Clamped, character: Content.length };
    return {
      lineNumber: Clamped,
      text: Content,
      range: { start: Start, end: End },
      rangeIncludingLineBreak: {
        start: Start,
        end: Clamped < Lines.length - 1 ? { line: Clamped + 1, character: 0 } : End
      },
      firstNonWhitespaceCharacterIndex: Content.search(/\S/) >>> 0,
      isEmptyOrWhitespace: Content.trim().length === 0
    };
  }, "LineAt");
  const ValidateRange = /* @__PURE__ */ __name((Range) => Range, "ValidateRange");
  const ValidatePosition = /* @__PURE__ */ __name((Position) => Position, "ValidatePosition");
  const GetWordRangeAtPosition = /* @__PURE__ */ __name((Position, Regex) => {
    const L = Math.max(
      0,
      Math.min(Math.floor(Position?.line ?? 0), Lines.length - 1)
    );
    const Line = Lines[L] ?? "";
    const C = Math.max(0, Math.floor(Position?.character ?? 0));
    const Pattern = Regex ?? /[A-Za-z_$][\w$]*/g;
    Pattern.lastIndex = 0;
    let Match;
    while ((Match = Pattern.exec(Line)) !== null) {
      const Start = Match.index;
      const End = Start + Match[0].length;
      if (C >= Start && C <= End) {
        return {
          start: { line: L, character: Start },
          end: { line: L, character: End }
        };
      }
      if (Match.index === Pattern.lastIndex) Pattern.lastIndex++;
    }
    return void 0;
  }, "GetWordRangeAtPosition");
  return {
    uri: UriOrPath,
    fileName: UriString,
    languageId: LanguageId,
    isDirty: false,
    isClosed: false,
    isUntitled: false,
    version: 1,
    eol: 1,
    lineCount: Lines.length,
    getText: /* @__PURE__ */ __name((Range) => {
      if (!Range) return Text;
      const Start = OffsetAt(
        Range.start ?? { line: 0, character: 0 }
      );
      const End = OffsetAt(
        Range.end ?? {
          line: Lines.length - 1,
          character: Lines[Lines.length - 1]?.length ?? 0
        }
      );
      return Text.slice(Math.min(Start, End), Math.max(Start, End));
    }, "getText"),
    positionAt: PositionAt,
    offsetAt: OffsetAt,
    lineAt: LineAt,
    getWordRangeAtPosition: GetWordRangeAtPosition,
    validateRange: ValidateRange,
    validatePosition: ValidatePosition,
    save: /* @__PURE__ */ __name(async () => true, "save")
  };
}, "BuildOpenTextDocument");
var BuildSaveAll = /* @__PURE__ */ __name((Context) => async (_IncludeUntitled) => {
  try {
    await Call(Context, "Workspace.SaveAll", [
      _IncludeUntitled ?? false
    ]);
  } catch {
    Context.MountainClient?.sendRequest("Workspace.SaveAll", [
      _IncludeUntitled ?? false
    ]).catch(() => {
    });
  }
  return true;
}, "BuildSaveAll");
var BuildApplyEdit = /* @__PURE__ */ __name((Context) => async (_Edit) => {
  try {
    await Call(Context, "applyEdit", [_Edit]);
  } catch {
    Context.SendToMountain("workspace.applyEdit", _Edit).catch(
      () => {
      }
    );
  }
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
    const Raw2 = Folder?.uri;
    const Serialized = typeof Raw2 === "string" ? Raw2 : Raw2?.["toString"]?.call(Raw2) ?? String(Raw2 ?? "");
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
  // `onWillSaveTextDocument` must add the listener to `__willSaveListeners`
  // (the array the notification handler iterates for `waitUntil` support)
  // AND also emit the event on WorkspaceEventEmitter so plain subscribers
  // still fire. Without the `__willSaveListeners` path, format-on-save
  // extensions that call `event.waitUntil(Promise<TextEdit[]>)` inside
  // their listener never deliver their edits before the disk write.
  onWillSaveTextDocument: /* @__PURE__ */ __name((Listener, ThisArg, Disposables) => {
    const Bound = ThisArg === void 0 ? Listener : Listener.bind(ThisArg);
    if (!Array.isArray(Context.__willSaveListeners)) {
      Context.__willSaveListeners = [];
    }
    Context.__willSaveListeners.push(Bound);
    const Subscription = {
      dispose: /* @__PURE__ */ __name(() => {
        const All = Context.__willSaveListeners;
        if (Array.isArray(All)) {
          const Idx = All.indexOf(Bound);
          if (Idx !== -1) All.splice(Idx, 1);
        }
        Context.WorkspaceEventEmitter.removeListener(
          "willSaveTextDocument",
          Bound
        );
      }, "dispose")
    };
    if (Disposables && typeof Disposables.push === "function") {
      Disposables.push(Subscription);
    }
    return Subscription;
  }, "onWillSaveTextDocument"),
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
//# sourceMappingURL=Document.js.map
