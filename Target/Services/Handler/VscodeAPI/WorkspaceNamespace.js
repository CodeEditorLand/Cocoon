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

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace.ts
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
  } catch (Error2) {
    process.stdout.write(
      `[LandFix:WsNs] findFiles: glob compile failed for ${IncludePattern}: ${Error2 instanceof Error2 ? Error2.message : String(Error2)}
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
var CreateWorkspaceNamespace = /* @__PURE__ */ __name((Context) => {
  const InitWorkspace = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
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
        if (ConfigCache.has(Full)) {
          return ConfigCache.get(Full);
        }
        PrimeConfig(Full);
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
        const Prior = ConfigCache.get(Full);
        ConfigCache.set(Full, Value);
        if (Prior !== Value) FireConfigChange(Full);
      }, "update"),
      has: /* @__PURE__ */ __name((Key) => {
        const Full = Section ? `${Section}.${Key}` : Key;
        if (ConfigCache.has(Full)) return true;
        PrimeConfig(Full);
        return false;
      }, "has"),
      inspect: /* @__PURE__ */ __name((Key) => {
        const Full = Section ? `${Section}.${Key}` : Key;
        if (!ConfigCache.has(Full)) {
          PrimeConfig(Full);
          return void 0;
        }
        const Cached = ConfigCache.get(Full);
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
    }), "getConfiguration"),
    findFiles: /* @__PURE__ */ __name(async (Include, Exclude, MaxResults) => {
      return FindFilesLocal(
        Context,
        InitWorkspace.folders ?? [],
        Include,
        Exclude,
        MaxResults
      );
    }, "findFiles"),
    openTextDocument: /* @__PURE__ */ __name(async (UriOrPath) => {
      const UriString = typeof UriOrPath === "string" ? UriOrPath : UriOrPath?.toString?.() ?? "";
      const Cached = Context.DocumentContentCache.get(UriString);
      const Text = Cached ?? await Call(Context, "FileSystem.ReadFile", [
        UriString
      ]) ?? "";
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
      Context.SendToMountain("workspace.applyEdit", _Edit).catch(
        () => {
        }
      );
      return true;
    }, "applyEdit"),
    asRelativePath: /* @__PURE__ */ __name((PathOrUri) => String(PathOrUri), "asRelativePath"),
    updateWorkspaceFolders: /* @__PURE__ */ __name(() => false, "updateWorkspaceFolders"),
    onDidOpenTextDocument: EventSubscriber(Context, "didOpenTextDocument"),
    onDidCloseTextDocument: EventSubscriber(
      Context,
      "didCloseTextDocument"
    ),
    onDidChangeTextDocument: EventSubscriber(
      Context,
      "didChangeTextDocument"
    ),
    onDidSaveTextDocument: EventSubscriber(Context, "didSaveTextDocument"),
    onWillSaveTextDocument: EventSubscriber(
      Context,
      "willSaveTextDocument"
    ),
    onDidCreateFiles: EventSubscriber(Context, "didCreateFiles"),
    onDidDeleteFiles: EventSubscriber(Context, "didDeleteFiles"),
    onDidRenameFiles: EventSubscriber(Context, "didRenameFiles"),
    onDidChangeConfiguration: /* @__PURE__ */ __name((Listener) => {
      ConfigListeners.add(Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          ConfigListeners.delete(Listener);
        }, "dispose")
      };
    }, "onDidChangeConfiguration"),
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
    registerResourceLabelFormatter: /* @__PURE__ */ __name((_Formatter) => ({
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    }), "registerResourceLabelFormatter"),
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
    ),
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
          const Text = await Context.MountainClient?.sendRequest(
            "FileSystem.ReadFile",
            [UriString]
          );
          return new TextEncoder().encode(Text ?? "");
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
    }
  };
}, "CreateWorkspaceNamespace");
var WorkspaceNamespace_default = CreateWorkspaceNamespace;
export {
  WorkspaceNamespace_default as default
};
//# sourceMappingURL=WorkspaceNamespace.js.map
