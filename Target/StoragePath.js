var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as Path from "node:path";
import { Uri } from "vscode";
import { FileSystemService } from "./FileSystem.js";
import { InitDataService } from "./InitData.js";
import { LoggerService } from "./Logger.js";
const EnsureDirectory = /* @__PURE__ */ __name((DirectoryUri, ScopeName) => Effect.if(DirectoryUri !== void 0, {
  onTrue: /* @__PURE__ */ __name(() => Effect.gen(function* () {
    const TheUri = DirectoryUri;
    const FileSystem2 = yield* FileSystemService;
    const Logger2 = yield* LoggerService;
    yield* Effect.tryPromise(
      () => FileSystem2.createDirectory(TheUri)
    ).pipe(
      Effect.catchAll(
        (Error2) => Logger2.Error(
          `Failed to ensure ${ScopeName} storage directory exists at ${TheUri.toString()}`,
          Error2
        )
      )
    );
    yield* Logger2.Trace(
      `${ScopeName} storage directory ensured at: ${TheUri.fsPath}`
    );
    return true;
  }), "onTrue"),
  onFalse: /* @__PURE__ */ __name(() => Effect.flatMap(
    LoggerService,
    (Log) => Log.Trace(
      `${ScopeName} storage URI is not defined; skipping creation.`
    )
  ).pipe(Effect.as(false)), "onFalse")
}), "EnsureDirectory");
class StoragePathService extends Effect.Service()(
  "Service/StoragePath",
  {
    effect: Effect.gen(function* () {
      const InitData = yield* InitDataService;
      const Logger2 = yield* LoggerService;
      const GlobalStorageUri = InitData.environment.globalStorageHome;
      const WorkSpaceStorageUri = InitData.environment.workspaceStorageHome;
      yield* EnsureDirectory(GlobalStorageUri, "Global");
      yield* EnsureDirectory(WorkSpaceStorageUri, "WorkSpace");
      const GetPathForExtension = /* @__PURE__ */ __name((BaseUri, Extension) => {
        if (!BaseUri || !Extension?.identifier?.value) return void 0;
        const ExtensionSubdirectory = Extension.identifier.value.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
        return Uri.joinPath(BaseUri, ExtensionSubdirectory);
      }, "GetPathForExtension");
      return {
        GetWorkSpaceStorageUri: /* @__PURE__ */ __name((Extension) => GetPathForExtension(WorkSpaceStorageUri, Extension), "GetWorkSpaceStorageUri"),
        GetGlobalStorageUri: /* @__PURE__ */ __name((Extension) => {
          const UriResult = GetPathForExtension(
            GlobalStorageUri,
            Extension
          );
          if (!UriResult) {
            const EmergencyPath = Path.join(
              process.cwd(),
              ".cocoon-data/global",
              Extension.identifier.value.toLowerCase()
            );
            Effect.runSync(
              Logger2.Error(
                `FATAL: Could not resolve global storage path for ${Extension.identifier.value}. Falling back to ${EmergencyPath}`
              )
            );
            return Uri.file(EmergencyPath);
          }
          return UriResult;
        }, "GetGlobalStorageUri")
      };
    })
  }
) {
  static {
    __name(this, "StoragePathService");
  }
}
export {
  StoragePathService
};
//# sourceMappingURL=StoragePath.js.map
