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
    environmentVariableCollection: {
      persistent: false,
      description: void 0,
      replace: /* @__PURE__ */ __name(() => {
      }, "replace"),
      append: /* @__PURE__ */ __name(() => {
      }, "append"),
      prepend: /* @__PURE__ */ __name(() => {
      }, "prepend"),
      get: /* @__PURE__ */ __name(() => void 0, "get"),
      forEach: /* @__PURE__ */ __name(() => {
      }, "forEach"),
      delete: /* @__PURE__ */ __name(() => {
      }, "delete"),
      clear: /* @__PURE__ */ __name(() => {
      }, "clear"),
      getScoped: /* @__PURE__ */ __name(() => ({
        persistent: false,
        description: void 0,
        replace: /* @__PURE__ */ __name(() => {
        }, "replace"),
        append: /* @__PURE__ */ __name(() => {
        }, "append"),
        prepend: /* @__PURE__ */ __name(() => {
        }, "prepend"),
        get: /* @__PURE__ */ __name(() => void 0, "get"),
        forEach: /* @__PURE__ */ __name(() => {
        }, "forEach"),
        delete: /* @__PURE__ */ __name(() => {
        }, "delete"),
        clear: /* @__PURE__ */ __name(() => {
        }, "clear"),
        getScoped: /* @__PURE__ */ __name(() => ({}), "getScoped"),
        [Symbol.iterator]: function* () {
        }
      }), "getScoped"),
      [Symbol.iterator]: function* () {
      }
    },
    secrets: {
      get: /* @__PURE__ */ __name(async (_Key) => void 0, "get"),
      store: /* @__PURE__ */ __name(async (_Key, _Value) => {
      }, "store"),
      delete: /* @__PURE__ */ __name(async (_Key) => {
      }, "delete"),
      onDidChange: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChange")
    },
    workspaceState: {
      get: /* @__PURE__ */ __name((_Key, _DefaultValue) => void 0, "get"),
      update: /* @__PURE__ */ __name(async (_Key, _Value) => {
      }, "update"),
      keys: /* @__PURE__ */ __name(() => [], "keys")
    },
    globalState: {
      get: /* @__PURE__ */ __name((_Key, _DefaultValue) => void 0, "get"),
      update: /* @__PURE__ */ __name(async (_Key, _Value) => {
      }, "update"),
      keys: /* @__PURE__ */ __name(() => [], "keys"),
      setKeysForSync: /* @__PURE__ */ __name((_Keys) => {
      }, "setKeysForSync")
    },
    extensionMode: 1,
    extension: {
      id: ExtId,
      extensionUri: {
        scheme: "file",
        path: ExtensionPath,
        fsPath: ExtensionPath
      },
      extensionPath: ExtensionPath,
      isActive: true,
      packageJSON: FullPackageJSON,
      extensionKind: 1,
      exports: void 0,
      activate: /* @__PURE__ */ __name(async () => {
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
