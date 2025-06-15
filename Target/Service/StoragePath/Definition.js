var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import { Effect } from "effect";
import { Uri } from "vscode";
import InitDataService from "../InitData/Service.js";
import LogService from "../Log/Service.js";
import EnsureDirectory from "./Support/EnsureDirectory.js";
var Definition_default = Effect.gen(function* () {
  const InitData = yield* InitDataService;
  const Log = yield* LogService;
  const GlobalStorageURI = InitData.environment.globalStorageHome;
  const WorkSpaceStorageURI = InitData.environment.workspaceStorageHome;
  yield* EnsureDirectory(GlobalStorageURI, "Global");
  yield* EnsureDirectory(WorkSpaceStorageURI, "WorkSpace");
  const GetPathForExtension = /* @__PURE__ */ __name((BaseURI, Extension) => {
    if (!BaseURI || !Extension?.identifier?.value) {
      return void 0;
    }
    const ExtensionSubdirectory = Extension.identifier.value.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
    return Uri.joinPath(BaseURI, ExtensionSubdirectory);
  }, "GetPathForExtension");
  const StoragePathImplementation = {
    GetWorkSpaceStorageURI: /* @__PURE__ */ __name((Extension) => GetPathForExtension(WorkSpaceStorageURI, Extension), "GetWorkSpaceStorageURI"),
    GetGlobalStorageURI: /* @__PURE__ */ __name((Extension) => {
      const URI = GetPathForExtension(GlobalStorageURI, Extension);
      if (!URI) {
        const EmergencyPath = Path.join(
          process.cwd(),
          ".cocoon-data/global",
          Extension.identifier.value.toLowerCase()
        );
        Effect.runSync(
          Log.Error(
            `FATAL: Could not resolve global storage path for ${Extension.identifier.value}. Falling back to ${EmergencyPath}`
          )
        );
        return Uri.file(EmergencyPath);
      }
      return URI;
    }, "GetGlobalStorageURI")
  };
  return StoragePathImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
