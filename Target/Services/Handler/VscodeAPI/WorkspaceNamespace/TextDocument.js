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
var ClaimedFileSystemSchemes = /* @__PURE__ */ new Set();
var BuildRegisterFileSystemProvider = /* @__PURE__ */ __name((Context) => (Scheme, _Provider, Options) => {
  const Handle = NextProviderHandle();
  ClaimedFileSystemSchemes.add(Scheme);
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
  if (Scheme !== "file") return "mountain";
  if (ClaimedFileSystemSchemes.has("file")) return "mountain";
  return ExtractFsPath(Uri) !== void 0 ? "native" : "mountain";
}
__name(Route, "Route");

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
export {
  BuildApplyEdit,
  BuildDocumentEventMembers,
  BuildOpenTextDocument,
  BuildSaveAll,
  BuildUpdateWorkspaceFolders
};
//# sourceMappingURL=TextDocument.js.map
