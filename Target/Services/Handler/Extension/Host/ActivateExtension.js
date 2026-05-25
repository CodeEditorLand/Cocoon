var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Platform/FiddeeRoot.ts
var DotfileName = ".fiddee";
function FiddeeRoot() {
  const Home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? null;
  if (typeof Home === "string" && Home.length > 0) {
    return `${Home}/${DotfileName}`;
  }
  return DotfileName;
}
__name(FiddeeRoot, "FiddeeRoot");

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
var CocoonDevLog = /* @__PURE__ */ __name((Tag, Message) => {
  if (!IsEnabled(Tag)) return;
  const TagUpper = Tag.toUpperCase();
  process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
}, "CocoonDevLog");
var Log_default = CocoonDevLog;

// Source/Services/Handler/Extension/Host/ActivateExtension.ts
import * as NodeFS from "node:fs";
var CreateExtensionContext = /* @__PURE__ */ __name((Context, Extension, ExtensionPath) => {
  const ExtId = Extension?.identifier?.value ?? Extension?.identifier?.id ?? Extension?.identifier ?? "";
  const FiddeeRootPath = FiddeeRoot();
  const StorageBase = `${FiddeeRootPath}/extensionStorage`;
  const GlobalStorageBase = `${FiddeeRootPath}/globalStorage`;
  const LogBase = `${FiddeeRootPath}/logs`;
  const ExtStoragePath = `${StorageBase}/${ExtId}`;
  const GlobalStoragePath = `${GlobalStorageBase}/${ExtId}`;
  const LogPath = `${LogBase}/${ExtId}`;
  try {
    NodeFS.mkdirSync(ExtStoragePath, { recursive: true });
    NodeFS.mkdirSync(GlobalStoragePath, { recursive: true });
    NodeFS.mkdirSync(LogPath, { recursive: true });
  } catch {
  }
  let FullPackageJSON = Extension;
  try {
    const Contents = NodeFS.readFileSync(
      `${ExtensionPath}/package.json`,
      "utf8"
    );
    const Parsed = JSON.parse(Contents);
    FullPackageJSON = {
      ...Parsed,
      ...Extension
    };
  } catch {
  }
  const VsCodeUri = globalThis.__cocoonVscodeAPI?.Uri;
  const MakeUri = /* @__PURE__ */ __name((Path) => {
    if (VsCodeUri && typeof VsCodeUri.file === "function") {
      return VsCodeUri.file(Path);
    }
    return {
      scheme: "file",
      path: Path,
      fsPath: Path,
      authority: "",
      query: "",
      fragment: "",
      with: /* @__PURE__ */ __name(function(Change) {
        return { ...this, ...Change };
      }, "with"),
      toString: /* @__PURE__ */ __name(() => `file://${Path}`, "toString")
    };
  }, "MakeUri");
  return {
    subscriptions: [],
    extensionPath: ExtensionPath,
    extensionUri: MakeUri(ExtensionPath),
    // VS Code API: `context.asAbsolutePath(relative)` returns the
    // extension path joined with a relative path. The 4 language-
    // features extensions all call this immediately in their activate
    // function to resolve server bundle locations; without it, they
    // fail before vscode-languageclient even constructs.
    asAbsolutePath: /* @__PURE__ */ __name((RelativePath) => {
      const Trimmed = RelativePath.replace(/^\.?\//, "");
      return `${ExtensionPath}/${Trimmed}`;
    }, "asAbsolutePath"),
    storagePath: ExtStoragePath,
    globalStoragePath: GlobalStoragePath,
    logPath: LogPath,
    storageUri: MakeUri(ExtStoragePath),
    globalStorageUri: MakeUri(GlobalStoragePath),
    logUri: MakeUri(LogPath),
    environmentVariableCollection: /* @__PURE__ */ (() => {
      const ExtIdCached = ExtId;
      const Entries = /* @__PURE__ */ new Map();
      const Forward = /* @__PURE__ */ __name((Op, Extra) => {
        Context.SendToMountain("terminal.envCollection." + Op, {
          extensionId: ExtIdCached,
          persistent: Persistent,
          description: Description,
          ...Extra
        }).catch(() => {
        });
      }, "Forward");
      let Persistent = false;
      let Description = void 0;
      const Collection = {
        get persistent() {
          return Persistent;
        },
        set persistent(Value) {
          Persistent = !!Value;
          Forward("setPersistent", { persistent: Persistent });
        },
        get description() {
          return Description;
        },
        set description(Value) {
          Description = Value;
          Forward("setDescription", { description: Value });
        },
        replace: /* @__PURE__ */ __name((Variable, Value, Options) => {
          Entries.set(Variable, {
            value: Value,
            type: 1,
            options: Options
          });
          Forward("replace", {
            variable: Variable,
            value: Value,
            options: Options
          });
        }, "replace"),
        append: /* @__PURE__ */ __name((Variable, Value, Options) => {
          Entries.set(Variable, {
            value: Value,
            type: 2,
            options: Options
          });
          Forward("append", {
            variable: Variable,
            value: Value,
            options: Options
          });
        }, "append"),
        prepend: /* @__PURE__ */ __name((Variable, Value, Options) => {
          Entries.set(Variable, {
            value: Value,
            type: 3,
            options: Options
          });
          Forward("prepend", {
            variable: Variable,
            value: Value,
            options: Options
          });
        }, "prepend"),
        get: /* @__PURE__ */ __name((Variable) => {
          return Entries.get(Variable);
        }, "get"),
        forEach: /* @__PURE__ */ __name((Callback, _ThisArg) => {
          for (const [Key, Value] of Entries) {
            try {
              Callback(Key, Value, Collection);
            } catch {
            }
          }
        }, "forEach"),
        delete: /* @__PURE__ */ __name((Variable) => {
          Entries.delete(Variable);
          Forward("delete", { variable: Variable });
        }, "delete"),
        clear: /* @__PURE__ */ __name(() => {
          Entries.clear();
          Forward("clear", {});
        }, "clear"),
        // `getScoped({ workspaceFolder })` returns a scoped sub-collection.
        // Currently we don't track per-scope mutations server-side, so
        // scoped operations behave identically to the global collection.
        // Extensions that depend on strict per-folder scoping will see
        // global behaviour - acceptable degradation for v1; flag in
        // the followup if any extension is observed broken by this.
        getScoped: /* @__PURE__ */ __name((_Scope) => Collection, "getScoped"),
        [Symbol.iterator]: function* () {
          for (const Entry of Entries) yield Entry;
        }
      };
      return Collection;
    })(),
    // Real secrets - routes to Mountain's AES-256-GCM encrypted storage.
    secrets: /* @__PURE__ */ (() => {
      const ExtIdCached = ExtId;
      const Listeners = [];
      return {
        get: /* @__PURE__ */ __name(async (Key) => {
          try {
            const Result = await Context.MountainClient?.sendRequest(
              "secrets.get",
              { key: Key, extensionId: ExtIdCached }
            );
            return typeof Result === "string" ? Result : void 0;
          } catch {
            return void 0;
          }
        }, "get"),
        store: /* @__PURE__ */ __name(async (Key, Value) => {
          try {
            await Context.MountainClient?.sendRequest(
              "secrets.store",
              {
                key: Key,
                value: Value,
                extensionId: ExtIdCached
              }
            );
            for (const L of Listeners) {
              try {
                L({ key: Key });
              } catch {
              }
            }
          } catch {
          }
        }, "store"),
        delete: /* @__PURE__ */ __name(async (Key) => {
          try {
            await Context.MountainClient?.sendRequest(
              "secrets.delete",
              {
                key: Key,
                extensionId: ExtIdCached
              }
            );
            for (const L of Listeners) {
              try {
                L({ key: Key });
              } catch {
              }
            }
          } catch {
          }
        }, "delete"),
        onDidChange: /* @__PURE__ */ __name((Listener) => {
          Listeners.push(Listener);
          return {
            dispose: /* @__PURE__ */ __name(() => {
              const I = Listeners.indexOf(Listener);
              if (I !== -1) Listeners.splice(I, 1);
            }, "dispose")
          };
        }, "onDidChange")
      };
    })(),
    // Real workspace/global state backed by Mountain's storage.
    // Caches must be pre-populated by `PrimeStorageCaches` BEFORE the
    // extension's `activate()` runs (see ActivateExtension below).
    // VS Code's `ExtensionContext.workspaceState.get(key, default)`
    // is a SYNCHRONOUS API - extensions read it during activate to
    // drive control flow (Roo Code reads `taskHistory`, GitHub
    // Copilot reads `signInDismissed`, GitLens reads
    // `views.welcome.dismissed`). Without prime, the first sync
    // read returns the default, the cache fills later, and the
    // extension's UI ends up in the wrong state.
    workspaceState: /* @__PURE__ */ (() => {
      const ExtIdCached = ExtId;
      const Cache = /* @__PURE__ */ new Map();
      const State = {
        get: /* @__PURE__ */ __name((Key, DefaultValue) => {
          if (Cache.has(Key)) {
            const Cached = Cache.get(Key);
            return Cached === void 0 ? DefaultValue : Cached;
          }
          void Context.MountainClient?.sendRequest("Storage.Get", [
            `${ExtIdCached}:workspace:${Key}`
          ]).then((V) => {
            if (V !== void 0) Cache.set(Key, V);
          }).catch(() => {
          });
          return DefaultValue;
        }, "get"),
        update: /* @__PURE__ */ __name(async (Key, Value) => {
          Cache.set(Key, Value);
          await Context.MountainClient?.sendRequest("Storage.Set", [
            `${ExtIdCached}:workspace:${Key}`,
            Value
          ]).catch(() => {
          });
        }, "update"),
        keys: /* @__PURE__ */ __name(() => [...Cache.keys()], "keys"),
        // Exposed for `PrimeStorageCaches` below so the boot path
        // can bulk-load every existing key before activate runs.
        __primeCache: /* @__PURE__ */ __name((Entries) => {
          for (const [K, V] of Entries) {
            if (V !== void 0) Cache.set(K, V);
          }
        }, "__primeCache")
      };
      return State;
    })(),
    globalState: /* @__PURE__ */ (() => {
      const ExtIdCached = ExtId;
      const Cache = /* @__PURE__ */ new Map();
      const State = {
        get: /* @__PURE__ */ __name((Key, DefaultValue) => {
          if (Cache.has(Key)) {
            const Cached = Cache.get(Key);
            return Cached === void 0 ? DefaultValue : Cached;
          }
          void Context.MountainClient?.sendRequest("Storage.Get", [
            `${ExtIdCached}:global:${Key}`
          ]).then((V) => {
            if (V !== void 0) Cache.set(Key, V);
          }).catch(() => {
          });
          return DefaultValue;
        }, "get"),
        update: /* @__PURE__ */ __name(async (Key, Value) => {
          Cache.set(Key, Value);
          await Context.MountainClient?.sendRequest("Storage.Set", [
            `${ExtIdCached}:global:${Key}`,
            Value
          ]).catch(() => {
          });
        }, "update"),
        keys: /* @__PURE__ */ __name(() => [...Cache.keys()], "keys"),
        setKeysForSync: /* @__PURE__ */ __name((_Keys) => {
        }, "setKeysForSync"),
        __primeCache: /* @__PURE__ */ __name((Entries) => {
          for (const [K, V] of Entries) {
            if (V !== void 0) Cache.set(K, V);
          }
        }, "__primeCache")
      };
      return State;
    })(),
    extensionMode: 1,
    extension: {
      id: ExtId,
      // Use the SAME `MakeUri()` helper as `context.extensionUri`
      // above. Plain-object URI stubs without `.with()` / `.toString()`
      // crash any extension that does:
      //   const scriptUri = context.extension.extensionUri.with({
      //       path: '/dist/extension.js'
      //   })
      // which is the standard pattern for resolving bundled assets
      // (Roo Code, Continue, Claude, every webview-based extension
      // does this on activate or first command invocation).
      extensionUri: MakeUri(ExtensionPath),
      extensionPath: ExtensionPath,
      isActive: true,
      packageJSON: FullPackageJSON,
      // 1 = UI, 2 = Workspace. Most desktop extensions ship as UI
      // kind so `vscode.extensions.getExtension(id).extensionKind`
      // returns the right value when extensions branch on it.
      extensionKind: 1,
      // `exports` is mutated by the host after `activate()` resolves
      // (see VS Code's `ExtensionHostManager`); set to `undefined`
      // now and the activation post-processing updates it once the
      // extension's `activate` function returns a value.
      exports: void 0,
      // Real `Extension.activate()` returns a Promise<T> that
      // resolves once the extension's main module has been loaded
      // and its `activate()` has been called. Code that checks
      // `extension.isActive` and then calls `extension.activate()`
      // (vscode-languageclient does this when re-launching a
      // language server after a config change) must observe the
      // promise settling. We're already active by construction at
      // the point this descriptor is built, so resolve immediately
      // with the current `exports` value.
      activate: /* @__PURE__ */ __name(async () => {
        return void 0;
      }, "activate")
    },
    languageModelAccessInformation: {
      canSendRequest: /* @__PURE__ */ __name((_Model) => false, "canSendRequest"),
      onDidChange: /* @__PURE__ */ __name((_Listener) => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChange")
    }
  };
}, "CreateExtensionContext");
var ActivateExtension = /* @__PURE__ */ __name(async (Context, ExtensionId, ActivationEvent) => {
  if (Context.ActivatedExtensions.has(ExtensionId)) return;
  Context.ActivatedExtensions.add(ExtensionId);
  const StartMs = Date.now();
  CocoonDevLog(
    "ext-activate",
    `[ExtActivate] start ext=${ExtensionId} event=${ActivationEvent}`
  );
  const Extension = Context.ExtensionRegistry.get(ExtensionId);
  if (!Extension) {
    CocoonDevLog(
      "ext-activate",
      `[ExtActivate] skip-missing ext=${ExtensionId} (not in registry)`
    );
    return;
  }
  const LocationRaw = Extension?.ExtensionLocation ?? Extension?.extensionLocation ?? Extension?.location?.path ?? Extension?.location;
  const MainFile = Extension?.main ?? Extension?.Main;
  if (!LocationRaw || !MainFile) {
    return;
  }
  let ExtensionPath;
  try {
    ExtensionPath = new URL(String(LocationRaw)).pathname.replace(
      /\/$/,
      ""
    );
  } catch {
    ExtensionPath = String(LocationRaw).replace(/^file:\/\//, "").replace(/\/$/, "");
  }
  const ModulePath = `${ExtensionPath}/${MainFile}`;
  try {
    const { access } = await import("node:fs/promises");
    let Exists = false;
    let Resolved = ModulePath;
    for (const Candidate of [ModulePath, `${ModulePath}.js`]) {
      try {
        await access(Candidate);
        Exists = true;
        Resolved = Candidate;
        break;
      } catch {
      }
    }
    if (!Exists) {
      process.stdout.write(
        `[LandFix:Preflight] Skipping ${ExtensionId}: main file not found on disk (${ModulePath})
`
      );
      return;
    }
    if (process.env["Trace"]?.includes("preflight")) {
      process.stdout.write(
        `[LandFix:Preflight] ${ExtensionId}: resolved to ${Resolved}
`
      );
    }
  } catch (Err) {
    process.stdout.write(
      `[LandFix:Preflight] preflight disabled for ${ExtensionId}: ${Err instanceof Error ? Err.message : String(Err)}
`
    );
  }
  const ModuleType = Extension?.type ?? Extension?.Type;
  const IsESM = ModuleType === "module" || /\.mjs$/i.test(MainFile) || /\.mts$/i.test(MainFile);
  CocoonDevLog(
    "ext-activate",
    `[ExtensionHostHandler] Loading ${ExtensionId} (${IsESM ? "ESM" : "CJS"}) from ${ModulePath}`
  );
  try {
    const Manifest = await (async () => {
      try {
        const { readFile } = await import("node:fs/promises");
        const Raw2 = await readFile(
          `${ExtensionPath}/package.json`,
          "utf8"
        );
        return JSON.parse(Raw2);
      } catch {
        return Extension;
      }
    })();
    const ConfigState = globalThis.__cocoonConfigState;
    ConfigState?.PrePopulateFromManifest(Manifest);
  } catch {
  }
  try {
    let ExtModule;
    if (IsESM) {
      const ImportURL = ModulePath.startsWith("/") ? `file://${ModulePath}` : ModulePath;
      ExtModule = await import(ImportURL);
    } else {
      const { createRequire } = await import("module");
      const Require = createRequire(import.meta.url);
      try {
        ExtModule = Require(ModulePath);
      } catch (RequireErr) {
        const Msg = RequireErr instanceof Error ? RequireErr.message : String(RequireErr);
        if (/ERR_REQUIRE_ESM|Cannot use import statement/i.test(Msg)) {
          const ImportURL = ModulePath.startsWith("/") ? `file://${ModulePath}` : ModulePath;
          ExtModule = await import(ImportURL);
        } else {
          throw RequireErr;
        }
      }
    }
    const ActivateFn = typeof ExtModule?.activate === "function" ? ExtModule.activate : typeof ExtModule?.default?.activate === "function" ? ExtModule.default.activate : void 0;
    if (typeof ActivateFn === "function") {
      const ExtContext = CreateExtensionContext(
        Context,
        Extension,
        ExtensionPath
      );
      try {
        const PrimeStart = Date.now();
        const AllRaw = await Context.MountainClient?.sendRequest(
          "storage:getItems",
          {}
        );
        const AllArray = Array.isArray(AllRaw) ? AllRaw : [];
        const WorkspacePrefix = `${ExtensionId}:workspace:`;
        const GlobalPrefix = `${ExtensionId}:global:`;
        const WorkspaceEntries = [];
        const GlobalEntries = [];
        for (const Pair of AllArray) {
          if (!Array.isArray(Pair) || Pair.length < 2) continue;
          const RawKey = String(Pair[0] ?? "");
          const RawValue = Pair[1];
          let Value = RawValue;
          if (typeof RawValue === "string") {
            try {
              Value = JSON.parse(RawValue);
            } catch {
            }
          }
          if (RawKey.startsWith(WorkspacePrefix)) {
            WorkspaceEntries.push([
              RawKey.slice(WorkspacePrefix.length),
              Value
            ]);
          } else if (RawKey.startsWith(GlobalPrefix)) {
            GlobalEntries.push([
              RawKey.slice(GlobalPrefix.length),
              Value
            ]);
          }
        }
        const WorkspaceState = ExtContext?.workspaceState;
        const GlobalState = ExtContext?.globalState;
        WorkspaceState?.__primeCache?.(WorkspaceEntries);
        GlobalState?.__primeCache?.(GlobalEntries);
        if (process.env["Trace"]?.includes("ext-prime")) {
          process.stdout.write(
            `[LandFix:StoragePrime] ${ExtensionId} workspace=${WorkspaceEntries.length} global=${GlobalEntries.length} elapsed=${Date.now() - PrimeStart}ms
`
          );
        }
      } catch (PrimeErr) {
        if (process.env["Trace"]?.includes("ext-prime")) {
          process.stdout.write(
            `[LandFix:StoragePrime] ${ExtensionId} prime failed: ${PrimeErr instanceof Error ? PrimeErr.message : String(PrimeErr)}
`
          );
        }
      }
      const InstrumentedExtensions = [
        "vscode.git",
        "vscode.git-base",
        "vscode.npm",
        "vscode.gulp",
        "vscode.grunt",
        "vscode.jake",
        "vscode.merge-conflict"
      ];
      const SnapshotInitState = /* @__PURE__ */ __name((Phase) => {
        try {
          const InitWorkspace = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
          const InitFolders = Array.isArray(InitWorkspace.folders) ? InitWorkspace.folders : [];
          const FolderShape = InitFolders.map((F, I) => {
            const UriField = F?.uri;
            const UriShape = typeof UriField === "string" ? `string("${UriField.slice(0, 80)}")` : typeof UriField === "object" && UriField !== null ? `object(scheme=${UriField.scheme ?? "<missing>"} fsPath=${typeof UriField.fsPath === "string" ? UriField.fsPath.slice(0, 80) : "<not-a-string>"})` : typeof UriField;
            return `[${I}] name=${F?.name ?? "?"} uri=${UriShape}`;
          }).join(" | ");
          const ConfigState = globalThis.__cocoonConfigState;
          const AutoDetect = ConfigState?.ConfigCache?.get?.(
            "git.autoRepositoryDetection"
          );
          const Enabled = ConfigState?.ConfigCache?.get?.("git.enabled");
          const AutoDetectShape = `${typeof AutoDetect}=${typeof AutoDetect === "object" ? JSON.stringify(AutoDetect).slice(0, 80) : String(AutoDetect)}`;
          CocoonDevLog(
            "ext-preactivate",
            `[ExtensionHostHandler] ${Phase} ${ExtensionId} folders.length=${InitFolders.length} | git.enabled=${Enabled} | git.autoRepositoryDetection=${AutoDetectShape} | ${FolderShape}`
          );
        } catch (Err) {
          CocoonDevLog(
            "ext-preactivate",
            `[ExtensionHostHandler] ${Phase} ${ExtensionId} snapshot failed: ${Err?.message ?? String(Err)}`
          );
        }
      }, "SnapshotInitState");
      if (InstrumentedExtensions.includes(ExtensionId)) {
        SnapshotInitState("PRE-ACTIVATE");
      }
      const ExtActivateResult = await ActivateFn(ExtContext);
      const RegEntry = Context.ExtensionRegistry.get(ExtensionId);
      if (RegEntry && ExtActivateResult !== void 0) {
        RegEntry.__exports = ExtActivateResult;
        RegEntry.exports = ExtActivateResult;
      }
      if (ExtActivateResult !== void 0 && ExtContext) {
        try {
          ExtContext.extension.exports = ExtActivateResult;
        } catch {
        }
      }
      process.stdout.write(
        `[ExtensionHostHandler] ${ExtensionId} activated (event: ${ActivationEvent})
`
      );
      if (InstrumentedExtensions.includes(ExtensionId)) {
        SnapshotInitState("POST-ACTIVATE");
        setTimeout(() => SnapshotInitState("DEFERRED-1S"), 1e3);
      }
      CocoonDevLog(
        "ext-activate",
        `[ExtActivate] ok ext=${ExtensionId} duration_ms=${Date.now() - StartMs}`
      );
    } else {
      CocoonDevLog(
        "ext-activate",
        `[ExtensionHostHandler] ${ExtensionId} loaded but no activate() function found`
      );
      CocoonDevLog(
        "ext-activate",
        `[ExtActivate] no-activate-fn ext=${ExtensionId} duration_ms=${Date.now() - StartMs}`
      );
    }
  } catch (Err) {
    Context.ActivatedExtensions.delete(ExtensionId);
    const Message = Err instanceof Error ? Err.message : String(Err);
    CocoonDevLog(
      "ext-activate",
      `[ExtActivate] fail ext=${ExtensionId} duration_ms=${Date.now() - StartMs} error=${Message.replace(/\n/g, " | ")}`
    );
    throw Err;
  }
}, "ActivateExtension");
var ActivateExtension_default = ActivateExtension;
export {
  ActivateExtension_default as default
};
//# sourceMappingURL=ActivateExtension.js.map
