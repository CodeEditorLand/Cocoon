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
export {
  BuildFileSystemNamespace
};
//# sourceMappingURL=FileSystemNamespace.js.map
