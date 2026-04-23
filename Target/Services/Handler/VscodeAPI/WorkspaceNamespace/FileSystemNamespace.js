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

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/FileSystemNamespace.ts
import { promises as FsPromises } from "node:fs";
import { dirname as PathDirname } from "node:path";
var FileType = {
  Unknown: 0,
  File: 1,
  Directory: 2,
  SymbolicLink: 64
};
var LogRoute = /* @__PURE__ */ __name((Operation, Uri, Decision) => {
  if (!process.env["LAND_DEV_LOG"]) return;
  process.stdout.write(
    `[DEV:FS-ROUTE] op=${Operation} route=${Decision} scheme=${ExtractScheme(Uri)} uri=${String(Uri)}
`
  );
}, "LogRoute");
var ThrowFileNotFound = /* @__PURE__ */ __name((Uri) => {
  const Api = globalThis.__cocoonVscodeAPI;
  const FileNotFound = Api?.FileSystemError?.FileNotFound;
  if (typeof FileNotFound === "function") throw FileNotFound(Uri);
  const Synthetic = new Error(
    `EntryNotFound (FileSystemError): ${String(Uri)}`
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
    return await Call(Context, "FileSystem.Stat", [String(Uri)]) ?? {
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
    const UriString = String(Uri);
    try {
      const Raw = await Context.MountainClient?.sendRequest(
        "FileSystem.ReadFile",
        [UriString]
      );
      if (Raw == null) return Buffer.alloc(0);
      if (Array.isArray(Raw)) return Buffer.from(Raw);
      if (Raw instanceof Uint8Array) return Buffer.from(Raw);
      return Buffer.from(String(Raw), "utf8");
    } catch (Err) {
      const Message = Err instanceof Error ? Err.message : String(Err);
      if (/resource not found|ENOENT|not found/i.test(Message)) {
        process.stdout.write(
          `[LandFix:FsRead] 404 \u2192 FileNotFound for ${UriString}
`
        );
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
    const Text = new TextDecoder().decode(Content);
    await Call(Context, "FileSystem.WriteFile", [String(Uri), Text]);
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
      [String(Uri)]
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
    await Call(Context, "FileSystem.CreateDirectory", [String(Uri)]);
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
      String(Uri),
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
      String(Source),
      String(Target)
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
      String(Source),
      String(Target)
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
//# sourceMappingURL=FileSystemNamespace.js.map
