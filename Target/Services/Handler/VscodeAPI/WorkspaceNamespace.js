var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace.ts
var EventSubscriber = /* @__PURE__ */ __name((Context, EventName) => (Listener) => {
  Context.WorkspaceEventEmitter.on(EventName, Listener);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.WorkspaceEventEmitter.removeListener(EventName, Listener);
    }, "dispose")
  };
}, "EventSubscriber");
var Call = /* @__PURE__ */ __name(async (Context, Method, Parameters) => {
  try {
    return await Context.MountainClient?.sendRequest(Method, Parameters);
  } catch {
    return void 0;
  }
}, "Call");
var CreateWorkspaceNamespace = /* @__PURE__ */ __name((Context) => {
  const InitWorkspace = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
  return {
    workspaceFolders: InitWorkspace.folders ?? [],
    name: InitWorkspace.name,
    workspaceFile: void 0,
    rootPath: void 0,
    textDocuments: [],
    notebookDocuments: [],
    getConfiguration: /* @__PURE__ */ __name((Section, _Scope) => ({
      get: /* @__PURE__ */ __name((Key, DefaultValue) => {
        const Full = Section ? `${Section}.${Key}` : Key;
        void Call(Context, "Configuration.Inspect", [Full]);
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
      }, "update"),
      has: /* @__PURE__ */ __name((Key) => {
        void Key;
        return false;
      }, "has"),
      inspect: /* @__PURE__ */ __name(() => void 0, "inspect")
    }), "getConfiguration"),
    findFiles: /* @__PURE__ */ __name(async (Include, Exclude, MaxResults) => {
      const Pattern = typeof Include === "string" ? Include : Include?.pattern ?? "";
      const ExcludePattern = typeof Exclude === "string" ? Exclude : Exclude?.pattern;
      const Results = await Call(Context, "Search.TextSearch", {
        pattern: Pattern,
        include: Pattern,
        exclude: ExcludePattern,
        maxResults: MaxResults,
        isRegExp: false,
        isCaseSensitive: false,
        isWordMatch: false
      });
      return Results ?? [];
    }, "findFiles"),
    openTextDocument: /* @__PURE__ */ __name(async (UriOrPath) => {
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
    }, "openTextDocument"),
    saveAll: /* @__PURE__ */ __name(async (_IncludeUntitled) => {
      await Call(Context, "Document.Save", []);
      return true;
    }, "saveAll"),
    applyEdit: /* @__PURE__ */ __name(async (_Edit) => {
      Context.SendToMountain("workspace.applyEdit", _Edit).catch(() => {
      });
      return true;
    }, "applyEdit"),
    asRelativePath: /* @__PURE__ */ __name((PathOrUri) => String(PathOrUri), "asRelativePath"),
    updateWorkspaceFolders: /* @__PURE__ */ __name(() => false, "updateWorkspaceFolders"),
    onDidOpenTextDocument: EventSubscriber(Context, "didOpenTextDocument"),
    onDidCloseTextDocument: EventSubscriber(Context, "didCloseTextDocument"),
    onDidChangeTextDocument: EventSubscriber(Context, "didChangeTextDocument"),
    onDidSaveTextDocument: EventSubscriber(Context, "didSaveTextDocument"),
    onWillSaveTextDocument: EventSubscriber(Context, "willSaveTextDocument"),
    onDidCreateFiles: EventSubscriber(Context, "didCreateFiles"),
    onDidDeleteFiles: EventSubscriber(Context, "didDeleteFiles"),
    onDidRenameFiles: EventSubscriber(Context, "didRenameFiles"),
    onDidChangeConfiguration: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "onDidChangeConfiguration"),
    onDidChangeWorkspaceFolders: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "onDidChangeWorkspaceFolders"),
    registerTextDocumentContentProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerTextDocumentContentProvider"),
    registerFileSystemProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerFileSystemProvider"),
    registerTaskProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerTaskProvider"),
    registerNotebookContentProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerNotebookContentProvider"),
    registerNotebookSerializer: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerNotebookSerializer"),
    registerRemoteAuthorityResolver: /* @__PURE__ */ __name((_AuthorityPrefix, _Resolver) => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerRemoteAuthorityResolver"),
    registerResourceLabelFormatter: /* @__PURE__ */ __name((_Formatter) => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerResourceLabelFormatter"),
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
    onDidOpenNotebookDocument: EventSubscriber(Context, "didOpenNotebookDocument"),
    onDidCloseNotebookDocument: EventSubscriber(Context, "didCloseNotebookDocument"),
    onDidChangeNotebookDocument: EventSubscriber(Context, "didChangeNotebookDocument"),
    onDidSaveNotebookDocument: EventSubscriber(Context, "didSaveNotebookDocument"),
    onWillSaveNotebookDocument: EventSubscriber(Context, "willSaveNotebookDocument"),
    onWillRenameFiles: EventSubscriber(Context, "willRenameFiles"),
    onWillCreateFiles: EventSubscriber(Context, "willCreateFiles"),
    onWillDeleteFiles: EventSubscriber(Context, "willDeleteFiles"),
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
    createFileSystemWatcher: /* @__PURE__ */ __name(() => ({
      ignoreCreateEvents: false,
      ignoreChangeEvents: false,
      ignoreDeleteEvents: false,
      onDidCreate: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidCreate"),
      onDidChange: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChange"),
      onDidDelete: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidDelete"),
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    }), "createFileSystemWatcher"),
    fs: {
      // FileSystem.Stat is not yet in CreateEffectForRequest — falls back
      // to defaults via Call's try/catch until the Rust route is added.
      stat: /* @__PURE__ */ __name(async (Uri) => await Call(Context, "FileSystem.Stat", [String(Uri)]) ?? {
        type: 1,
        size: 0,
        ctime: 0,
        mtime: 0
      }, "stat"),
      readFile: /* @__PURE__ */ __name(async (Uri) => {
        const Text = await Call(Context, "FileSystem.ReadFile", [
          String(Uri)
        ]) ?? "";
        return new TextEncoder().encode(Text);
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
    }
  };
}, "CreateWorkspaceNamespace");
var WorkspaceNamespace_default = CreateWorkspaceNamespace;
export {
  WorkspaceNamespace_default as default
};
//# sourceMappingURL=WorkspaceNamespace.js.map
